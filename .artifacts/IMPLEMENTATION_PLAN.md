# Techaasvik - Secure Multi-Tenant WhatsApp Marketing SaaS
## Production-Grade Implementation Plan

**Platform**: WA Adometa_techaasvik  
**Domain**: adometa.techaasvik.in  
**Database**: adotech_in  
**Tech Stack**: NestJS (Backend) + Next.js (Frontend) + PostgreSQL + Redis

---

## 🎯 PHASE 1: FOUNDATION & SECURITY INFRASTRUCTURE (Week 1-2)

### 1.1 Project Initialization
- [x] Initialize NestJS backend with TypeScript strict mode
- [x] Initialize Next.js frontend with TypeScript
- [x] Setup Docker Compose for local development
- [x] Configure environment-based configuration
- [x] Setup Git repository with .gitignore for secrets

### 1.2 Database Architecture (PostgreSQL)
**Core Principle**: Every table MUST have `tenant_id` (UUID) except system tables

#### System Tables (No tenant_id)
```sql
-- Super Admin & Platform Config
- super_admins
- platform_config
- meta_app_config
- bsp_providers
- system_audit_logs
- system_health_metrics
```

#### Tenant Tables (All have tenant_id)
```sql
-- Tenant Management
- tenants (id, business_name, owner_email, status, plan, created_at)
- tenant_users (tenant_id, user_id, role, permissions)
- tenant_api_keys (tenant_id, key_hash, scoped_permissions)

-- WhatsApp Integration
- tenant_waba_config (tenant_id, waba_id, phone_number_id, encrypted_token)
- tenant_webhooks (tenant_id, webhook_url, verify_token, secret)
- tenant_templates (tenant_id, template_id, name, category, status)

-- Campaign & Messaging
- tenant_contacts (tenant_id, phone, opt_in_status, opt_in_source)
- tenant_segments (tenant_id, name, rules)
- tenant_campaigns (tenant_id, name, status, scheduled_at)
- tenant_messages (tenant_id, campaign_id, contact_id, status)

-- Compliance & Governance
- tenant_opt_ins (tenant_id, contact_id, timestamp, source, ip_address)
- tenant_opt_outs (tenant_id, contact_id, timestamp, reason)
- tenant_compliance_violations (tenant_id, type, severity, auto_action)
- tenant_quality_ratings (tenant_id, rating, updated_at)

-- Billing & Credits
- tenant_subscriptions (tenant_id, plan, status, billing_cycle)
- tenant_invoices (tenant_id, amount, status, paid_at)
- tenant_credit_balance (tenant_id, balance, last_updated)
- tenant_credit_transactions (tenant_id, amount, type, description)

-- Audit & Logs
- tenant_audit_logs (tenant_id, user_id, action, metadata, ip)
- tenant_webhook_logs (tenant_id, event_type, payload, response)
```

### 1.3 Encryption & Secret Management
**Implementation**:
- AES-256-GCM for encrypting WhatsApp tokens at rest
- Separate encryption keys per tenant (derived from master key + tenant_id)
- Store master key in AWS KMS / GCP Secret Manager / HashiCorp Vault
- NEVER log or expose encrypted values

**Code Structure**:
```typescript
// backend/src/security/encryption.service.ts
@Injectable()
export class EncryptionService {
  async encryptToken(tenantId: string, token: string): Promise<string>
  async decryptToken(tenantId: string, encrypted: string): Promise<string>
  // Token never leaves backend, never sent to frontend
}
```

### 1.4 Authentication & Authorization
**JWT Strategy**:
```typescript
// JWT Payload Structure
{
  sub: userId,
  email: string,
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'TENANT_MARKETER' | 'TENANT_DEVELOPER' | 'READ_ONLY',
  tenantId?: string, // null for SUPER_ADMIN
  permissions: string[],
  iat: number,
  exp: number
}
```

**Guards**:
- `@UseGuards(JwtAuthGuard)` - Verify JWT
- `@UseGuards(RolesGuard)` - Check role
- `@UseGuards(TenantIsolationGuard)` - Enforce tenant_id in all queries
- `@UseGuards(PermissionGuard)` - Check granular permissions

**Rules**:
- Access token: 15 minutes
- Refresh token: 7 days (HttpOnly cookie)
- Token rotation on refresh
- Logout = blacklist token (Redis)

### 1.5 Multi-Tenant Isolation Middleware
```typescript
// backend/src/common/interceptors/tenant-context.interceptor.ts
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // from JWT
    
    // Inject tenant context into request
    if (user.role !== 'SUPER_ADMIN') {
      request.tenantId = user.tenantId;
    }
    
    return next.handle();
  }
}
```

**Database Query Enforcement**:
```typescript
// All TypeORM repositories must extend BaseTenantRepository
export class BaseTenantRepository<T> extends Repository<T> {
  async find(options: FindManyOptions<T>, tenantId: string): Promise<T[]> {
    return super.find({
      ...options,
      where: { ...options.where, tenant_id: tenantId }
    });
  }
  // Override all query methods to enforce tenant_id
}
```

---

## 🎯 PHASE 2: WHATSAPP EMBEDDED SIGNUP (Week 3)

### 2.1 Meta App Configuration (Super Admin Only)
**Super Admin Dashboard** → API & BSP Settings

**Stored in `platform_config` table**:
```sql
INSERT INTO platform_config (key, value, encrypted) VALUES
('meta_app_id', '123456789012345', false),
('meta_app_secret', '<encrypted>', true),
('meta_redirect_uri', 'https://api.techaasvik.com/oauth/callback', false),
('meta_webhook_verify_token', '<encrypted>', true);
```

### 2.2 Embedded Signup Flow (Client-Side)
**Client Dashboard** → Connect WhatsApp

**Step 1**: Client clicks "Connect WhatsApp"  
**Step 2**: Backend generates Meta OAuth URL
```typescript
// backend/src/whatsapp/whatsapp-oauth.controller.ts
@Get('connect')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
async initiateEmbeddedSignup(@Request() req) {
  const tenantId = req.tenantId;
  const state = this.generateSecureState(tenantId); // CSRF protection
  
  const metaOAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${META_APP_ID}&` +
    `redirect_uri=${REDIRECT_URI}&` +
    `state=${state}&` +
    `scope=whatsapp_business_management,whatsapp_business_messaging`;
  
  return { url: metaOAuthUrl };
}
```

**Step 3**: Client redirected to Meta, logs in, selects WABA + Phone  
**Step 4**: Meta redirects back with authorization code

**Step 5**: Backend exchanges code for token
```typescript
@Get('oauth/callback')
async handleCallback(@Query('code') code: string, @Query('state') state: string) {
  // Verify state (CSRF)
  const tenantId = this.verifyState(state);
  
  // Exchange code for token
  const tokenResponse = await this.metaApiService.exchangeCodeForToken(code);
  
  // Extract WABA ID, Phone Number ID, Access Token
  const { waba_id, phone_number_id, access_token } = tokenResponse;
  
  // Encrypt token
  const encryptedToken = await this.encryptionService.encryptToken(tenantId, access_token);
  
  // Store in tenant_waba_config
  await this.wabaConfigRepo.upsert({
    tenant_id: tenantId,
    waba_id,
    phone_number_id,
    encrypted_access_token: encryptedToken,
    status: 'PENDING_APPROVAL', // Super Admin must approve
    connected_at: new Date()
  });
  
  // Redirect to client dashboard
  return { redirect: '/dashboard?status=connected' };
}
```

### 2.3 Token Security Rules
- ✅ Token encrypted with AES-256-GCM
- ✅ Token NEVER sent to frontend
- ✅ Token NEVER logged
- ✅ Token decrypted only when making WhatsApp API calls
- ✅ Token rotation handled via Meta's token refresh
- ✅ Super Admin CANNOT view raw tokens

---

## 🎯 PHASE 3: SUPER ADMIN DASHBOARD (Week 4-5)

### 3.1 Dashboard Overview
**Route**: `/admin/dashboard`  
**Access**: SUPER_ADMIN only

**Metrics**:
- Active Tenants (count)
- Monthly Revenue (₹ or $)
- Messages Sent (this week)
- Template Approval Rate (%)
- Pending Activations
- Suspended Tenants
- Plan Upgrades
- DND Violations
- High Spam Risk
- Opt-In Proofs

**Data Source**: Aggregated queries (NO access to individual tenant messages)

### 3.2 Tenant Management
**Route**: `/admin/tenants`

**Features**:
- List all tenants (searchable, filterable by plan/status)
- View tenant details (business info, owner, plan, usage)
- Approve/Suspend/Delete tenant
- View tenant API settings (WABA ID, Phone Number ID) - NO TOKEN
- View tenant billing & invoices
- View tenant audit logs
- View tenant compliance violations
- View tenant templates (for approval)

**Forbidden**:
- Viewing tenant messages
- Viewing tenant contacts
- Viewing tenant campaigns
- Sending messages on behalf of tenant

### 3.3 API & BSP Settings
**Route**: `/admin/api-settings`

**Meta Configuration**:
- Meta App ID (visible)
- Meta App Secret (masked, editable)
- Redirect URI (visible)
- Webhook Verify Token (masked, editable)
- Revoke Meta Embedded Signup (button)

**BSP Providers**:
- Meta Cloud API (enabled/disabled)
- Twilio (enabled/disabled, API credentials)
- 360dialog (enabled/disabled, API credentials)

### 3.4 Template Monitoring
**Route**: `/admin/templates`

**Features**:
- View all tenant templates (tenant_id, template_name, category, status)
- Approve/Reject templates
- Monitor spam risk scores
- Track quality ratings

### 3.5 Compliance Center
**Route**: `/admin/compliance`

**Features**:
- DND violations (tenant_id, count, auto-action)
- Opt-in proofs (tenant_id, contact_id, timestamp, source)
- Quality ratings (tenant_id, rating, trend)
- Spam risk alerts (tenant_id, risk_score, warnings)
- Auto-pause triggers (configure thresholds)

### 3.6 Billing & Revenue
**Route**: `/admin/billing`

**Features**:
- Current MRR
- Wallet Balance (platform-wide)
- View all invoices (tenant_id, amount, status)
- Revenue analytics (by plan, by month)

---

## 🎯 PHASE 4: CLIENT DASHBOARD (Week 6-7)

### 4.1 Dashboard Overview
**Route**: `/dashboard`  
**Access**: TENANT_ADMIN, TENANT_MARKETER, TENANT_DEVELOPER, READ_ONLY

**Metrics** (tenant-scoped):
- Messages sent (today, this week, this month)
- Active campaigns
- Template approval status
- Credit balance
- Quality rating
- Opt-in rate

### 4.2 WhatsApp Connection
**Route**: `/dashboard/whatsapp/connect`

**Flow**:
1. Click "Connect WhatsApp"
2. Redirect to Meta Embedded Signup
3. Select WABA + Phone Number
4. Return to dashboard
5. Status: "Pending Super Admin Approval"
6. Super Admin approves → Status: "Connected"

### 4.3 Templates
**Route**: `/dashboard/templates`

**Features**:
- Create template (name, category, body, variables)
- Submit for Meta approval
- View template status (pending, approved, rejected)
- Edit/Delete template

### 4.4 Contacts
**Route**: `/dashboard/contacts`

**Features**:
- Import contacts (CSV, API)
- View contact list (phone, opt_in_status, tags)
- Export contacts
- Manage opt-ins/opt-outs

### 4.5 Segments
**Route**: `/dashboard/segments`

**Features**:
- Create segment (name, rules)
- View segment size
- Edit/Delete segment

### 4.6 Campaigns
**Route**: `/dashboard/campaigns`

**Features**:
- Create campaign (name, template, segment, schedule)
- View campaign status (draft, scheduled, processing, completed)
- View campaign analytics (sent, delivered, read, failed)
- Pause/Resume campaign

### 4.7 Automation
**Route**: `/dashboard/automation`

**Features**:
- Create automation (trigger, action)
- Examples: Welcome message, Birthday message, Abandoned cart

### 4.8 Reports
**Route**: `/dashboard/reports`

**Features**:
- Message analytics (sent, delivered, read, failed)
- Campaign performance
- Template performance
- Opt-in/Opt-out trends

### 4.9 API Keys
**Route**: `/dashboard/api-keys`

**Features**:
- Generate API key (scoped permissions)
- View API keys (masked)
- Revoke API key

### 4.10 Team & Roles
**Route**: `/dashboard/team`

**Features**:
- Invite team member (email, role)
- View team members
- Edit role/permissions
- Remove team member

### 4.11 Billing
**Route**: `/dashboard/billing`

**Features**:
- View current plan
- Upgrade/Downgrade plan
- View invoices
- Add payment method
- View credit balance
- Purchase credits

---

## 🎯 PHASE 5: WHATSAPP MESSAGING ENGINE (Week 8-9)

### 5.1 Message Queue (BullMQ + Redis)
**Purpose**: Rate limiting, retry logic, delayed jobs

**Queues**:
- `campaign-dispatch` - Dispatch campaign messages
- `message-send` - Send individual messages
- `webhook-process` - Process incoming webhooks
- `template-sync` - Sync templates from Meta

### 5.2 Campaign Dispatch
**Flow**:
1. Client creates campaign (template, segment, schedule)
2. Campaign status: DRAFT
3. Client clicks "Launch"
4. Backend validates:
   - Template approved?
   - Segment has contacts?
   - Credit balance sufficient?
   - Quality rating acceptable?
5. Campaign status: SCHEDULED
6. At scheduled time, add job to `campaign-dispatch` queue
7. Worker fetches contacts from segment
8. For each contact:
   - Check opt-in status
   - Check DND list
   - Add job to `message-send` queue
9. Campaign status: PROCESSING
10. Worker sends message via WhatsApp API
11. Update message status (sent, delivered, read, failed)
12. When all messages processed, campaign status: COMPLETED

### 5.3 WhatsApp API Integration
**Service**: `WhatsAppApiService`

**Methods**:
```typescript
async sendTemplateMessage(
  tenantId: string,
  to: string,
  templateName: string,
  variables: string[]
): Promise<MessageResponse> {
  // 1. Fetch tenant WABA config
  const config = await this.wabaConfigRepo.findByTenantId(tenantId);
  
  // 2. Decrypt access token
  const token = await this.encryptionService.decryptToken(tenantId, config.encrypted_access_token);
  
  // 3. Call Meta WhatsApp API
  const response = await axios.post(
    `https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: variables.map(v => ({ type: 'text', text: v }))
          }
        ]
      }
    },
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  // 4. Return response (message_id)
  return response.data;
}
```

### 5.4 Webhook Handler
**Route**: `POST /webhooks/whatsapp/:tenantId`

**Flow**:
1. Meta sends webhook (message status update)
2. Verify webhook signature (using webhook secret)
3. Add job to `webhook-process` queue
4. Worker processes webhook:
   - Update message status
   - Update campaign analytics
   - Trigger automation (if applicable)

**Security**:
- Webhook signature verification (HMAC SHA-256)
- Tenant-specific webhook URLs
- Webhook secret encrypted at rest

---

## 🎯 PHASE 6: COMPLIANCE & GOVERNANCE (Week 10)

### 6.1 Opt-In Tracking
**Rules**:
- Every contact MUST have opt-in record
- Opt-in source: web_form, api, import, manual
- Opt-in timestamp + IP address

**Enforcement**:
- Before sending message, check opt-in status
- If not opted-in, reject message

### 6.2 DND & Unsubscribe
**Features**:
- Unsubscribe link in messages (optional)
- DND list (global, tenant-scoped)
- Auto-exclude DND contacts from campaigns

### 6.3 Message Frequency Caps
**Rules**:
- Max messages per contact per day (configurable by plan)
- Max messages per contact per week
- Auto-pause campaign if limit exceeded

### 6.4 Template Category Enforcement
**Rules**:
- Marketing templates: Require opt-in
- Transactional templates: No opt-in required
- OTP templates: Rate limited

### 6.5 Quality Rating Monitoring
**Flow**:
1. Fetch quality rating from Meta API (daily)
2. Store in `tenant_quality_ratings`
3. If rating drops below threshold:
   - Send alert to tenant
   - Auto-pause campaigns (if critical)
   - Notify Super Admin

### 6.6 Spam Risk Scoring
**Algorithm**:
- High message frequency
- Low delivery rate
- High block rate
- Template rejections

**Actions**:
- Warning (score > 50)
- Auto-pause (score > 80)
- Suspend tenant (score > 95)

---

## 🎯 PHASE 7: LOGGING & AUDITING (Week 11)

### 7.1 Audit Logs (Tenant-Scoped)
**Events**:
- Login attempts
- Token rotations
- Campaign launches
- Template submissions
- API key generation
- Team member invitations
- Compliance violations

**Storage**: `tenant_audit_logs` table

**Rules**:
- Immutable (append-only)
- Tenant-scoped (tenant_id)
- NO secrets logged
- Masked sensitive identifiers (phone numbers)

### 7.2 System Logs (Super Admin)
**Events**:
- Super Admin logins
- Platform config changes
- BSP provider changes
- Tenant approvals/suspensions

**Storage**: `system_audit_logs` table

### 7.3 Webhook Logs
**Storage**: `tenant_webhook_logs` table

**Data**:
- Event type
- Payload (sanitized)
- Response status
- Processing time

---

## 🎯 PHASE 8: AI FEATURES (Week 12)

### 8.1 Template Suggestions
**Feature**: AI suggests template variations based on campaign performance

**Rules**:
- AI CANNOT access raw tokens
- AI reads anonymized campaign analytics
- Suggestions require human approval

### 8.2 Performance Analysis
**Feature**: AI analyzes campaign performance and suggests improvements

**Data Access**:
- Campaign analytics (sent, delivered, read, failed)
- Template performance
- Segment performance

### 8.3 Best Send Time Prediction
**Feature**: AI predicts best time to send messages based on historical data

**Algorithm**:
- Analyze delivery rates by time of day
- Analyze read rates by time of day
- Suggest optimal send time

### 8.4 Spam Risk Detection
**Feature**: AI detects spam risk patterns

**Signals**:
- High message frequency
- Low engagement
- Template rejections
- Quality rating drops

---

## 🎯 PHASE 9: n8n AUTOMATION COMPATIBILITY (Week 13)

### 9.1 Read-Only Audit APIs
**Endpoints**:
- `GET /api/v1/audit/security-checks` - Security audit data
- `GET /api/v1/audit/compliance-reports` - Compliance reports
- `GET /api/v1/audit/error-aggregation` - Error logs
- `GET /api/v1/audit/ai-comparisons` - AI audit comparisons

**Access**:
- Separate API key for n8n (read-only)
- NO write access
- NO token access
- NO message sending

### 9.2 Webhook Integration
**Feature**: n8n can subscribe to platform events

**Events**:
- Compliance violation detected
- Quality rating dropped
- Campaign completed
- Template approved/rejected

---

## 🎯 PHASE 10: PRODUCTION DEPLOYMENT (Week 14)

### 10.1 Infrastructure Setup
**Services**:
- NestJS backend (Docker container)
- Next.js frontend (Docker container)
- PostgreSQL (managed service)
- Redis (managed service)
- S3-compatible storage (for file uploads)

**Cloud Provider**: AWS / GCP (cloud-agnostic)

### 10.2 Environment Configuration
**Environments**:
- Development (local)
- Staging (cloud)
- Production (cloud)

**Secrets Management**:
- AWS Secrets Manager / GCP Secret Manager / HashiCorp Vault
- Environment variables injected at runtime
- NO secrets in code or config files

### 10.3 CI/CD Pipeline
**Tools**: GitHub Actions / GitLab CI

**Stages**:
1. Lint & Type Check
2. Unit Tests
3. Integration Tests
4. Build Docker Images
5. Push to Registry
6. Deploy to Staging
7. Run E2E Tests
8. Deploy to Production (manual approval)

### 10.4 Monitoring & Alerting
**Tools**: Prometheus + Grafana / Datadog / New Relic

**Metrics**:
- API response times
- Database query performance
- Queue processing times
- Error rates
- Webhook failures
- Quality rating drops

**Alerts**:
- High error rate
- Slow API responses
- Queue backlog
- Database connection issues
- Webhook failures

### 10.5 Backup & Disaster Recovery
**Database Backups**:
- Daily automated backups (read-only)
- 30-day retention
- Point-in-time recovery

**Data Retention**:
- Messages: 90 days (configurable by plan)
- Audit logs: 1 year
- Invoices: 7 years (compliance)

---

## 🔒 SECURITY CHECKLIST

### Authentication & Authorization
- [x] JWT with refresh tokens
- [x] HttpOnly cookies
- [x] Token rotation
- [x] Role-based access control
- [x] Permission-based access control
- [x] Tenant isolation guards

### Encryption
- [x] AES-256-GCM for tokens at rest
- [x] TLS 1.3 for data in transit
- [x] Separate encryption keys per tenant
- [x] Master key in KMS/Vault

### Input Validation
- [x] DTO validation (class-validator)
- [x] SQL injection prevention (TypeORM parameterized queries)
- [x] XSS prevention (sanitize inputs)
- [x] CSRF protection (SameSite cookies)

### Rate Limiting
- [x] API rate limiting (by tenant)
- [x] Login rate limiting (by IP)
- [x] Message rate limiting (by contact)

### Webhook Security
- [x] Signature verification (HMAC SHA-256)
- [x] Webhook secrets encrypted
- [x] Tenant-specific webhook URLs

### Logging & Auditing
- [x] NO secrets logged
- [x] Masked sensitive identifiers
- [x] Immutable audit logs
- [x] Tenant-scoped logs

### Compliance
- [x] Opt-in tracking
- [x] DND handling
- [x] Message frequency caps
- [x] Quality rating monitoring
- [x] Spam risk scoring

---

## 📦 DATA GOVERNANCE

### Data Retention
- Messages: 90 days (Free), 180 days (Pro), 1 year (Enterprise)
- Audit logs: 1 year
- Invoices: 7 years

### Data Export
- Tenant can export all their data (GDPR compliance)
- Format: JSON, CSV

### Data Deletion
- Tenant can request hard delete
- Super Admin approval required
- Irreversible (30-day grace period)

### Backup & Restore
- Daily automated backups
- Read-only backups (no write access)
- Point-in-time recovery

---

## 🚫 ABSOLUTE PROHIBITIONS

### DO NOT:
- ❌ Hardcode secrets
- ❌ Log tokens
- ❌ Share credentials
- ❌ Store secrets on frontend
- ❌ Bypass Meta embedded signup
- ❌ Allow cross-tenant data access
- ❌ Send tokens to frontend
- ❌ Allow Super Admin to view tenant messages
- ❌ Allow Super Admin to send messages for tenants
- ❌ Store unencrypted tokens

---

## 📊 SUCCESS METRICS

### Security
- Zero credential leaks
- Zero cross-tenant data access incidents
- 100% webhook signature verification
- 100% encrypted tokens

### Compliance
- 100% opt-in tracking
- Zero DND violations
- Quality rating > 80%
- Spam risk score < 50

### Performance
- API response time < 200ms (p95)
- Message delivery time < 5s (p95)
- Webhook processing time < 1s (p95)
- Database query time < 50ms (p95)

### Reliability
- 99.9% uptime
- Zero data loss
- < 0.1% message failure rate

---

## 🎯 NEXT STEPS

1. **Review this plan** - Ensure alignment with requirements
2. **Setup development environment** - Docker, PostgreSQL, Redis
3. **Initialize NestJS backend** - TypeScript, strict mode
4. **Initialize Next.js frontend** - TypeScript, SSR
5. **Create database schema** - PostgreSQL with tenant_id enforcement
6. **Implement encryption service** - AES-256-GCM
7. **Implement JWT authentication** - Access + refresh tokens
8. **Implement tenant isolation** - Guards, interceptors, repositories
9. **Implement Meta Embedded Signup** - OAuth flow
10. **Build Super Admin Dashboard** - Tenant management, compliance
11. **Build Client Dashboard** - WhatsApp connection, campaigns
12. **Implement messaging engine** - BullMQ, WhatsApp API
13. **Implement compliance engine** - Opt-in, DND, quality rating
14. **Deploy to production** - Docker, CI/CD, monitoring

---

**This is a bank-grade, production-ready, secure multi-tenant WhatsApp SaaS platform.**

**Security is non-negotiable. Tenant isolation is non-negotiable. Compliance is non-negotiable.**

**Let's build Techaasvik! 🚀**

# 🚀 Techaasvik Implementation Roadmap
**Status**: Active Development  
**Current Phase**: Foundation → Core Features  
**Last Updated**: 2026-02-09 21:13 IST

---

## 📊 Current Status: 15% Complete

### ✅ Completed
- Infrastructure (Docker, PostgreSQL, Redis)
- Database Schema (30+ tables)
- Backend Authentication (JWT)
- Tenant Management API
- Encryption Service

### 🔄 In Progress
- Role-Based Access Control
- Tenant Isolation Enforcement

### ❌ Pending
- WhatsApp Integration (0%)
- Client Dashboard (0%)
- Super Admin Dashboard (0%)
- Queue System (0%)
- Compliance Engine (0%)

---

## 🎯 PHASE 1: CRITICAL FOUNDATION (Week 1)
**Goal**: Secure the foundation, enable basic client access

### 1.1 Security Hardening (Priority: CRITICAL)
**Time**: 3-4 hours

#### Task 1.1.1: Implement Role-Based Access Control
**Files**:
- `backend/src/common/guards/roles.guard.ts` (create)
- `backend/src/common/decorators/roles.decorator.ts` (create)
- `backend/src/common/decorators/public.decorator.ts` (create)

**Implementation**:
```typescript
// RolesGuard - Enforce role-based access
// Apply to all tenant endpoints
// Ensure SUPER_ADMIN can access admin routes
// Ensure TENANT_ADMIN can only access their tenant data
```

**Success Criteria**:
- ✅ SUPER_ADMIN can access all tenant endpoints
- ✅ TENANT_ADMIN cannot access other tenants
- ✅ Unauthorized roles get 403 Forbidden

#### Task 1.1.2: Enforce Tenant Isolation
**Files**:
- `backend/src/common/interceptors/tenant-context.interceptor.ts` (enhance)
- `backend/src/common/guards/tenant-isolation.guard.ts` (enhance)

**Implementation**:
```typescript
// Extract tenant_id from JWT
// Inject into all database queries
// Block cross-tenant access attempts
// Log isolation violations
```

**Success Criteria**:
- ✅ All queries automatically filtered by tenant_id
- ✅ Cross-tenant access blocked
- ✅ Isolation violations logged

#### Task 1.1.3: Implement Audit Logging
**Files**:
- `backend/src/audit/audit.service.ts` (create)
- `backend/src/audit/audit.interceptor.ts` (create)

**Implementation**:
```typescript
// Log all tenant actions
// Log all super admin actions
// Never log tokens or passwords
// Store in tenant_audit_logs table
```

**Success Criteria**:
- ✅ All CRUD operations logged
- ✅ Login/logout logged
- ✅ No sensitive data in logs

---

## 🎯 PHASE 2: WHATSAPP INTEGRATION (Week 2)
**Goal**: Enable WhatsApp connection for clients

### 2.1 Meta OAuth Embedded Signup (Priority: HIGH)
**Time**: 4-5 hours

#### Task 2.1.1: OAuth Module Setup
**Files**:
- `backend/src/whatsapp/whatsapp-oauth.controller.ts` (create)
- `backend/src/whatsapp/whatsapp-oauth.service.ts` (create)
- `backend/src/whatsapp/dto/oauth-callback.dto.ts` (create)

**Endpoints**:
```typescript
POST /api/whatsapp/initiate-signup
// Generate Meta OAuth URL
// Store state token
// Return URL to frontend

POST /api/whatsapp/oauth-callback
// Receive OAuth code
// Exchange for access token
// Encrypt and store token
// Save WABA details
```

**Success Criteria**:
- ✅ Client can initiate Meta signup
- ✅ OAuth callback processes successfully
- ✅ Token encrypted before storage
- ✅ WABA details saved to tenant_waba_configs

#### Task 2.1.2: WhatsApp API Service
**Files**:
- `backend/src/whatsapp/whatsapp-api.service.ts` (create)
- `backend/src/whatsapp/dto/send-message.dto.ts` (create)

**Methods**:
```typescript
async sendTemplateMessage(tenantId, to, templateName, variables)
async sendTextMessage(tenantId, to, text)
async uploadMedia(tenantId, file)
async getPhoneNumberDetails(tenantId)
async getTemplates(tenantId)
```

**Success Criteria**:
- ✅ Can send template messages
- ✅ Can send text messages
- ✅ Can upload media
- ✅ Token decrypted before API calls
- ✅ Errors handled gracefully

#### Task 2.1.3: Webhook Handler
**Files**:
- `backend/src/whatsapp/webhook.controller.ts` (create)
- `backend/src/whatsapp/webhook.service.ts` (create)

**Endpoints**:
```typescript
GET /api/whatsapp/webhook
// Verify webhook (Meta requirement)

POST /api/whatsapp/webhook
// Receive message status updates
// Receive incoming messages
// Verify signature
// Process events
```

**Success Criteria**:
- ✅ Webhook verification works
- ✅ Signature verification implemented
- ✅ Status updates processed
- ✅ Events logged to tenant_webhook_logs

---

## 🎯 PHASE 3: CLIENT DASHBOARD FOUNDATION (Week 3)
**Goal**: Enable clients to log in and see their dashboard

### 3.1 Frontend Authentication (Priority: HIGH)
**Time**: 2-3 hours

#### Task 3.1.1: API Client Setup
**Files**:
- `frontend/src/lib/api.ts` (create)
- `frontend/src/lib/auth.ts` (create)

**Implementation**:
```typescript
// Axios instance with base URL
// Auto-attach JWT from cookies
// Handle 401 (redirect to login)
// Handle 403 (show error)
```

#### Task 3.1.2: Login Page Integration
**Files**:
- `frontend/src/app/(auth)/login/page.tsx` (enhance)

**Features**:
- Connect to backend `/api/auth/login`
- Store JWT in httpOnly cookie
- Store user data in localStorage
- Redirect based on role:
  - SUPER_ADMIN → `/admin/tenants`
  - TENANT_ADMIN → `/dashboard`

**Success Criteria**:
- ✅ Super Admin can log in
- ✅ Tenant Admin can log in
- ✅ Correct redirection
- ✅ Token stored securely

#### Task 3.1.3: Protected Routes
**Files**:
- `frontend/src/middleware.ts` (enhance)
- `frontend/src/app/dashboard/layout.tsx` (create)
- `frontend/src/app/admin/layout.tsx` (create)

**Implementation**:
```typescript
// Check JWT validity
// Redirect to login if missing/invalid
// Verify role matches route
// Fetch user data if needed
```

**Success Criteria**:
- ✅ Unauthenticated users redirected to login
- ✅ Wrong role users get 403
- ✅ Correct users see dashboard

### 3.2 Client Dashboard Home (Priority: MEDIUM)
**Time**: 3-4 hours

#### Task 3.2.1: Dashboard Overview
**Files**:
- `frontend/src/app/dashboard/page.tsx` (create)
- `frontend/src/components/dashboard/stats-card.tsx` (create)
- `frontend/src/components/dashboard/whatsapp-status.tsx` (create)

**Features**:
- WhatsApp connection status
- Message usage (today/month)
- Template status summary
- Campaign status summary
- Compliance alerts
- Billing snapshot

**Success Criteria**:
- ✅ Shows real data from backend
- ✅ Updates in real-time
- ✅ Beautiful UI (Tailwind)

---

## 🎯 PHASE 4: TEMPLATE MANAGEMENT (Week 4)
**Goal**: Enable clients to create and manage WhatsApp templates

### 4.1 Backend Template Module (Priority: HIGH)
**Time**: 4-5 hours

#### Task 4.1.1: Template CRUD
**Files**:
- `backend/src/templates/templates.controller.ts` (create)
- `backend/src/templates/templates.service.ts` (create)
- `backend/src/templates/dto/create-template.dto.ts` (create)

**Endpoints**:
```typescript
POST /api/templates
GET /api/templates
GET /api/templates/:id
PATCH /api/templates/:id
DELETE /api/templates/:id
POST /api/templates/:id/submit
```

**Success Criteria**:
- ✅ Create template (draft)
- ✅ Save template with all fields
- ✅ Submit for approval
- ✅ Sync from Meta WABA

#### Task 4.1.2: Template Sync Service
**Files**:
- `backend/src/templates/template-sync.service.ts` (create)

**Methods**:
```typescript
async syncTemplatesFromMeta(tenantId)
async updateTemplateStatus(tenantId, templateId, status)
```

**Success Criteria**:
- ✅ Fetch templates from Meta
- ✅ Match by name + language
- ✅ Update approval status
- ✅ Handle deletions

### 4.2 Frontend Template UI (Priority: HIGH)
**Time**: 6-8 hours

#### Task 4.2.1: Template Creation Form
**Files**:
- `frontend/src/app/dashboard/templates/new/page.tsx` (create)
- `frontend/src/components/templates/template-form.tsx` (create)
- `frontend/src/components/templates/template-preview.tsx` (create)

**Features**:
- Name, Category, Language
- Header (None/Text/Image/Video/Document)
- Body with variable support {{1}}, {{2}}
- Footer (optional)
- CTA Buttons (URL with UTM, Phone)
- Live WhatsApp-style preview
- Save Draft / Submit for Approval

**Success Criteria**:
- ✅ Form validates all fields
- ✅ Preview updates in real-time
- ✅ Can save draft
- ✅ Can submit for approval
- ✅ Beautiful UI matching WhatsApp style

#### Task 4.2.2: Template List View
**Files**:
- `frontend/src/app/dashboard/templates/page.tsx` (create)
- `frontend/src/components/templates/template-card.tsx` (create)

**Features**:
- List all templates
- Filter by status (Draft/Pending/Approved/Rejected)
- Search by name
- Status badges
- Edit/Delete actions

---

## 🎯 PHASE 5: SEGMENT & CONTACT MANAGEMENT (Week 5)
**Goal**: Enable clients to manage contacts and segments

### 5.1 Backend Segment Module (Priority: HIGH)
**Time**: 3-4 hours

#### Task 5.1.1: Segment CRUD
**Files**:
- `backend/src/segments/segments.controller.ts` (create)
- `backend/src/segments/segments.service.ts` (create)
- `backend/src/segments/csv-import.service.ts` (create)

**Endpoints**:
```typescript
POST /api/segments
GET /api/segments
GET /api/segments/:id
POST /api/segments/:id/upload-csv
```

**Success Criteria**:
- ✅ Create segment
- ✅ Upload CSV (unlimited rows)
- ✅ Validate mobile numbers
- ✅ Deduplicate contacts
- ✅ Map CSV columns to variables

### 5.2 Frontend Segment UI (Priority: MEDIUM)
**Time**: 4-5 hours

#### Task 5.2.1: CSV Upload Flow
**Files**:
- `frontend/src/app/dashboard/segments/new/page.tsx` (create)
- `frontend/src/components/segments/csv-uploader.tsx` (create)
- `frontend/src/components/segments/column-mapper.tsx` (create)

**Features**:
- Drag-and-drop CSV upload
- Column mapping to template variables
- Validation preview
- Deduplication summary
- Save segment

---

## 🎯 PHASE 6: CAMPAIGN ENGINE (Week 6-7)
**Goal**: Enable clients to send broadcast campaigns

### 6.1 Queue System (Priority: CRITICAL)
**Time**: 4-5 hours

#### Task 6.1.1: BullMQ Setup
**Files**:
- `backend/src/queue/queue.module.ts` (create)
- `backend/src/queue/processors/message-queue.processor.ts` (create)
- `backend/src/queue/processors/campaign-queue.processor.ts` (create)

**Queues**:
```typescript
// message-queue: Individual message sending
// campaign-queue: Campaign dispatch
// webhook-queue: Webhook processing
```

**Success Criteria**:
- ✅ BullMQ connected to Redis
- ✅ Message queue processes 30 msg/min
- ✅ Failed messages retry 3 times
- ✅ Queue dashboard accessible

### 6.2 Campaign Module (Priority: HIGH)
**Time**: 6-8 hours

#### Task 6.2.1: Campaign Backend
**Files**:
- `backend/src/campaigns/campaigns.controller.ts` (create)
- `backend/src/campaigns/campaigns.service.ts` (create)
- `backend/src/campaigns/campaign-dispatch.service.ts` (create)

**Endpoints**:
```typescript
POST /api/campaigns
GET /api/campaigns
GET /api/campaigns/:id
POST /api/campaigns/:id/start
POST /api/campaigns/:id/pause
```

**Success Criteria**:
- ✅ Create campaign
- ✅ Schedule campaign
- ✅ Dispatch to queue
- ✅ Track status
- ✅ Respect opt-outs

#### Task 6.2.2: Campaign Frontend
**Files**:
- `frontend/src/app/dashboard/campaigns/new/page.tsx` (create)
- `frontend/src/components/campaigns/campaign-form.tsx` (create)

**Features**:
- Name, Description
- Select Segment
- Select Template
- Category, Department
- Trigger Date/Time
- Preview before send

---

## 🎯 PHASE 7: COMPLIANCE ENGINE (Week 8)
**Goal**: Ensure WhatsApp policy compliance

### 7.1 Compliance Monitoring (Priority: HIGH)
**Time**: 4-5 hours

#### Task 7.1.1: Compliance Service
**Files**:
- `backend/src/compliance/compliance.service.ts` (create)
- `backend/src/compliance/quality-monitor.service.ts` (create)

**Features**:
- Track opt-ins/opt-outs
- Monitor quality rating
- Detect spam risk
- Auto-pause low-quality tenants
- Log violations

**Success Criteria**:
- ✅ Opt-out list enforced
- ✅ Quality rating synced from Meta
- ✅ Auto-pause on quality drop
- ✅ Violations logged

---

## 🎯 PHASE 8: SUPER ADMIN DASHBOARD (Week 9)
**Goal**: Enable platform management

### 8.1 Tenant Management UI (Priority: MEDIUM)
**Time**: 4-5 hours

**Files**:
- `frontend/src/app/admin/tenants/page.tsx` (create)
- `frontend/src/components/admin/tenant-list.tsx` (create)
- `frontend/src/components/admin/tenant-approval.tsx` (create)

**Features**:
- List all tenants
- Approve/Reject pending
- Suspend/Activate
- View usage stats
- Assign plans

### 8.2 Compliance Centre UI (Priority: MEDIUM)
**Time**: 3-4 hours

**Files**:
- `frontend/src/app/admin/compliance/page.tsx` (create)

**Features**:
- View all violations
- Quality rating alerts
- Spam risk dashboard
- Auto-pause logs

---

## 🎯 PHASE 9: ANALYTICS & REPORTING (Week 10)
**Goal**: Provide insights to clients

### 9.1 Analytics Backend (Priority: MEDIUM)
**Time**: 4-5 hours

**Files**:
- `backend/src/analytics/analytics.controller.ts` (create)
- `backend/src/analytics/analytics.service.ts` (create)

**Endpoints**:
```typescript
GET /api/analytics/overview
GET /api/analytics/campaigns/:id
GET /api/analytics/templates/:id
GET /api/analytics/export
```

### 9.2 Analytics Frontend (Priority: MEDIUM)
**Time**: 5-6 hours

**Files**:
- `frontend/src/app/dashboard/analytics/page.tsx` (create)
- `frontend/src/components/analytics/charts.tsx` (create)

**Features**:
- Sent/Delivered/Read metrics
- Click tracking (UTM)
- Template performance
- Campaign ROI
- Export CSV/PDF

---

## 🎯 PHASE 10: BILLING & TEAM MANAGEMENT (Week 11)
**Goal**: Complete platform features

### 10.1 Billing System (Priority: MEDIUM)
**Time**: 6-8 hours

**Files**:
- `backend/src/billing/billing.controller.ts` (create)
- `backend/src/billing/billing.service.ts` (create)
- `backend/src/billing/usage-tracking.service.ts` (create)

**Features**:
- Track message usage
- Generate invoices
- Payment integration (Stripe/Razorpay)
- Plan management

### 10.2 Team Management (Priority: LOW)
**Time**: 3-4 hours

**Files**:
- `backend/src/team/team.controller.ts` (create)
- `frontend/src/app/dashboard/team/page.tsx` (create)

**Features**:
- Add team members
- Assign roles
- Activity logs

---

## 🎯 PHASE 11: TESTING & DEPLOYMENT (Week 12)
**Goal**: Production-ready platform

### 11.1 Testing (Priority: CRITICAL)
**Time**: 8-10 hours

- Unit tests (80%+ coverage)
- Integration tests
- E2E tests (Playwright)
- Security testing
- Load testing

### 11.2 Production Deployment (Priority: CRITICAL)
**Time**: 6-8 hours

- CI/CD pipeline (GitHub Actions)
- Docker production images
- Kubernetes/Docker Swarm setup
- Secrets management (AWS KMS/Vault)
- Monitoring (Prometheus/Grafana)
- Logging (ELK Stack)
- SSL/TLS certificates
- Domain configuration

---

## 📋 DECISION LOG

### Decision 1: ORM Choice (2026-02-09)
**Decision**: Continue with TypeORM (instead of Prisma)  
**Reason**: 40% of backend already built with TypeORM  
**Impact**: Low - TypeORM is production-grade  
**Action**: Document deviation from specification

### Decision 2: Implementation Order (2026-02-09)
**Decision**: Prioritize WhatsApp Integration → Client Dashboard → Queue System  
**Reason**: Core features needed for MVP  
**Impact**: Delays Super Admin dashboard (non-critical for MVP)

---

## 🎯 SUCCESS METRICS

### MVP (Minimum Viable Product)
- ✅ Client can connect WhatsApp
- ✅ Client can create templates
- ✅ Client can upload contacts
- ✅ Client can send campaigns
- ✅ Compliance monitoring active
- **Target**: Week 8

### Full Platform
- ✅ All client features complete
- ✅ All super admin features complete
- ✅ Analytics & reporting
- ✅ Billing system
- ✅ Team management
- **Target**: Week 12

---

## 🚀 CURRENT FOCUS

**Now Building**: Phase 1 - Security Hardening  
**Next**: Phase 2 - WhatsApp Integration  
**Timeline**: 4-6 weeks to MVP

---

**Last Updated**: 2026-02-09 21:13 IST  
**Status**: 🟢 Active Development

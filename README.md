# 🔒 Techaasvik - Secure Multi-Tenant WhatsApp Marketing SaaS

**Production-grade, bank-level secure WhatsApp marketing platform with strict tenant isolation and Meta compliance.**

---

## 🎯 Overview

Techaasvik is an enterprise-grade SaaS platform that enables businesses to manage WhatsApp marketing campaigns through Meta's official WhatsApp Business Platform. Built with security-first architecture, the platform ensures complete tenant isolation, encrypted credential storage, and full compliance with Meta's policies.

### Key Features

✅ **Multi-Tenant Architecture** - Complete data isolation per client  
✅ **Meta Embedded Signup** - Official WhatsApp Business Account integration  
✅ **Encrypted Credentials** - AES-256-GCM encryption for all tokens  
✅ **Role-Based Access Control** - Granular permissions system  
✅ **Compliance Engine** - Opt-in tracking, DND, quality monitoring  
✅ **Campaign Management** - Template-based messaging with analytics  
✅ **Super Admin Dashboard** - Platform management and monitoring  
✅ **Client Dashboard** - Self-service campaign management  

---

## 🏗️ Architecture

### Tech Stack

**Backend**
- **Runtime**: Node.js (v18+)
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 16
- **Cache/Queue**: Redis 7
- **Queue Processing**: BullMQ

**Frontend**
- **Framework**: Next.js 14 (React, TypeScript)
- **Styling**: TailwindCSS
- **State Management**: React Context + SWR

**Infrastructure**
- **Containerization**: Docker + Docker Compose
- **Deployment**: Cloud-agnostic (AWS/GCP ready)
- **Secrets**: Environment-based (KMS/Vault ready)

### Security Principles

1. **Tenant Isolation** - Every query filtered by `tenant_id`
2. **Encrypted Secrets** - All WhatsApp tokens encrypted at rest
3. **No Token Exposure** - Tokens never sent to frontend or logs
4. **JWT Authentication** - Access + refresh token rotation
5. **Webhook Verification** - HMAC signature validation
6. **Audit Logging** - Immutable, tenant-scoped logs

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **Git** ([Download](https://git-scm.com/))

### 1. Clone & Setup

```bash
# Clone repository
git clone <repository-url>
cd adometa.techaasvik.in

# Copy environment template
cp .env.example .env

# Generate secure secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('ENCRYPTION_MASTER_KEY=' + require('crypto').randomBytes(32).toString('base64'))"

# Update .env with generated secrets
```

### 2. Start Development Environment

```bash
# Start all services (PostgreSQL, Redis, Backend, Frontend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 3. Access Applications

- **Frontend (Client)**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## 📁 Project Structure

```
adometa.techaasvik.in/
├── backend/                    # NestJS Backend API
│   ├── src/
│   │   ├── auth/              # Authentication & JWT
│   │   ├── tenants/           # Tenant management
│   │   ├── whatsapp/          # WhatsApp API integration
│   │   ├── campaigns/         # Campaign management
│   │   ├── compliance/        # Compliance engine
│   │   ├── security/          # Encryption & security
│   │   ├── common/            # Guards, interceptors, filters
│   │   └── main.ts
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                   # Next.js Frontend
│   ├── src/
│   │   ├── app/               # Next.js 14 App Router
│   │   │   ├── admin/         # Super Admin Dashboard
│   │   │   ├── dashboard/     # Client Dashboard
│   │   │   └── auth/          # Login/Register
│   │   ├── components/        # Reusable components
│   │   ├── lib/               # Utilities & API client
│   │   └── types/             # TypeScript types
│   ├── Dockerfile
│   └── package.json
│
├── database/
│   └── init/
│       └── 001_schema.sql     # Database schema
│
├── .artifacts/
│   └── IMPLEMENTATION_PLAN.md # Detailed implementation plan
│
├── docker-compose.yml         # Local development setup
├── .env.example               # Environment template
├── .gitignore
└── README.md
```

---

## 🔐 Security Configuration

### Environment Variables (Critical)

**NEVER commit `.env` to Git!** Use `.env.example` as a template.

```bash
# Database
DATABASE_URL=postgresql://adotech_in:SECURE_PASSWORD@localhost:5432/adotech_in

# JWT Secrets (Generate with crypto.randomBytes)
JWT_SECRET=<64-byte-hex>
JWT_REFRESH_SECRET=<64-byte-hex>

# Encryption Master Key (Generate with crypto.randomBytes)
ENCRYPTION_MASTER_KEY=<32-byte-base64>

# Meta WhatsApp (Configured via Super Admin Dashboard)
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=https://api.techaasvik.com/oauth/callback
```

### Token Encryption

All WhatsApp access tokens are encrypted using **AES-256-GCM** before storage:

```typescript
// Encryption flow
const plainToken = "EAABsbCS..."; // From Meta
const encrypted = await encryptionService.encryptToken(tenantId, plainToken);
// Store encrypted value in database

// Decryption flow (only when making API calls)
const decrypted = await encryptionService.decryptToken(tenantId, encrypted);
// Use for WhatsApp API call, never expose
```

**Rules**:
- ✅ Tokens encrypted at rest
- ✅ Tokens never logged
- ✅ Tokens never sent to frontend
- ✅ Tokens decrypted only for API calls
- ✅ Separate encryption key per tenant (derived)

---

## 👥 User Roles & Permissions

### Super Admin (Techaasvik Company)

**Can**:
- Manage platform configuration (Meta App, BSP providers)
- Approve/suspend tenants
- View tenant metadata (business name, plan, usage)
- Monitor compliance violations
- Approve templates
- View system health metrics

**Cannot**:
- View tenant WhatsApp tokens (encrypted)
- View tenant messages or contacts
- Send messages on behalf of tenants

### Tenant Admin (Client Owner)

**Can**:
- Connect WhatsApp Business Account
- Manage team members
- Create campaigns
- Manage templates, contacts, segments
- View reports and analytics
- Generate API keys
- Manage billing

### Tenant Marketer

**Can**:
- Create campaigns
- Manage contacts and segments
- View reports

**Cannot**:
- Manage team members
- Connect WhatsApp
- Manage billing

### Tenant Developer

**Can**:
- Generate API keys
- View API documentation
- Access webhook logs

### Read-Only

**Can**:
- View reports and analytics only

---

## 📊 Database Schema

### Key Tables

**System Tables** (No `tenant_id`):
- `super_admins` - Platform administrators
- `platform_config` - System configuration
- `bsp_providers` - BSP provider settings
- `system_audit_logs` - Super admin actions

**Tenant Tables** (All have `tenant_id`):
- `tenants` - Client accounts
- `tenant_users` - Client team members
- `tenant_waba_config` - WhatsApp credentials (encrypted)
- `tenant_templates` - Message templates
- `tenant_contacts` - Contact lists
- `tenant_campaigns` - Marketing campaigns
- `tenant_messages` - Message history
- `tenant_compliance_violations` - Compliance tracking
- `tenant_audit_logs` - Tenant actions

### Tenant Isolation

**Every tenant query MUST include `tenant_id`**:

```typescript
// ✅ CORRECT - Tenant isolated
const contacts = await contactRepo.find({
  where: { tenant_id: tenantId, opt_in_status: true }
});

// ❌ WRONG - Cross-tenant access risk
const contacts = await contactRepo.find({
  where: { opt_in_status: true } // Missing tenant_id!
});
```

---

## 🔄 WhatsApp Embedded Signup Flow

### Client-Side Flow

1. **Client logs into Techaasvik**
2. **Navigates to Dashboard → Connect WhatsApp**
3. **Clicks "Connect WhatsApp Business Account"**
4. **Redirected to Meta OAuth**
5. **Logs into Facebook Business Manager**
6. **Selects/Creates WABA + Phone Number**
7. **Meta redirects back to Techaasvik**
8. **Backend receives authorization code**
9. **Backend exchanges code for access token**
10. **Token encrypted and stored in `tenant_waba_config`**
11. **Status: PENDING_APPROVAL**
12. **Super Admin approves connection**
13. **Status: ACTIVE**

### Security Measures

- ✅ CSRF protection via `state` parameter
- ✅ Token encrypted immediately upon receipt
- ✅ Token never exposed to frontend
- ✅ Super Admin approval required
- ✅ Webhook signature verification

---

## 📱 API Documentation

### Authentication

All API requests require JWT token in `Authorization` header:

```bash
Authorization: Bearer <access_token>
```

### Tenant Context

For tenant-scoped endpoints, `tenant_id` is extracted from JWT claims:

```typescript
// JWT payload
{
  sub: "user-uuid",
  email: "user@example.com",
  role: "TENANT_ADMIN",
  tenantId: "tenant-uuid", // Automatically injected into requests
  iat: 1234567890,
  exp: 1234567890
}
```

### Example Endpoints

```bash
# Super Admin
GET    /api/admin/tenants              # List all tenants
GET    /api/admin/tenants/:id          # View tenant details
POST   /api/admin/tenants/:id/approve  # Approve tenant
POST   /api/admin/tenants/:id/suspend  # Suspend tenant

# Tenant (Client)
GET    /api/tenants/me                 # Get current tenant info
POST   /api/whatsapp/connect           # Initiate embedded signup
GET    /api/campaigns                  # List campaigns (tenant-scoped)
POST   /api/campaigns                  # Create campaign
GET    /api/contacts                   # List contacts (tenant-scoped)
POST   /api/messages/send              # Send message
```

---

## 🛡️ Compliance & Governance

### Opt-In Tracking

**Every contact MUST have opt-in record**:

```typescript
// Before sending message
const contact = await contactRepo.findOne({ 
  where: { tenant_id: tenantId, phone: recipientPhone } 
});

if (!contact.opt_in_status) {
  throw new Error('Contact has not opted in');
}
```

### DND & Unsubscribe

- Contacts can opt-out via unsubscribe link
- DND list automatically excludes contacts from campaigns
- Opt-out timestamp and reason tracked

### Message Frequency Caps

```typescript
// Check message frequency
const messagesLast24h = await messageRepo.count({
  where: {
    tenant_id: tenantId,
    contact_id: contactId,
    created_at: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000))
  }
});

if (messagesLast24h >= MAX_MESSAGES_PER_DAY) {
  throw new Error('Message frequency cap exceeded');
}
```

### Quality Rating Monitoring

- Daily sync from Meta API
- Auto-pause campaigns if rating drops below threshold
- Alert tenant and Super Admin

---

## 🧪 Testing

### Unit Tests

```bash
# Backend
cd backend
npm run test

# Frontend
cd frontend
npm run test
```

### Integration Tests

```bash
# Backend
cd backend
npm run test:e2e
```

### Test Coverage

```bash
# Backend
cd backend
npm run test:cov
```

---

## 🚀 Deployment

### Production Checklist

- [ ] Generate secure secrets (JWT, encryption keys)
- [ ] Configure Meta App credentials
- [ ] Setup PostgreSQL (managed service)
- [ ] Setup Redis (managed service)
- [ ] Configure S3-compatible storage
- [ ] Setup monitoring (Prometheus/Grafana)
- [ ] Configure CI/CD pipeline
- [ ] Enable automated backups
- [ ] Setup SSL/TLS certificates
- [ ] Configure rate limiting
- [ ] Test webhook signature verification
- [ ] Verify tenant isolation
- [ ] Test compliance engine
- [ ] Load testing

### Environment-Specific Configs

**Development**: `docker-compose.yml`  
**Staging**: Cloud deployment with staging DB  
**Production**: Cloud deployment with production DB, KMS/Vault for secrets

---

## 📈 Monitoring & Logging

### Metrics to Monitor

- API response times (p50, p95, p99)
- Database query performance
- Queue processing times
- Webhook success/failure rates
- Message delivery rates
- Quality rating trends
- Compliance violation counts

### Logging Rules

**DO**:
- ✅ Log tenant actions (audit logs)
- ✅ Log API errors
- ✅ Log webhook events
- ✅ Mask sensitive identifiers (phone numbers)

**DON'T**:
- ❌ Log WhatsApp tokens
- ❌ Log passwords
- ❌ Log full message bodies (PII)
- ❌ Log encryption keys

---

## 🆘 Support & Documentation

- **Implementation Plan**: `.artifacts/IMPLEMENTATION_PLAN.md`
- **API Documentation**: http://localhost:3001/api/docs
- **Database Schema**: `database/init/001_schema.sql`

---

## 📜 License

Proprietary - Techaasvik Platform

---

## 🔒 Security Disclosure

If you discover a security vulnerability, please email: security@techaasvik.com

**DO NOT** create public GitHub issues for security vulnerabilities.

---

**Built with security, compliance, and scalability as top priorities. 🚀**

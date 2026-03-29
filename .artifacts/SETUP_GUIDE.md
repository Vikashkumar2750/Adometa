# 🚀 ADOMETA WHATSAPP SAAS PLATFORM
## Local Development Setup & Credentials

**Last Updated**: 2026-02-11 22:32 IST  
**Platform Version**: 1.0.0  
**Status**: 75% Complete

---

## 📋 TABLE OF CONTENTS

1. [System Requirements](#system-requirements)
2. [Database Credentials](#database-credentials)
3. [Application Credentials](#application-credentials)
4. [Environment Setup](#environment-setup)
5. [Running Locally](#running-locally)
6. [Testing the Platform](#testing-the-platform)
7. [API Documentation](#api-documentation)
8. [Troubleshooting](#troubleshooting)

---

## 🖥️ SYSTEM REQUIREMENTS

### Required Software:
- **Node.js**: v18+ or v24+ (Currently using v24.11.1)
- **PostgreSQL**: v14+ (Database)
- **npm**: v8+ (Package manager)
- **Git**: Latest version

### Optional:
- **pgAdmin** or **DBeaver**: Database management
- **Postman** or **Thunder Client**: API testing
- **VS Code**: Recommended IDE

---

## 🔐 DATABASE CREDENTIALS

### PostgreSQL Database:
```
Host:     localhost
Port:     5432
Database: adotech_in
Username: adotech_in
Password: Techaasvik@2026!Secure
```

### Connection String:
```
postgresql://adotech_in:Techaasvik@2026!Secure@localhost:5432/adotech_in
```

### Database Tables:
- `super_admins` - Super admin accounts
- `tenant_waba_config` - WhatsApp API configurations
- `tenant_webhook_events` - Webhook event logs
- `contacts` - Customer contacts (tenant-scoped)
- `campaigns` - Marketing campaigns (tenant-scoped)
- `audit_logs` - Audit trail logs

---

## 👤 APPLICATION CREDENTIALS

### Super Admin Account:
```
Email:    admin@techaasvik.com
Password: Admin@Techaasvik2026!
```

### Default Tenant:
```
Tenant ID: default-tenant
```

### Test User (If created):
```
Email:    test@example.com
Password: Test@123456
```

---

## ⚙️ ENVIRONMENT SETUP

### 1. Clone Repository
```powershell
cd C:\Users\Wall\Desktop
# Repository already exists at: adometa.techaasvik.in
```

### 2. Install Dependencies

**Backend:**
```powershell
cd C:\Users\Wall\Desktop\adometa.techaasvik.in\backend
npm install
```

**Frontend:**
```powershell
cd C:\Users\Wall\Desktop\adometa.techaasvik.in\frontend
npm install
```

### 3. Environment Variables

**Backend (.env)** - Located at: `backend/.env`
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=adotech_in
DB_USER=adotech_in
DB_PASSWORD=Techaasvik@2026!Secure

# Application
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001

# JWT Secrets (Already configured)
JWT_SECRET=e75d78a491321125893c0fe1c5e692425ae2ac8d90aee369b32d0453316941b5d7ba3b5b3ccec0d3751ddb58de4b879115b09babfc344a1b9438a8348eeecbac
JWT_REFRESH_SECRET=7f6dfdf619d96950d2a0b1e90f1397c78d2f41f364744845956290a0018b8c2a6d37b1444bedae05dfb3e973d51e4e1e7af6445ce5634071a42de3a66d292441

# Encryption
ENCRYPTION_MASTER_KEY=f/jpuFYKexZrQLjhFRj66SJpLuKwSMrOWVN7Xmv2N0Y=

# Super Admin
SUPER_ADMIN_EMAIL=admin@techaasvik.com
SUPER_ADMIN_PASSWORD=Admin@Techaasvik2026!
```

**Frontend (.env.local)** - Located at: `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 4. Database Setup

**Run Migrations:**
```powershell
cd C:\Users\Wall\Desktop\adometa.techaasvik.in\backend

# Run schema migration
node run-migration.js
```

**Verify Database:**
```powershell
# Check database
node check-db.js
```

---

## 🚀 RUNNING LOCALLY

### Start Backend Server

```powershell
cd C:\Users\Wall\Desktop\adometa.techaasvik.in\backend
npm run start:dev
```

**Expected Output:**
```
[Nest] Starting Nest application...
[Nest] 🚀 Application is running on: http://localhost:3001/api
[Nest] 📚 Swagger documentation: http://localhost:3001/api/docs
```

**Backend will be available at:**
- API: http://localhost:3001/api
- Swagger Docs: http://localhost:3001/api/docs

### Start Frontend Server

```powershell
# Open new terminal
cd C:\Users\Wall\Desktop\adometa.techaasvik.in\frontend
npm run dev
```

**Expected Output:**
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in 2.5s
```

**Frontend will be available at:**
- Application: http://localhost:3000

---

## 🧪 TESTING THE PLATFORM

### 1. Test Backend API

**Quick Test:**
```powershell
cd C:\Users\Wall\Desktop\adometa.techaasvik.in\backend
node quick-test.js
```

**Full Test Suite:**
```powershell
node test-campaigns-api.js
```

**Expected Result:**
```
🎉 ALL TESTS PASSED! ✅
   ✅ Create Campaign
   ✅ Get Campaign
   ✅ List Campaigns
   ✅ Update Campaign
   ✅ Get Statistics
   ✅ Start Campaign
   ✅ Pause Campaign
   ✅ Resume Campaign
   ✅ Search Campaigns
   ✅ Filter Campaigns
```

### 2. Test Frontend

**Visit:** http://localhost:3000

**Login as Super Admin:**
1. Navigate to login page
2. Enter credentials:
   - Email: `admin@techaasvik.com`
   - Password: `Admin@Techaasvik2026!`
3. Click "Sign In"

**Test Features:**
- ✅ Dashboard overview
- ✅ Contacts management
- ✅ Campaigns management
- ✅ Super admin features

### 3. Test API Endpoints

**Using curl:**
```powershell
# Test health check
curl http://localhost:3001/api

# Test campaigns list
curl http://localhost:3001/api/campaigns

# Test contacts list
curl http://localhost:3001/api/contacts
```

**Using Postman/Thunder Client:**
- Import collection from: `backend/postman-collection.json` (if exists)
- Or manually test endpoints listed in Swagger docs

---

## 📚 API DOCUMENTATION

### Swagger UI
**URL**: http://localhost:3001/api/docs

### Available Endpoints:

#### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

#### Contacts (10 endpoints)
- `POST /api/contacts` - Create contact
- `GET /api/contacts` - List contacts (paginated)
- `GET /api/contacts/:id` - Get contact
- `PATCH /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `GET /api/contacts/statistics` - Get statistics
- `GET /api/contacts/tags` - Get all tags
- `POST /api/contacts/import` - Bulk import
- `GET /api/contacts/export` - Export to CSV

#### Campaigns (10 endpoints)
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns` - List campaigns (paginated)
- `GET /api/campaigns/:id` - Get campaign
- `PATCH /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `POST /api/campaigns/:id/start` - Start campaign
- `POST /api/campaigns/:id/pause` - Pause campaign
- `POST /api/campaigns/:id/resume` - Resume campaign
- `POST /api/campaigns/:id/test` - Test campaign
- `GET /api/campaigns/statistics` - Get statistics

#### WhatsApp
- `POST /api/whatsapp/messages/template` - Send template message
- `POST /api/whatsapp/messages/text` - Send text message
- `POST /api/whatsapp/messages/media` - Send media message
- `GET /api/whatsapp/messages/templates` - Get templates
- `POST /api/whatsapp/webhook` - Webhook endpoint
- `GET /api/whatsapp/webhook/events` - Get webhook events

---

## 🔧 TROUBLESHOOTING

### Backend won't start

**Issue**: Port 3001 already in use
```powershell
# Find process using port 3001
Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess

# Kill the process
Stop-Process -Id <process-id> -Force
```

**Issue**: Database connection error
```powershell
# Verify PostgreSQL is running
Get-Service -Name postgresql*

# Start PostgreSQL if stopped
Start-Service postgresql-x64-14
```

### Frontend won't start

**Issue**: Port 3000 already in use
```powershell
# Change port in package.json or kill process
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### Database Issues

**Reset Database:**
```sql
-- Connect to PostgreSQL
psql -U adotech_in -d adotech_in

-- Drop all tables
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS tenant_webhook_events CASCADE;
DROP TABLE IF EXISTS tenant_waba_config CASCADE;
DROP TABLE IF EXISTS super_admins CASCADE;

-- Re-run migrations
\q
node run-migration.js
```

### Clear Node Modules

```powershell
# Backend
cd backend
Remove-Item -Recurse -Force node_modules
npm install

# Frontend
cd ../frontend
Remove-Item -Recurse -Force node_modules
npm install
```

---

## 📊 PLATFORM STATUS

### Completed Features (75%):
- ✅ Authentication & Authorization
- ✅ Role-Based Access Control (RBAC)
- ✅ Tenant Isolation
- ✅ Contacts Module (100%)
- ✅ Campaigns Module (100%)
- ✅ WhatsApp Integration (80%)
- ✅ Audit Logging
- ✅ Super Admin Dashboard (50%)

### In Progress:
- 🚧 Templates Module
- 🚧 Analytics Module
- 🚧 Settings Module
- 🚧 Super Admin Features (remaining pages)

### Not Started:
- ⏳ Billing & Subscriptions
- ⏳ Email Notifications
- ⏳ Advanced Analytics
- ⏳ Multi-language Support

---

## 🎯 QUICK START CHECKLIST

- [ ] PostgreSQL installed and running
- [ ] Node.js v18+ installed
- [ ] Repository cloned
- [ ] Backend dependencies installed (`npm install`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Database created (`adotech_in`)
- [ ] Migrations run (`node run-migration.js`)
- [ ] Backend .env configured
- [ ] Frontend .env.local configured
- [ ] Backend server started (`npm run start:dev`)
- [ ] Frontend server started (`npm run dev`)
- [ ] Login tested with super admin credentials
- [ ] API endpoints tested

---

## 📞 SUPPORT

### Documentation:
- Backend API: http://localhost:3001/api/docs
- Frontend: http://localhost:3000
- Database: Check `.artifacts/` folder for schemas

### Test Scripts:
- `backend/quick-test.js` - Quick API test
- `backend/test-campaigns-api.js` - Full campaign tests
- `backend/check-db.js` - Database verification
- `backend/run-migration.js` - Run migrations

---

**Platform**: Adometa WhatsApp SaaS  
**Version**: 1.0.0  
**Last Updated**: 2026-02-11 22:32 IST  
**Status**: ✅ Development Ready

**HAPPY CODING! 🚀**

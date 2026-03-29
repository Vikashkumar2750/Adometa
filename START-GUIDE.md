# 🚀 Techaasvik Platform — Start Guide

> Quick reference for starting, stopping, and managing your local development servers.

---

## 📁 Project Structure

```
adometa.techaasvik.in/
├── backend/          ← NestJS API server  (port 3001)
├── frontend/         ← Next.js web app    (port 3000)
├── .env              ← All environment variables (single source of truth)
├── package.json      ← Root with helper scripts
└── START-GUIDE.md    ← This file
```

---

## ⚡ Quick Start (Recommended)

Open **two separate PowerShell / Terminal windows** and run one command in each.

### Terminal 1 — Backend API

```powershell
cd C:\Users\Wall\Desktop\adometa.techaasvik.in\backend
npm run start:dev
```

**Wait for:**
```
🚀 Application is running on: http://localhost:3001/api
📚 Swagger documentation: http://localhost:3001/api/docs
```

### Terminal 2 — Frontend

```powershell
cd C:\Users\Wall\Desktop\adometa.techaasvik.in\frontend
npm run dev
```

**Wait for:**
```
✓ Ready in Xs
http://localhost:3000
```

---

## 🛠️ From Root Directory (Alternative)

The root `package.json` has convenience scripts:

| Command | What it does |
|---|---|
| `npm run start:dev` | Starts the **backend** in watch mode |
| `npm run backend:dev` | Same as above |
| `npm run frontend:dev` | Starts the **frontend** |
| `npm run migrate:billing` | Runs billing DB migration |
| `npm run migrate:team` | Runs team activity log migration |
| `npm run migrate:all` | Runs **all** migrations |
| `npm run install:all` | Installs deps for all sub-projects |

```powershell
# From the root folder:
cd C:\Users\Wall\Desktop\adometa.techaasvik.in

npm run start:dev       # Backend
npm run frontend:dev    # Frontend (in a second terminal)
```

---

## 🌐 URLs

| Service | URL | Notes |
|---|---|---|
| **Frontend** | http://localhost:3000 | Next.js web app |
| **Backend API** | http://localhost:3001/api | NestJS REST API |
| **Swagger Docs** | http://localhost:3001/api/docs | Interactive API explorer |
| **Support (Client)** | http://localhost:3000/dashboard/support | Client chat & tickets |
| **Support (Admin)** | http://localhost:3000/admin/support | Agent panel |

---

## 🔑 Login Credentials

| Account | Email | Password | Login URL |
|---|---|---|---|
| Super Admin | `admin@techaasvik.com` | `Admin@Techaasvik2026!` | http://localhost:3000/login → `/admin` |
| Client Demo | `demo1@techaasvik.com` | `Demo1@Techaasvik!` | http://localhost:3000/login → `/dashboard` |
| Team Members | Created in Settings → Team | Set by admin | http://localhost:3000/login |

> ℹ️ **WhatsApp:** `admin@techaasvik.com` is SuperAdmin — it redirects to `/admin` automatically.  
> ℹ️ **Client login:** use `demo1@techaasvik.com` to access `/dashboard`.

---

## 🗄️ Database Migrations

Run these **once each** when setting up or after pulling new code that adds tables:

```powershell
cd C:\Users\Wall\Desktop\adometa.techaasvik.in\backend

# Billing tables (wallets, invoices, transactions, settings)
node run-billing-migration.js

# Team activity log + campaign CTA column
node run-team-migration.js

# ✅ Support tables (tickets + messages) — already run 2026-02-23
node run-migration-support.js

# ✅ Automation rules table — already run 2026-03-28
node run-migration-automation.js
```

Or from root (runs all):
```powershell
npm run migrate:all
```

---

## 🔧 Environment Variables (`.env`)

The `.env` file lives in the **root** folder and is shared by both backend and frontend.

Key variables to check before first run:

```dotenv
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=techaasvik

# Auth
JWT_SECRET=your_jwt_secret_here
SUPER_ADMIN_EMAIL=admin@techaasvik.in
SUPER_ADMIN_PASSWORD=StrongPassword123

# Email (SMTP) — configure ONE provider:
SMTP_HOST=smtp.gmail.com        # Gmail
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=you@gmail.com
SMTP_FROM_NAME=Techaasvik

# PaymentGateways (optional for dev)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

> **Email tip:** If SMTP is not configured, the app still works — password reset tokens and support confirmations will log to the console instead. You'll see `dev_reset_url` in the API response for `/auth/forgot-password`.

---

## 🛑 Stopping Servers

Press `Ctrl + C` in each terminal window to stop the respective server.

---

## ♻️ First-Time Setup (Fresh Machine)

```powershell
cd C:\Users\Wall\Desktop\adometa.techaasvik.in

# 1. Install all dependencies
npm run install:all

# 2. Configure .env (edit DB credentials, SMTP, JWT secret)

# 3. Run all database migrations
cd backend
node run-billing-migration.js
node run-team-migration.js
node run-migration-support.js

# 4. Start backend (Terminal 1)
npm run start:dev

# 5. Start frontend (Terminal 2)
cd ../frontend
npm run dev
```

---

## 🏗️ Features Implemented

| Feature | Status | URL |
|---|---|---|
| Auth (login / logout) | ✅ | `/login` |
| **Forgot Password** | ✅ NEW | `/forgot-password` |
| **Reset Password** | ✅ NEW | `/reset-password?token=...` |
| Tenant Dashboard | ✅ | `/dashboard` |
| Messages | ✅ | `/dashboard/messages` |
| Contacts | ✅ | `/dashboard/contacts` |
| Templates | ✅ | `/dashboard/templates` |
| Campaigns | ✅ | `/dashboard/campaigns` |
| Automation | ✅ | `/dashboard/automation` |
| Analytics | ✅ | `/dashboard/analytics` |
| Billing | ✅ | `/dashboard/billing` |
| **Support Chat (Client)** | ✅ NEW | `/dashboard/support` |
| **Automation Engine** | ✅ NEW | `/dashboard/automation` |
| Settings | ✅ | `/dashboard/settings` |
| Admin Dashboard | ✅ | `/admin` |
| Admin Tenants | ✅ | `/admin/tenants` |
| Admin Billing | ✅ | `/admin/billing` |
| **Support Center (Admin)** | ✅ NEW | `/admin/support` |
| **Email Service** | ✅ NEW | via SMTP config in `.env` |

---

## 📋 Available API Endpoints (Summary)

| Group | Base Path |
|---|---|
| Auth | `/api/auth` |
| **Forgot/Reset Password** | `/api/auth/forgot-password` · `/api/auth/reset-password` |
| Campaigns | `/api/campaigns` |
| Contacts | `/api/contacts` |
| Templates | `/api/templates` |
| Segments | `/api/segments` |
| WhatsApp | `/api/whatsapp` |
| Team Management | `/api/team` |
| Billing | `/api/billing` |
| Admin Billing | `/api/admin/billing` |
| **Support (Client)** | `/api/support` |
| **Support (Admin)** | `/api/support/admin` |
| **Automation Rules** | `/api/automation` |
| Payment Webhooks | `/api/webhooks` |

Full interactive docs: **http://localhost:3001/api/docs**

---

## 🐛 Common Issues

| Problem | Fix |
|---|---|
| `Cannot connect to DB` | Check `.env` DB_HOST / DB_USER / DB_PASSWORD / DB_NAME |
| `Port 3001 already in use` | Run `netstat -ano \| findstr 3001` and kill the PID |
| `Port 3000 already in use` | Run `netstat -ano \| findstr 3000` and kill the PID |
| `Module not found` errors | Run `npm install` in `backend/` or `frontend/` |
| `nest: command not found` | Run `npm install` inside `backend/` folder |
| Emails not sending | Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` in `.env` |
| Support tables missing | Run `node run-migration-support.js` in `backend/` |
| WebSocket not connecting | Check `NEXT_PUBLIC_API_URL` in `.env` matches backend port |

---

*Last updated: March 2026 — v3.0 with Automation Engine + Unauthorized Page + Full Backend Integration*

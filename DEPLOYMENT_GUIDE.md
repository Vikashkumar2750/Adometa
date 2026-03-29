# 🚀 Adometa WhatsApp SaaS — Deployment Guide
**Stack:** Next.js 14 (Frontend) + NestJS (Backend) + PostgreSQL + Redis  
**Recommended:** Hostinger shared hosting for frontend static export OR Railway for full Next.js  
**Backend:** Railway.app (Node.js)  
**Database:** Supabase (PostgreSQL free tier) or Railway PostgreSQL addon  
**Redis:** Upstash (free tier)

---

## Option A: Railway (Recommended — Full-Stack)

### 1. Push Code to GitHub
```bash
git add .
git commit -m "chore: production ready"
git push origin main
```

### 2. Supabase — Free PostgreSQL
1. Go to [supabase.com](https://supabase.com) → New Project
2. Save the **Database Password**
3. Settings → Database → **Connection String (URI)**
4. Copy: `postgresql://postgres:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

### 3. Upstash — Free Redis
1. Go to [upstash.com](https://upstash.com) → New Database → `adometa-redis`
2. Copy the **`REDIS_URL`** (starts with `rediss://`)

### 4. Deploy Backend to Railway
1. [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your repo
3. Click service → **Settings** → Root Directory: `/backend`
4. **Variables tab** — add all vars from `.env`:

```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:[PASSWORD]@...supabase.com:6543/postgres
REDIS_URL=rediss://...upstash.io:...
JWT_SECRET=<generate: openssl rand -hex 64>
ENCRYPTION_MASTER_KEY=<generate: openssl rand -hex 32>
SUPER_ADMIN_EMAIL=admin@techaasvik.com
SUPER_ADMIN_PASSWORD=Admin@Techaasvik2026!

META_APP_ID=1260080565960830
META_APP_SECRET=fb55eca8346b9ef14cb281e7237751ab
META_CONFIG_ID=1382728500014228
META_API_VERSION=v18.0
META_WEBHOOK_VERIFY_TOKEN=<set a strong random string>
META_REDIRECT_URI=https://YOUR-BACKEND-DOMAIN.up.railway.app/api/whatsapp/oauth/callback

RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=noreply@techaasvik.in
SMTP_PASS=<your hostinger email password>
SMTP_FROM=noreply@techaasvik.in
SMTP_FROM_NAME=Adometa

FRONTEND_URL=https://YOUR-FRONTEND-DOMAIN.up.railway.app
```

5. Settings → **Networking** → Generate Domain  
   Save: `adometa-backend.up.railway.app`

> ⚠️ **After backend deploys**, run the database migration:  
> Open Railway shell → `node run-migrations.js`  
> Or connect via psql and run `database/migrations/001_schema.sql` through `005_automation_rules.sql` in order.

### 5. Deploy Frontend to Railway
1. Same Railway project → **New** → GitHub Repo (same repo)
2. Settings → Root Directory: `/frontend`
3. Variables:
```env
NEXT_PUBLIC_API_URL=https://adometa-backend.up.railway.app/api
```
4. Networking → Generate Domain: `adometa-frontend.up.railway.app`
5. Go back to **backend Variables** → update `FRONTEND_URL=https://adometa-frontend.up.railway.app`

### 6. WhatsApp Webhook Setup (Meta Developer Console)
1. Go to [developers.facebook.com](https://developers.facebook.com) → Your App → WhatsApp → Webhooks
2. Callback URL: `https://adometa-backend.up.railway.app/api/whatsapp/webhook`
3. Verify Token: same value as `META_WEBHOOK_VERIFY_TOKEN` in your `.env`
4. Subscribe to: `messages`, `message_deliveries`, `message_reads`

---

## Option B: Hostinger (Frontend Static) + Railway (Backend)

> ⚠️ Hostinger **shared hosting** cannot run Next.js server. Use static export.
> Only works if you don't use Server Components / API routes (this project uses both).
> **Recommendation: Use Railway for both.**

If you still want Hostinger frontend (static build):
```bash
# In frontend/next.config.js, add:
output: 'export',
trailingSlash: true,
```
Then `npm run build` → upload `out/` folder to Hostinger `public_html/`.

---

## Option C: VPS / Hostinger VPS (Advanced)

If you have a **Hostinger VPS** (KVM Ubuntu):

```bash
# 1. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install PM2
npm install -g pm2

# 3. Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo -u postgres psql -c "CREATE USER adometa WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "CREATE DATABASE adometa_db OWNER adometa;"

# 4. Install Redis
sudo apt install redis-server -y

# 5. Clone your project
git clone https://github.com/yourusername/adometa.git /var/www/adometa
cd /var/www/adometa

# 6. Set up .env (copy from local, update DB/Redis to localhost)

# 7. Build & start backend
cd backend
npm install
npm run build
pm2 start dist/main.js --name adometa-backend

# 8. Build & start frontend
cd ../frontend
npm install
npm run build
pm2 start npm --name adometa-frontend -- start

# 9. Save PM2 processes
pm2 save
pm2 startup

# 10. Nginx reverse proxy
sudo apt install nginx -y
```

**Nginx config** (`/etc/nginx/sites-available/adometa`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (Next.js on port 3000)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API (NestJS on port 3001)
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/adometa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## Database Migrations (ALL OPTIONS)

Run these SQL files **in order** against your production PostgreSQL:

```bash
# Using psql
psql $DATABASE_URL -f backend/database/migrations/001_schema.sql
psql $DATABASE_URL -f backend/database/migrations/002_blog_cms.sql
psql $DATABASE_URL -f backend/database/migrations/003_support.sql
psql $DATABASE_URL -f backend/database/migrations/004_api_keys.sql
psql $DATABASE_URL -f backend/database/migrations/005_automation_rules.sql
```

---

## Environment Variables Checklist

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_SECRET` | ✅ | Min 64 chars random hex |
| `ENCRYPTION_MASTER_KEY` | ✅ | 32 chars hex |
| `SUPER_ADMIN_EMAIL` | ✅ | First admin account |
| `SUPER_ADMIN_PASSWORD` | ✅ | First admin password |
| `META_APP_ID` | ✅ | WhatsApp App ID |
| `META_APP_SECRET` | ✅ | WhatsApp App Secret |
| `META_WEBHOOK_VERIFY_TOKEN` | ✅ | Random string for webhook |
| `RAZORPAY_KEY_ID` | ✅ | Payment gateway |
| `RAZORPAY_KEY_SECRET` | ✅ | Payment gateway secret |
| `SMTP_HOST` | Optional | Email delivery host |
| `SMTP_USER` | Optional | Email username |
| `SMTP_PASS` | Optional | Email password |
| `FRONTEND_URL` | ✅ | For CORS headers |

---

## Post-Deployment Checklist

- [ ] All 5 migrations run successfully
- [ ] `GET /api` returns `{"status":"ok"}`
- [ ] Can log in as Super Admin
- [ ] Tenant registration works
- [ ] WhatsApp webhook verified by Meta
- [ ] Razorpay test payment succeeds
- [ ] Email sends (check SMTP logs)
- [ ] Automation scheduler logs appear in `pm2 logs adometa-backend`

---

*Last updated: March 2026 — Platform v3.0*

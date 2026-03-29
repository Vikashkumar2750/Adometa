# ☁️ Techaasvik — AWS Deployment Guide

> **Stack:** Next.js 16 (Frontend) · NestJS (Backend API) · PostgreSQL (Database) · Redis (Queue/Cache)
>
> **Architecture:** Frontend on Vercel or Amplify · Backend on EC2 / App Runner · Database on RDS · Redis on ElastiCache · Static assets on S3 + CloudFront · Domain on Route 53

---

## 📐 Architecture Overview

```
Internet
    ↓
Route 53 (DNS)
    ↓
CloudFront (CDN + HTTPS)
    ├──► S3 (static assets / uploads)
    ├──► Frontend — Vercel or Amplify (Next.js)
    └──► ALB (Application Load Balancer)
              ↓
          EC2 / App Runner (NestJS API — Port 3001)
              ├──► RDS PostgreSQL (adotech_in database)
              └──► ElastiCache Redis (Bull queues + cache)
```

**Estimated monthly cost for production:**

| Service | Size | Est. Cost |
|---|---|---|
| EC2 t3.medium (backend) | 1 instance | ~$30/mo |
| RDS db.t3.micro (PostgreSQL) | Single-AZ | ~$25/mo |
| ElastiCache cache.t3.micro (Redis) | 1 node | ~$15/mo |
| ALB | 1 ALB | ~$18/mo |
| CloudFront | Pay per use | ~$5/mo |
| Route 53 | 1 hosted zone | ~$1/mo |
| Vercel / Amplify (frontend) | Hobby/Pro | $0–$20/mo |
| **Total** | | **~$95–$115/mo** |

---

## 🔐 STEP 0 — AWS Account & IAM Setup

### 0.1 — Log into AWS Console

1. Go to **https://console.aws.amazon.com**
2. Sign in with your root account
3. In the top-right region dropdown — select **`ap-south-1` (Mumbai)** for India-based users, or `us-east-1` for global

### 0.2 — Create a Deployment IAM User (Security Best Practice)

> **AWS Console path:** `IAM` → `Users` → `Create user`

1. Open the **search bar** at top, type **`IAM`**, click **IAM**
2. Left sidebar → **Users** → **Create user**
3. **User name:** `techaasvik-deployer`
4. Check ✅ **Provide user access to the AWS Management Console**
5. **Console password:** Custom → set a strong password
6. Click **Next**
7. **Permission options:** Attach policies directly
8. Search and attach these policies:
   - `AmazonEC2FullAccess`
   - `AmazonRDSFullAccess`
   - `AmazonElastiCacheFullAccess`
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
   - `AmazonRoute53FullAccess`
   - `AWSCertificateManagerFullAccess`
   - `AmazonVPCFullAccess`
9. Click **Next** → **Create user**
10. Download and save the **CSV** with credentials

---

## 🛡️ STEP 1 — VPC & Security Groups

### 1.1 — Create VPC

> **AWS Console path:** `VPC` → `Your VPCs` → `Create VPC`

1. Search **`VPC`** in the top bar → Click **VPC**
2. Left panel → **Your VPCs** → **Create VPC**
3. Settings:
   - **Name tag:** `techaasvik-vpc`
   - **IPv4 CIDR:** `10.0.0.0/16`
   - Leave IPv6 as **No IPv6 CIDR block**
4. Click **Create VPC**

### 1.2 — Create Subnets

> **AWS Console path:** `VPC` → `Subnets` → `Create subnet`

You need 2 public subnets (frontend/ALB) and 2 private subnets (DB/Redis):

**Public Subnet 1:**
- **VPC:** `techaasvik-vpc`
- **Subnet name:** `techaasvik-public-1a`
- **Availability Zone:** `ap-south-1a`
- **IPv4 CIDR:** `10.0.1.0/24`

**Public Subnet 2:**
- **Subnet name:** `techaasvik-public-1b`
- **Availability Zone:** `ap-south-1b`
- **IPv4 CIDR:** `10.0.2.0/24`

**Private Subnet 1 (DB/Redis):**
- **Subnet name:** `techaasvik-private-1a`
- **Availability Zone:** `ap-south-1a`
- **IPv4 CIDR:** `10.0.10.0/24`

**Private Subnet 2 (DB/Redis):**
- **Subnet name:** `techaasvik-private-1b`
- **Availability Zone:** `ap-south-1b`
- **IPv4 CIDR:** `10.0.11.0/24`

### 1.3 — Internet Gateway

> **AWS Console path:** `VPC` → `Internet Gateways` → `Create`

1. Left panel → **Internet Gateways** → **Create internet gateway**
2. **Name:** `techaasvik-igw`
3. Create → then **Actions** → **Attach to VPC** → select `techaasvik-vpc`

### 1.4 — Route Table (Public)

> **AWS Console path:** `VPC` → `Route Tables`

1. Left panel → **Route Tables** → **Create route table**
2. **Name:** `techaasvik-public-rt`  **VPC:** `techaasvik-vpc`
3. After creating, click the route table → **Routes** tab → **Edit routes**
4. **Add route:** Destination `0.0.0.0/0` → Target: **Internet Gateway** → `techaasvik-igw`
5. **Subnet associations** tab → **Edit subnet associations** → check both public subnets

### 1.5 — Security Groups

> **AWS Console path:** `EC2` → `Security Groups` → `Create security group`

#### SG 1: `techaasvik-alb-sg` (Load Balancer)
| Type | Protocol | Port | Source |
|---|---|---|---|
| HTTP | TCP | 80 | 0.0.0.0/0 |
| HTTPS | TCP | 443 | 0.0.0.0/0 |

#### SG 2: `techaasvik-backend-sg` (EC2/NestJS)
| Type | Protocol | Port | Source |
|---|---|---|---|
| Custom TCP | TCP | 3001 | `techaasvik-alb-sg` (SG ID) |
| SSH | TCP | 22 | Your IP only |

#### SG 3: `techaasvik-db-sg` (RDS PostgreSQL)
| Type | Protocol | Port | Source |
|---|---|---|---|
| PostgreSQL | TCP | 5432 | `techaasvik-backend-sg` (SG ID) |

#### SG 4: `techaasvik-redis-sg` (ElastiCache)
| Type | Protocol | Port | Source |
|---|---|---|---|
| Custom TCP | TCP | 6379 | `techaasvik-backend-sg` (SG ID) |

---

## 🗄️ STEP 2 — RDS PostgreSQL Database

> **AWS Console path:** `RDS` → `Databases` → `Create database`

1. Search **`RDS`** in top bar → Click **RDS**
2. Left panel → **Databases** → **Create database**
3. **Choose a database creation method:** Standard create
4. **Engine type:** PostgreSQL
5. **Engine version:** PostgreSQL 16.x (latest)
6. **Templates:** Production (or Free tier for testing)
7. **DB instance identifier:** `techaasvik-db`
8. **Master username:** `adotech_in`
9. **Credentials management:** Self managed
10. **Master password:** `Techaasvik@2026!Secure` ← (same as your .env)
11. **DB instance class:**
    - Dev/staging: `db.t3.micro`
    - Production: `db.t3.medium`
12. **Storage:** 20 GB gp3, enable **Storage autoscaling** (max 100 GB)
13. **Multi-AZ deployment:** Standby instance for production
14. **Connectivity:**
    - **VPC:** `techaasvik-vpc`
    - **Subnet group:** Create new → name `techaasvik-db-subnet-group` → add both private subnets
    - **Public access:** **No**
    - **VPC security group:** `techaasvik-db-sg`
15. **Database name:** `adotech_in`
16. **Backup:** Enable automated backups, `7` days retention
17. Click **Create database** (takes 5–10 minutes)

### 2.1 — Get the RDS Endpoint

1. Click your database → **Connectivity & security** tab
2. Copy the **Endpoint** — looks like:
   `techaasvik-db.xxxxxxxx.ap-south-1.rds.amazonaws.com`
3. Save this — you'll add it to your environment variables

---

## 🔴 STEP 3 — ElastiCache Redis

> **AWS Console path:** `ElastiCache` → `Redis caches` → `Create`

1. Search **`ElastiCache`** → Click **ElastiCache**
2. Left panel → **Redis caches** → **Create Redis cache**
3. **Creation method:** Easy create
4. **Configuration:** Dev/Test → `cache.t3.micro` (or `cache.r6g.large` for production)
5. **Name:** `techaasvik-redis`
6. **Subnet group:** Create new:
   - **Name:** `techaasvik-redis-subnet-group`
   - **VPC:** `techaasvik-vpc`
   - **Subnets:** both private subnets
7. **Security group:** `techaasvik-redis-sg`
8. Disable **In-transit encryption** for internal-only use (or enable if you want full security)
9. Click **Create**

### 3.1 — Get the Redis Endpoint

1. Click your Redis cache → **Cluster details**
2. Copy the **Primary endpoint** — looks like:
   `techaasvik-redis.xxxxxx.0001.aps1.cache.amazonaws.com`

---

## 💻 STEP 4 — EC2 Instance (NestJS Backend)

> **AWS Console path:** `EC2` → `Instances` → `Launch instances`

1. Search **`EC2`** → Click **EC2**
2. Left panel → **Instances** → **Launch instances**

### Instance Configuration:

- **Name:** `techaasvik-backend`
- **AMI:** Ubuntu Server 24.04 LTS (HVM), SSD Volume Type ← click **Browse more AMIs** if not shown
- **Architecture:** 64-bit (x86)
- **Instance type:** `t3.medium` (2 vCPU, 4 GB RAM)
- **Key pair:** Click **Create new key pair**
  - **Name:** `techaasvik-key`
  - **Type:** RSA
  - **Format:** `.pem`
  - Download and **save this file** securely — you cannot re-download it!
- **Network settings:**
  - **VPC:** `techaasvik-vpc`
  - **Subnet:** `techaasvik-public-1a`
  - **Auto-assign public IP:** Enable
  - **Security group:** Select existing → `techaasvik-backend-sg`
- **Storage:** 20 GB gp3
- Click **Launch instance**

### 4.1 — Connect to EC2 via SSH

From your local Windows machine (PowerShell):

```powershell
# Move key to a safe location first
Move-Item "$env:USERPROFILE\Downloads\techaasvik-key.pem" "$env:USERPROFILE\.ssh\"

# SSH into instance (replace IP with your EC2 public IP from console)
ssh -i "$env:USERPROFILE\.ssh\techaasvik-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
```

### 4.2 — Install Dependencies on EC2

Run these commands on the EC2 instance (via SSH):

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Verify
node --version   # should be v22.x
npm --version

# 4. Install PM2 (process manager — keeps app alive after SSH disconnect)
sudo npm install -g pm2

# 5. Install git
sudo apt install -y git

# 6. Verify PostgreSQL client (for testing connection)
sudo apt install -y postgresql-client
```

### 4.3 — Deploy Backend Code

```bash
# Create app directory
mkdir -p /home/ubuntu/techaasvik
cd /home/ubuntu/techaasvik

# Option A: Upload from your local machine (run this locally in PowerShell)
# scp -i "$env:USERPROFILE\.ssh\techaasvik-key.pem" -r "C:\Users\Wall\Desktop\adometa.techaasvik.in\backend" ubuntu@<EC2_IP>:/home/ubuntu/techaasvik/

# Option B: Clone from GitHub (recommended for continuous deployment)
git clone https://github.com/YOUR_REPO/techaasvik.git .
cd backend
```

### 4.4 — Create Production .env on EC2

```bash
# On EC2 — create the environment file
nano /home/ubuntu/techaasvik/backend/.env
```

Paste the following (replace placeholders with your actual values):

```dotenv
# ============================
# DATABASE — Use RDS Endpoint
# ============================
DB_HOST=techaasvik-db.xxxxxxxx.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=adotech_in
DB_USER=adotech_in
DB_PASSWORD=Techaasvik@2026!Secure
DATABASE_URL=postgresql://adotech_in:Techaasvik@2026!Secure@techaasvik-db.xxxxxxxx.ap-south-1.rds.amazonaws.com:5432/adotech_in

# ============================
# REDIS — Use ElastiCache Endpoint
# ============================
REDIS_HOST=techaasvik-redis.xxxxxx.0001.aps1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://techaasvik-redis.xxxxxx.0001.aps1.cache.amazonaws.com:6379

# ============================
# APP
# ============================
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://app.techaasvik.in
API_URL=https://api.techaasvik.in

# ============================
# AUTH / SECURITY (copy from local .env)
# ============================
JWT_SECRET=e75d78a491321125893c0fe1c5e692425ae2ac8d90aee369b32d0453316941b5d7ba3b5b3ccec0d3751ddb58de4b879115b09babfc344a1b9438a8348eeecbac
JWT_REFRESH_SECRET=7f6dfdf619d96950d2a0b1e90f1397c78d2f41f364744845956290a0018b8c2a6d37b1444bedae05dfb3e973d51e4e1e7af6445ce5634071a42de3a66d292441
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
ENCRYPTION_MASTER_KEY=f/jpuFYKexZrQLjhFRj66SJpLuKwSMrOWVN7Xmv2N0Y=
ENCRYPTION_ALGORITHM=aes-256-gcm

# ============================
# META WHATSAPP
# ============================
META_APP_ID=1260080565960830
META_APP_SECRET=fb55eca8346b9ef14cb281e7237751ab
META_CONFIG_ID=1382728500014228
META_REDIRECT_URI=https://app.techaasvik.in/oauth/callback
META_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token_here
META_API_VERSION=v18.0

# ============================
# PAYMENT GATEWAYS
# ============================
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=live

# ============================
# SUPER ADMIN
# ============================
SUPER_ADMIN_EMAIL=admin@techaasvik.com
SUPER_ADMIN_PASSWORD=Admin@Techaasvik2026!

# ============================
# CORS
# ============================
CORS_ORIGIN=https://app.techaasvik.in
CORS_CREDENTIALS=true

# ============================
# LOGGING
# ============================
LOG_LEVEL=warn
DEFAULT_MESSAGE_RETENTION_DAYS=90
DEFAULT_MAX_MESSAGES_PER_CONTACT_PER_DAY=10
```

### 4.5 — Build and Start Backend

```bash
cd /home/ubuntu/techaasvik/backend

# Install dependencies
npm install

# Build production bundle
npm run build

# Run DB migrations
node run-billing-migration.js
node run-team-migration.js

# Start with PM2
pm2 start dist/main.js --name "techaasvik-api" --max-memory-restart 1G

# Save PM2 config (auto-restarts on reboot)
pm2 save
pm2 startup
# → Copy and run the command it outputs (starts with "sudo env PATH=...")

# View logs
pm2 logs techaasvik-api
```

### 4.6 — Verify Backend is Running

```bash
curl http://localhost:3001/api/health
# Expected: {"status":"ok"} or similar
```

---

## ⚖️ STEP 5 — Application Load Balancer + Target Group

> **AWS Console path:** `EC2` → `Load Balancers` → `Create load balancer`

### 5.1 — Create Target Group

1. EC2 → Left panel → **Target Groups** → **Create target group**
2. **Target type:** Instances
3. **Target group name:** `techaasvik-backend-tg`
4. **Protocol:** HTTP
5. **Port:** `3001`
6. **VPC:** `techaasvik-vpc`
7. **Health check:**
   - **Protocol:** HTTP
   - **Path:** `/api/health`
   - **Healthy threshold:** 2
   - **Interval:** 30 seconds
8. Click **Next** → select your EC2 instance → **Include as pending below** → **Create target group**

### 5.2 — Create ALB

1. EC2 → Left panel → **Load Balancers** → **Create load balancer**
2. Choose **Application Load Balancer** → **Create**
3. **Load balancer name:** `techaasvik-alb`
4. **Scheme:** Internet-facing
5. **IP address type:** IPv4
6. **VPC:** `techaasvik-vpc`
7. **Mappings:** Check both public subnets (`techaasvik-public-1a`, `techaasvik-public-1b`)
8. **Security group:** `techaasvik-alb-sg`
9. **Listeners:**
   - HTTP:80 → Forward to `techaasvik-backend-tg`
   - (HTTPS:443 listener will be added after SSL setup in Step 7)
10. Click **Create load balancer**
11. Copy the **DNS name** — looks like `techaasvik-alb-xxx.ap-south-1.elb.amazonaws.com`

---

## 🪣 STEP 6 — S3 Bucket (File Uploads / Assets)

> **AWS Console path:** `S3` → `Create bucket`

1. Search **`S3`** → Click **S3** → **Create bucket**
2. **Bucket name:** `techaasvik-uploads` (must be globally unique — add `-prod` if taken)
3. **Region:** `ap-south-1`
4. **Object Ownership:** ACLs disabled
5. **Block Public Access:** Keep all blocked (CloudFront will serve files)
6. Click **Create bucket**

### 6.1 — Update Backend to Use S3

Add these variables to your EC2 `.env`:

```dotenv
AWS_REGION=ap-south-1
AWS_S3_BUCKET=techaasvik-uploads
AWS_ACCESS_KEY_ID=<your_iam_access_key>
AWS_SECRET_ACCESS_KEY=<your_iam_secret_key>
```

> **To get IAM keys:** IAM → Users → `techaasvik-deployer` → **Security credentials** tab → **Create access key** → use case: Application running outside AWS → download CSV

---

## 🌐 STEP 7 — Domain, SSL Certificate & Route 53

### 7.1 — Register or Transfer Domain

> **AWS Console path:** `Route 53` → `Registered Domains` OR `Hosted Zones`

If your domain is elsewhere (GoDaddy, Namecheap, etc.):
1. Search **`Route 53`** → Click **Route 53**
2. Left panel → **Hosted zones** → **Create hosted zone**
3. **Domain name:** `techaasvik.in`
4. **Type:** Public hosted zone
5. Create → you'll get 4 NS (nameserver) records
6. Go to your domain registrar (GoDaddy/Namecheap) → update nameservers to these 4 AWS NS values
7. ⚠️ DNS propagation takes 24–48 hours

### 7.2 — Request SSL Certificate (Free from ACM)

> **AWS Console path:** `Certificate Manager` → `Request certificate`

1. Search **`Certificate Manager`** → Click **ACM**
2. **Request a certificate** → **Request a public certificate**
3. **Fully qualified domain names:**
   ```
   techaasvik.in
   *.techaasvik.in
   api.techaasvik.in
   app.techaasvik.in
   ```
4. **Validation method:** DNS validation
5. Click **Request**
6. Click the certificate → **Create DNS records in Route 53** button → Confirm
7. Wait 5 minutes — status changes to **Issued**

### 7.3 — Add HTTPS Listener to ALB

> **AWS Console path:** `EC2` → `Load Balancers` → Select ALB → `Listeners` tab

1. EC2 → Load Balancers → `techaasvik-alb`
2. **Listeners** tab → **Add listener**
3. **Protocol:** HTTPS
4. **Port:** 443
5. **Default actions:** Forward to `techaasvik-backend-tg`
6. **Default SSL/TLS certificate:** Select `techaasvik.in` from ACM
7. Click **Add**

Also redirect HTTP → HTTPS:
1. Edit the **HTTP:80** listener
2. Change **Default action** to: **Redirect** → HTTPS → port 443

### 7.4 — Create DNS Records in Route 53

> **AWS Console path:** `Route 53` → `Hosted Zones` → `techaasvik.in` → `Create record`

**Record 1 — API subdomain (→ ALB):**
- **Record name:** `api`
- **Record type:** A
- **Alias:** Yes
- **Route traffic to:** Application and Classic Load Balancer → `ap-south-1` → `techaasvik-alb`

**Record 2 — Frontend (→ Vercel/Amplify — see Step 8):**
- **Record name:** `app`
- **Record type:** CNAME
- **Value:** (from Vercel/Amplify — see Step 8)

**Record 3 — Root domain (→ frontend):**
- **Record name:** (blank)
- **Record type:** A
- **Alias:** Yes → to CloudFront distribution (see Step 9)

---

## 🚀 STEP 8 — Frontend Deployment (Next.js)

### Option A: Vercel (Recommended — Free for most use)

1. Go to **https://vercel.com** → Sign up / Login
2. **New Project** → Import Git repository
3. **Framework preset:** Next.js (auto-detected)
4. **Root directory:** `frontend`
5. **Environment variables** — Click **Add variable** for each:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://api.techaasvik.in/api` |
   | `NEXT_PUBLIC_RAZORPAY_KEY_ID` | `rzp_live_...` |

6. Click **Deploy**
7. After deploy → **Settings** → **Domains** → Add `app.techaasvik.in`
8. Vercel will give you a **CNAME value** → add it to Route 53 (Step 7.4 Record 2)

### Option B: AWS Amplify

> **AWS Console path:** `Amplify` → `New app` → `Host web app`

1. Search **`Amplify`** → Click **AWS Amplify**
2. **Host your web app** → Connect to GitHub / GitLab / Bitbucket
3. **Repository:** your repo → **Branch:** `main`
4. **App settings:**
   - **App name:** `techaasvik-frontend`
   - **Build and test settings** — paste this `amplify.yml`:

   ```yaml
   version: 1
   applications:
     - frontend:
         phases:
           preBuild:
             commands:
               - cd frontend
               - npm ci
           build:
             commands:
               - npm run build
         artifacts:
           baseDirectory: frontend/.next
           files:
             - '**/*'
         cache:
           paths:
             - frontend/node_modules/**/*
       appRoot: frontend
   ```

5. **Environment variables:**
   - `NEXT_PUBLIC_API_URL` = `https://api.techaasvik.in/api`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID` = `rzp_live_...`
6. **Deploy** → then **Domain management** → add `app.techaasvik.in`

---

## ⚡ STEP 9 — CloudFront CDN (Optional but Recommended)

> **AWS Console path:** `CloudFront` → `Create distribution`

Used to serve your frontend fast globally and protect your origin.

1. Search **`CloudFront`** → Click **CloudFront**
2. **Create distribution**
3. **Origin domain:** Select your ALB (`techaasvik-alb-xxx.ap-south-1.elb.amazonaws.com`)
4. **Protocol:** HTTPS only
5. **Cache policy:** `CachingDisabled` for API, `CachingOptimized` for frontend
6. **Viewer protocol policy:** Redirect HTTP to HTTPS
7. **Alternate domain names (CNAMEs):** `techaasvik.in`, `app.techaasvik.in`
8. **Custom SSL certificate:** Select `techaasvik.in` from ACM
9. **Create distribution**
10. Copy the **Distribution domain name** (`xxx.cloudfront.net`) → use in Route 53

---

## 🔔 STEP 10 — WhatsApp Webhook Update (Meta Developer Console)

After deployment, update Meta with your production URLs:

1. Go to **https://developers.facebook.com** → Your App
2. Left menu → **WhatsApp** → **Configuration** (or **Webhooks**)
3. **Webhook URL:** `https://api.techaasvik.in/api/webhooks/whatsapp`
4. **Verify token:** Same as `META_WEBHOOK_VERIFY_TOKEN` in your `.env`
5. Click **Verify and save**
6. Subscribe to: `messages`, `message_status`, `message_template_status_update`

Also update **Redirect URI** for OAuth:

1. Left menu → **WhatsApp** → **Embedded Signup** (or **OAuth**)
2. **Valid OAuth Redirect URIs:** `https://app.techaasvik.in/oauth/callback`
3. Also update in your `.env` → `META_REDIRECT_URI=https://app.techaasvik.in/oauth/callback`

Also update **Razorpay Webhook:**

1. Go to **https://dashboard.razorpay.com** → **Settings** → **Webhooks**
2. **Webhook URL:** `https://api.techaasvik.in/api/webhooks/razorpay`
3. Events to subscribe: `payment.captured`, `payment.failed`, `order.paid`

---

## 📊 STEP 11 — CloudWatch Monitoring & Alerts

> **AWS Console path:** `CloudWatch` → `Alarms` → `Create alarm`

### 11.1 — EC2 CPU Alert

1. Search **`CloudWatch`** → Click **CloudWatch**
2. Left panel → **Alarms** → **All alarms** → **Create alarm**
3. **Select metric** → EC2 → Per-Instance Metrics → `CPUUtilization` for your instance
4. **Conditions:** Greater than `80` for `5` minutes
5. **Actions:** Send notification → **Create new SNS topic**
   - **Topic name:** `techaasvik-alerts`
   - **Email:** your email
6. **Alarm name:** `techaasvik-high-cpu`
7. Create alarm → check email → **confirm SNS subscription**

### 11.2 — RDS Storage Alert

Same process, but select:
- **Metric:** RDS → Per-Database Metrics → `FreeStorageSpace`
- **Condition:** Less than `5000000000` bytes (5 GB)
- **Alarm name:** `techaasvik-db-low-storage`

---

## 💾 STEP 12 — EC2 Automated Backups (Snapshots)

> **AWS Console path:** `EC2` → `Lifecycle Manager` → `Create lifecycle policy`

1. EC2 → Left panel scroll down → **Elastic Block Store** → **Lifecycle Manager**
2. **Create lifecycle policy** → **EBS Snapshot Policy**
3. **Resource type:** Volume
4. **Target resource tags:** Add tag `Name = techaasvik-backend`
5. **Policy schedules:**
   - **Frequency:** Daily
   - **Time:** `02:00 UTC`
   - **Retain:** `7` snapshots
6. Create policy

---

## 🔄 STEP 13 — Auto-Deploy on Code Push (GitHub Actions CI/CD)

Create this file in your project:

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    name: Deploy NestJS Backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to EC2
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /home/ubuntu/techaasvik
            git pull origin main
            cd backend
            npm install
            npm run build
            pm2 restart techaasvik-api
            pm2 save
```

### Add GitHub Secrets

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Add:
   - `EC2_HOST` = your EC2 public IP
   - `EC2_SSH_KEY` = contents of `techaasvik-key.pem` file

---

## ✅ STEP 14 — Final Verification Checklist

After all steps above, verify everything is working:

```bash
# 1. Backend health check
curl https://api.techaasvik.in/api/health

# 2. Swagger docs accessible
# Open browser: https://api.techaasvik.in/api/docs

# 3. Login test
curl -X POST https://api.techaasvik.in/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@techaasvik.com","password":"Admin@Techaasvik2026!"}'

# 4. Frontend loads
# Open browser: https://app.techaasvik.in

# 5. Meta webhook test
# Meta Developer Console → Test webhook → send test event
```

---

## 🗺️ Quick Reference — AWS Console Navigation Paths

| What you need | Path in AWS Console |
|---|---|
| Create EC2 instance | `EC2` → `Instances` → `Launch instances` |
| SSH key management | `EC2` → `Key Pairs` |
| Security Groups | `EC2` → `Security Groups` |
| Load Balancers | `EC2` → `Load Balancers` |
| Target Groups | `EC2` → `Target Groups` |
| RDS Database | `RDS` → `Databases` → `Create database` |
| Redis Cache | `ElastiCache` → `Redis caches` → `Create` |
| S3 Bucket | `S3` → `Create bucket` |
| SSL Certificate | `Certificate Manager` → `Request certificate` |
| DNS Records | `Route 53` → `Hosted zones` → your domain → `Create record` |
| CDN Distribution | `CloudFront` → `Create distribution` |
| Frontend hosting | `Amplify` → `New app` |
| Monitoring alerts | `CloudWatch` → `Alarms` → `Create alarm` |
| IAM Users | `IAM` → `Users` |
| Billing/Cost | `Billing` → `Bills` (top right → account name) |

---

## ⚠️ Production Security Checklist

- [ ] Change `SUPER_ADMIN_PASSWORD` from default value
- [ ] Generate NEW `JWT_SECRET` and `ENCRYPTION_MASTER_KEY` for production (never reuse dev keys)
- [ ] RDS is in **private subnet** with no public access
- [ ] Redis is in **private subnet** with no public access
- [ ] EC2 SSH port 22 locked to your IP only in security group
- [ ] All secrets stored as **AWS Secrets Manager** entries (not just `.env`)
- [ ] CloudWatch alarms set up for CPU, memory, and DB storage
- [ ] S3 bucket NOT publicly accessible (files served via CloudFront only)
- [ ] HTTPS enforced everywhere (HTTP → HTTPS redirect on ALB)
- [ ] Meta webhook verify token is a strong random string
- [ ] Razorpay webhook secret is set and verified

---

## 💡 Cost Optimization Tips

1. Use **Reserved Instances** for EC2 and RDS (1-year term = 30–40% cheaper)
2. Use **Savings Plans** for flexible compute savings
3. Enable **RDS storage autoscaling** to avoid over-provisioning
4. Set **CloudWatch billing alarms** at $50, $100, $200 thresholds:
   - `Billing` (or `CloudWatch`) → `Alarms` → Create alarm → Billing → Total Estimated Charge
5. Regularly review **AWS Cost Explorer** (`Billing` → `Cost Explorer`)

---

*Document generated: February 2026 · For Techaasvik (adometa.techaasvik.in)*
*Stack: Next.js 16 + NestJS 11 + PostgreSQL 16 + Redis + Bull Queues*

# Student360 AI — Enterprise Production Deployment Guide

This guide details the step-by-step procedure for deploying **Student360 AI** to a production environment using a Node.js host (Render / Railway / AWS EC2 / Vercel) paired with a managed PostgreSQL database and cloud object storage.

---

## 1. Prerequisites & Infrastructure Setup

1. **Managed PostgreSQL Database**: Provision a PostgreSQL 14+ database cluster (AWS RDS, Render PostgreSQL, Supabase, Neon, or Railway).
2. **Cloud Object Storage**: Provision an S3-compatible bucket (AWS S3, Cloudinary, or Azure Blob) for persistent certificate/document uploads.
3. **Domain & HTTPS Certificate**: TLS/SSL certificate enabled for secure HTTP-only session cookies and service worker registration.

---

## 2. Production Environment Variables (`.env`)

Populate environment variables on your production hosting provider:

```env
# 1. DATABASE
DATABASE_URL="postgresql://student360_user:SecurePassword123@postgres-host.rds.amazonaws.com:5432/student360_prod?schema=public&sslmode=require"

# 2. SECURITY SECRETS (32+ Character Random Strings)
JWT_SECRET="e9a8f3b2c1d0e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9"
AUTH_SECRET="a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
SESSION_SECRET="c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8"
CRON_SECRET="cron_sec_8f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c"

# 3. STORAGE ABSTRACTION
STORAGE_PROVIDER="S3_COMPATIBLE"
STORAGE_AWS_S3_BUCKET="student360-prod-documents"
STORAGE_AWS_REGION="ap-south-1"
STORAGE_AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
STORAGE_AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# 4. EMAIL SMTP
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="SG.ProductionApiKeyHere"
SMTP_FROM="Student360 AI <notifications@student360.edu>"

# 5. METADATA
APP_URL="https://student360.institution.edu"
NODE_ENV="production"
```

---

## 3. Database Migration & Deployment Execution

```bash
# Step 1: Install dependencies
npm ci

# Step 2: Deploy tracked Prisma migrations to PostgreSQL (Zero Data Loss)
npx prisma migrate deploy

# Step 3: Build production Next.js bundle
npm run build

# Step 4: Start production server
npm run start
```

---

## 4. Initial Super Admin Seeding

To seed the initial Super Admin account safely without overwriting production records:
```bash
node prisma/seed.js
```
Default Super Admin Credentials:
- **Email**: `admin@student360.edu`
- **Password**: `Admin@1234`
*(Important: Log in immediately upon first launch and change the default password).*

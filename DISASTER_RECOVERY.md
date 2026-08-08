# Disaster Recovery & System Backup Guide

## Executive Summary

The **Student360 AI Admin Panel & Student Portal** architecture decouples application source code from persistent database storage:

- **Source Code**: Stored and version-controlled in Git on GitHub (`https://github.com/harisaran0527-glitch/student360-ai.git`).
- **Production Database**: Hosted on **Supabase Cloud PostgreSQL**.
- **File Assets**: Uploads stored in **Supabase Cloud Storage**.
- **Deployment Platform**: Hosted on **Netlify Serverless**.

---

## 1. Laptop Loss / System Replacement Recovery Steps

If your laptop is lost, damaged, reinstalled, or replaced, **no production data is lost**. Follow these exact steps to restore the full application and developer workspace:

### Step 1: Install Prerequisites
1. Download and install **Git**: `https://git-scm.com/downloads`
2. Download and install **Node.js (LTS v18 or v20)**: `https://nodejs.org/`

### Step 2: Clone the GitHub Repository
Open terminal/PowerShell and clone the repository:
```bash
git clone https://github.com/harisaran0527-glitch/student360-ai.git
cd student360-ai
```

### Step 3: Install Dependencies
Install all required Node modules:
```bash
npm install
```

### Step 4: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in the `.env` file using your production credentials from **Netlify** or **Supabase Dashboard**:

| Variable Name | Description | Source |
| :--- | :--- | :--- |
| `DATABASE_URL` | Transaction Pooler connection string (Port 6543) | Supabase Dashboard → Settings → Database |
| `DIRECT_URL` | Direct connection string (Port 5432) | Supabase Dashboard → Settings → Database |
| `JWT_SECRET` | 32+ character random secret string | Netlify Environment Variables |
| `CLOUD_STORAGE_PROVIDER` | Set to `SUPABASE` for production | Environment setting |
| `SUPABASE_URL` | Supabase Project API URL | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Secret Key | Supabase Dashboard → Settings → API |
| `SUPABASE_BUCKET` | Storage bucket name (`student360-assets`) | Supabase Dashboard → Storage |
| `CRON_SECRET` | Random secret key for scheduled tasks | Netlify Environment Variables |

### Step 5: Generate Prisma Client
Generate the Prisma database client:
```bash
npx prisma generate
```

### Step 6: Launch Development Server
Start the local application server:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser. All existing production data (Admin accounts, departments, subjects, batches) will immediately load directly from Supabase Cloud.

---

## 2. Automated Manual Data Backup Command

To create a complete local JSON export of all database tables:

```bash
npm run backup:data
```

This exports 14 entity categories into a timestamped folder under `backups/YYYY-MM-DD-HH-mm/`:
- Users (excluding sensitive password hashes)
- Student Profiles
- Academic Years
- Batches
- Departments
- Courses / Syllabus
- Attendance & Attendance Sessions
- Certificates
- Internships
- Projects
- Placement Records
- Notifications
- Audit Logs
- Metadata Summary (`metadata.json`)

---

## 3. Data Restore Command

If the cloud database is ever compromised or needs to be restored to a specific backup checkpoint:

### Step 1: Validate Backup Folder
```bash
npm run restore:data -- <backup-folder-name>
```
*Example:*
```bash
npm run restore:data -- 2026-08-08-14-23
```
This validates the backup structure and displays a safety prompt.

### Step 2: Execute Safe Restore Transaction
```bash
npm run restore:data -- <backup-folder-name> --confirm
```
*Example:*
```bash
npm run restore:data -- 2026-08-08-14-23 --confirm
```
This executes a safe Prisma database transaction:
- Preserves existing records without silent overwrite.
- Maintains strict relational foreign key order.
- Reports imported vs. skipped record counts.

---

## 4. Netlify & Supabase Cloud Deployment Recovery

### Netlify Deployment Recovery
1. Log into **Netlify Console**: `https://app.netlify.com`
2. Link the GitHub repository (`harisaran0527-glitch/student360-ai`).
3. Set build command: `prisma generate && next build`
4. Set publish directory: `.next`
5. Input environment variables from your secure credentials store.

### Supabase Cloud Backup Notes
- Supabase automatically performs daily Point-In-Time (PITR) PostgreSQL database backups.
- You can access database backups anytime via **Supabase Dashboard → Database → Backups**.

---

## 5. Security & Data Protection Rules

1. **`.env`** files are ignored by Git and will NEVER be committed.
2. **Password hashes** are excluded from backup JSON exports.
3. Database connection parameters use encrypted SSL/TLS connections (`sslmode=require`).

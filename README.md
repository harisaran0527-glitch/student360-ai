# Student360 AI — Enterprise Student Lifecycle & Digital Record Management System

[![Build Status](https://img.shields.io/badge/Next.js-14.2.5-blue.svg)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Prisma-5.22.0-indigo.svg)](https://www.prisma.io/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-emerald.svg)](public/manifest.json)
[![Security Hardened](https://img.shields.io/badge/Security-Hardened-sky.svg)](SECURITY.md)

**Student360 AI** is an enterprise-grade, full-stack Student Lifecycle, Attendance, Internship, Digital Portfolio, and Institutional Analytics Management System built with Next.js 14, Tailwind CSS, Prisma ORM, and explainable AI/ML intelligence engines.

---

## Architecture & Subsystems

1. **Admin Portal**: Executive Analytics Hub, Central Reporting Center (13 Categories, CSV/Excel/PDF exports), Student Master Directory, Batch Progression, Alumni Directory, Placement Drives, Audit Logs, and PWA Diagnostics.
2. **Faculty Portal**: Attendance Marking (mobile/tablet optimized), Academic Grading, Verification Queue (Certificates, Projects, Achievements), and Authorized Department Scope Analytics.
3. **Student Portal**: Master Digital Profile, Academics & CGPA, Attendance Center, Internships & NOC Records, Certificate Vault, Achievements, Projects Showcase, Skills Matrix & Passport, AI Career Center, Auto Resume Builder, and Campus Feed.
4. **Explainable AI Intelligence Layer**: All 8 AI engines operate deterministically on **Rule-Based Engine v1.0**. Zero fabricated scores, zero fake confidence percentages, and zero fake ML predictions.
5. **Installable PWA & Mobile UX**: Web App Manifest, Service Worker static shell caching, offline fallback (`/offline.html`), Android Chrome install prompt, iOS Safari "Add to Home Screen" instructions, and network status banners.
6. **Security & Production Readiness**: bcrypt password hashing, HTTP-only secure cookies, login rate limiting, server-side role/scope authorization, Aadhaar masking, CSV formula injection defense, storage abstraction, and PostgreSQL migration support.

---

## Explainable AI/ML Honesty Statement

> [!IMPORTANT]
> **No Fake AI Predictions**: Student360 AI explicitly identifies all AI recommendations and support attention scores as **"Rule-Based Insight — Engine v1.0"**. Inputs, decision logic, and limitations are fully displayed to users. Optional Python ML training pipeline scripts are provided in [`ml/`](file:///c:/Users/ELCOT/OneDrive/Desktop/AI&ML/ml/) for future institutional dataset training.

---

## Local Development Quickstart

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Initialize Local Database & Seed Demo Data
```bash
# Push SQLite dev schema
npx prisma db push

# Seed Super Admin, Faculty, Student, and default Career Roles
node prisma/seed.js
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo Login Credentials (Development Only)

> [!WARNING]
> These demo accounts are created by `prisma/seed.js` for local development evaluation only. Change default passwords upon production deployment.

| Role | Email | Default Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@student360.edu` | `Admin@1234` | Institution-Wide Access |
| **Faculty** | `faculty@student360.edu` | `Faculty@1234` | Assigned Department Scope |
| **Student** | `student@student360.edu` | `Student@1234` | Personal Self-Only Profile |

---

## Master Documentation Index

- [`FEATURE_STATUS.md`](FEATURE_STATUS.md): Complete 24-subsystem feature categorization matrix.
- [`DEPLOYMENT.md`](DEPLOYMENT.md): Production deployment guide (PostgreSQL, Object Storage, Vercel/Render, SMTP).
- [`DEMO_GUIDE.md`](DEMO_GUIDE.md): 5–10 minute presentation sequence for institutional evaluators.
- [`TESTING_REPORT.md`](TESTING_REPORT.md): Audit report across 24 security and functional scenarios.
- [`DATABASE_MIGRATION.md`](DATABASE_MIGRATION.md): PostgreSQL migration workflow and Prisma commands.
- [`BACKUP_AND_RESTORE.md`](BACKUP_AND_RESTORE.md): `pg_dump`, `pg_restore`, GPG encryption commands.
- [`DATA_RETENTION_POLICY.md`](DATA_RETENTION_POLICY.md): 10+ year retention policy and restricted deletion rules.
- [`SECURITY.md`](SECURITY.md): Authentication, cookie security, Aadhaar masking, and CSV injection defenses.
- [`PRODUCTION_ENVIRONMENT.md`](PRODUCTION_ENVIRONMENT.md): Environment validation and security headers.
- [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md): Playbooks for account compromise and credential rotation.
- [`PWA_SETUP.md`](PWA_SETUP.md): Web App Manifest, Service Worker caching boundaries, and HTTPS rules.
- [`APP_INSTALLATION_GUIDE.md`](APP_INSTALLATION_GUIDE.md): Android, iOS, and Desktop installation steps.
- [`MOBILE_UX.md`](MOBILE_UX.md): Mobile and tablet UX responsiveness patterns.
- [`PUSH_NOTIFICATIONS.md`](PUSH_NOTIFICATIONS.md): VAPID key architecture and web push endpoints.

---

## Production Deployment Commands

```bash
# 1. Deploy tracked migrations to production PostgreSQL
npx prisma migrate deploy

# 2. Build optimized Next.js production bundle
npm run build

# 3. Start production server
npm run start
```

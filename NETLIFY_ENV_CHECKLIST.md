# Student360 AI — Netlify Environment Variables Checklist

This checklist guides you step-by-step through setting up Environment Variables in Netlify for **Student360 AI**.

> ⚠️ **SECURITY NOTICE**: Never paste secret values directly into markdown files or git commits. Enter all values strictly inside the Netlify Dashboard.

---

## 📊 Environment Variable Reference Table

| Variable Name | Where to copy the value from | Required / Optional | Already available locally in `.env`? |
|---|---|---|---|
| `NODE_ENV` | Type `production` manually | **Required** | NO (Set to `production` in Netlify) |
| `DATABASE_URL` | Local `.env` file OR Supabase Dashboard → Project Settings → Database → Connection string (URI mode) | **Required** | **YES** |
| `JWT_SECRET` | Local `.env` file | **Required** | **YES** |
| `CLOUD_STORAGE_PROVIDER` | Type `SUPABASE` manually | **Required** (for production file uploads) | NO (Set to `SUPABASE` in Netlify) |
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL | **Required** (for production file uploads) | NO (Copy from Supabase Dashboard) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → `service_role` key (secret) | **Required** (for production file uploads) | NO (Copy from Supabase Dashboard) |
| `SUPABASE_BUCKET` | Type `student360-assets` (or the name of your bucket created in Supabase Storage) | **Required** (for production file uploads) | NO (Set to `student360-assets` in Netlify) |
| `APP_URL` | Netlify Dashboard → Site overview URL (e.g. `https://student360-ai.netlify.app`) | Post-Deploy | NO (Add after first deployment) |
| `ADMIN_JWT_SECRET` | Not used in codebase | Not Required | NO |
| `CRON_SECRET` | Any random secret string (e.g. `student360_cron_2026`) | Optional | NO |
| `SMTP_HOST` | Email Provider (e.g. `smtp.gmail.com`) | Optional | NO |
| `SMTP_PORT` | Email Provider (e.g. `587`) | Optional | NO |
| `SMTP_USER` | Email Username | Optional | NO |
| `SMTP_PASS` | Email App Password | Optional | NO |
| `SMTP_FROM` | Sender display string (e.g. `Student360 AI <noreply@institution.edu>`) | Optional | NO |

---

## 🛠️ Safe Local Status Inspector Script

Run this command anytime in your local terminal to check which variables are present locally without exposing secrets:

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/show-netlify-env-status.ps1"
```

# Student360 AI — Netlify Environment Variables Checklist

This checklist guides you step-by-step through setting up Environment Variables in Netlify for **Student360 AI**.

> ⚠️ **SECURITY NOTICE**: Never paste secret values directly into markdown files or git commits. Enter all values strictly inside the Netlify Dashboard.

---

## 📊 Environment Variable Reference Table

| Variable Name | Where to copy the value from | Required / Optional | Description |
|---|---|---|---|
| `NODE_ENV` | Type `production` manually | **Required** | Production environment flag |
| `DATABASE_URL` | Supabase Dashboard → Project Settings → Database → **Transaction Pooler** (Port 6543, URI mode) | **Required** | Serverless pooled connection: `postgresql://postgres.<REF>:<PASS>@<HOST>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require` |
| `DIRECT_URL` | Supabase Dashboard → Project Settings → Database → **Session / Direct Connection** (Port 5432, URI mode) | **Required for migrations** | Direct connection: `postgresql://postgres:<PASS>@db.<REF>.supabase.co:5432/postgres?sslmode=require` |
| `JWT_SECRET` | Local `.env` file | **Required** | 32+ character random secret string |
| `CLOUD_STORAGE_PROVIDER` | Type `SUPABASE` manually | **Required** | Production storage provider |
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL | **Required** | e.g. `https://<REF>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → `service_role` key | **Required** | Secret service role API key |
| `SUPABASE_BUCKET` | Type `student360-assets` (or your bucket name) | **Required** | Storage bucket name |
| `APP_URL` | Netlify Dashboard → Site overview URL | Post-Deploy | e.g. `https://student360-ai.netlify.app` |
| `CRON_SECRET` | Any random secret string | Optional | Cron authorization key |

---

## 🛠️ Safe Local Status Inspector Script

Run this command anytime in your local terminal to check which variables are present locally without exposing secrets:

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/show-netlify-env-status.ps1"
```

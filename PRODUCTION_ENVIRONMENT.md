# Student360 AI — Production Deployment & Environment Guide

## 1. Startup Environment Validation

The application runs startup environment validation via `src/lib/envValidation.ts`:
- In `NODE_ENV="production"`, critical secrets (`DATABASE_URL`, `JWT_SECRET`, `CRON_SECRET`, `APP_URL`) are verified.
- Application fails safely with explicit diagnostic output if insecure placeholder values are detected.

---

## 2. Production Security Headers

Configured in `next.config.mjs`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

---

## 3. Secret-Protected Cron Endpoints

Scheduled endpoints require `CRON_SECRET` validation using constant-time secret comparison (`crypto.timingSafeEqual` in `src/lib/cronSecurity.ts`).

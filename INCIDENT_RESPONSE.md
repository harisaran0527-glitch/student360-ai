# Student360 AI — Incident Response & Security Playbook

## 1. Account Compromise / Unauthorized Access

1. Invalidate active user session cookies immediately.
2. Force password reset via Super Admin portal.
3. Review `AuditLog` table for actions performed by compromised account ID.

---

## 2. Accidental Record Archiving or Deletion

1. Archived records are non-destructive and can be instantly restored via `/api/students/restore`.
2. Review audit logs for `STUDENT_ARCHIVED` or `RESTRICTED_PERMANENT_DELETION_EXECUTED`.
3. If permanent deletion occurred under Super Admin authorization, execute database point-in-time recovery using off-site GPG-encrypted dumps (see `BACKUP_AND_RESTORE.md`).

---

## 3. Secret Leak or Credential Compromise

1. Rotate `JWT_SECRET`, `AUTH_SECRET`, `SESSION_SECRET`, and `CRON_SECRET` in `.env`.
2. Restart application container to force session re-authentication.

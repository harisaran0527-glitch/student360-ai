# Student360 AI — Enterprise Database & Storage Backup / Restore Policy

## 1. Automated PostgreSQL Backup Schedule

1. **Daily Automated Incremental Backup**: Executed at 01:00 AM UTC via `pg_dump` binary stream.
2. **Weekly Full Backup**: Executed every Sunday at 02:00 AM UTC, encrypted using AES-256 GPG keys.
3. **Monthly Retained Backup**: Retained off-site for multi-year compliance audit requirements.

---

## 2. PostgreSQL Command Specifications

### Daily Full Dump (Compressed & Encrypted)
```bash
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -b -v -f "/var/backups/student360_$(date +%Y%m%d_%H%M%S).dump"

# GPG AES-256 Encryption
gpg --symmetric --cipher-algo AES256 /var/backups/student360_*.dump
```

### Full Database Restore Test
```bash
# Drop existing target test database
dropdb -h $DB_HOST -U $DB_USER student360_restore_test

# Create fresh target database
createdb -h $DB_HOST -U $DB_USER student360_restore_test

# Restore dump
pg_restore -h $DB_HOST -U $DB_USER -d student360_restore_test -v /var/backups/student360_20260802.dump
```

---

## 3. Storage & Document File Backups

Uploaded certificates, internship NOCs, and project reports are stored via the **Storage Abstraction Layer** (`src/lib/storage.ts`):
- All uploaded files store a **SHA-256 Checksum** in the database for integrity validation.
- Daily synchronization script mirrors `/uploads/` directory to off-site S3-compatible cold storage buckets.

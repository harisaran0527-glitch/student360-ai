# Student360 AI — 10+ Year Data Retention & Deletion Policy

## 1. Institutional Record Lifecycle States

Student records transition through four explicit lifecycle states:
1. `ACTIVE`: Pursuing student currently registered in an ongoing batch.
2. `GRADUATED`: Student who completed all academic semester credits.
3. `ALUMNI`: Transitioned to institutional alumni network.
4. `ARCHIVED`: Archived for long-term historical retention.

> [!IMPORTANT]
> **Archiving Never Means Deletion**: Archiving a student record preserves 100% of academic transcripts, attendance logs, internship records, certificate vaults, project showcases, and historical AI snapshots for at least 10 years.

---

## 2. Controlled Deletion Rules

Normal users (Students, Faculty, System Admins) **cannot** permanently delete student profiles.

### Restricted Permanent Deletion Process:
- **Authorization**: `SUPER_ADMIN` role required.
- **Explicit Confirmation**: Requires typing `PERMANENTLY_DELETE_STUDENT_${registerNo}`.
- **Audit Logging**: Mandatory entry in `AuditLog`.
- **Impact Preview**: The system previews affected associated records (Academic Records, Attendance, Internships, Certificates, Projects, Skills, Placements) before execution.

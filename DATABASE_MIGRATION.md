# Student360 AI — PostgreSQL Database Migration Specification & Workflow

## 1. Local Development vs Production Datasource Architecture

Student360 AI uses Prisma ORM with environment-driven datasource configuration:
- **Local Development**: SQLite database engine (`DATABASE_URL="file:./dev.db"`).
- **Production Environment**: Enterprise PostgreSQL database (`DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/student360_db?schema=public&sslmode=require"`).

---

## 2. Migration Workflow Commands

### Local Development Schema Iteration
```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Apply dev schema changes
npx prisma db push
```

### Production Migration Execution (Zero Data Loss)

> [!CAUTION]
> **NEVER** run `prisma db push --accept-data-loss` in production. Always execute tracked schema migrations.

```bash
# Step 1: Create a new migration file during development
npx prisma migrate dev --name init_production_schema

# Step 2: Deploy tracked migrations in production CI/CD deployment pipeline
npx prisma migrate deploy
```

---

## 3. Recommended PostgreSQL Indexing Strategy

Prisma schema maintains explicit performance indexes for high-frequency queries:
- `StudentProfile`: `[registerNo]`, `[rollNo]`, `[departmentId]`, `[batchId]`, `[academicStatus]`
- `Attendance`: `[studentId, courseId, date, session]`
- `AttendanceSession`: `[courseId, sectionId, date, period]`
- `StudentRiskSnapshot`: `[studentId, academicYear, semester]`
- `Notification`: `[deduplicationKey]`

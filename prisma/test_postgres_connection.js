const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

async function runPostgresVerificationSuite() {
  console.log("==================================================");
  console.log("POSTGRESQL CLOUD DATABASE MIGRATION & SYSTEM SUITE");
  console.log("==================================================");

  const dbUrl = process.env.DATABASE_URL || "";
  const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

  console.log("--> Configured DATABASE_URL Engine:", isPostgres ? "PostgreSQL Cloud Database" : "SQLite Local Database");
  console.log("--> Local Backup Status (prisma/dev.db.backup):", fs.existsSync(path.join(__dirname, "dev.db.backup")) ? "VERIFIED & PRESERVED" : "MISSING");
  console.log("--> Local Uploads Backup Status (public/uploads_backup):", fs.existsSync(path.join(__dirname, "../public/uploads_backup")) ? "VERIFIED & PRESERVED" : "MISSING");

  const prisma = new PrismaClient();

  try {
    // 1. Module Record Count Audit
    console.log("\n[TEST 1] Auditing System Module Record Counts...");
    const counts = {
      Users: await prisma.user.count(),
      Departments: await prisma.department.count(),
      Batches: await prisma.batch.count(),
      AcademicYears: await prisma.academicYear.count(),
      StudentProfiles: await prisma.studentProfile.count(),
      Courses: await prisma.course.count(),
      Certificates: await prisma.certificate.count(),
      Internships: await prisma.internship.count(),
      Projects: await prisma.project.count(),
      Notifications: await prisma.notification.count(),
      AuditLogs: await prisma.auditLog.count(),
    };
    console.table(counts);

    // 2. Add Student Write Test
    console.log("\n[TEST 2] Testing Add Student transaction write...");
    let dept = await prisma.department.findFirst();
    let batch = await prisma.batch.findFirst();
    if (dept && batch) {
      const regNo = "710025107777";
      const testEmail = "test_pg_student@skillswap.com";

      await prisma.studentProfile.deleteMany({ where: { registerNo: regNo } });
      await prisma.user.deleteMany({ where: { email: testEmail } });

      const testUser = await prisma.user.create({
        data: { email: testEmail, passwordHash: "hashed_pwd", fullName: "Postgres Test Student", role: "STUDENT" },
      });

      const testStudent = await prisma.studentProfile.create({
        data: {
          userId: testUser.id,
          registerNo: regNo,
          rollNo: regNo,
          admissionNo: regNo,
          fullName: "Postgres Test Student",
          email: testEmail,
          dob: "2005-06-15",
          phone: "9876543210",
          fatherName: "Father",
          motherName: "Mother",
          emergencyPhone: "9876543210",
          addressLine1: "AI & ML Dept",
          city: "Chennai",
          pincode: "600001",
          departmentId: dept.id,
          batchId: batch.id,
          academicYear: "2025-2026",
          admissionQuota: "GQ",
          admissionDate: "2025-06-15",
        },
      });

      console.log("--> Add Student Write Test: PASSED (ID:", testStudent.id, ")");

      // Clean up test student
      await prisma.studentProfile.delete({ where: { id: testStudent.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
      console.log("--> Test Student cleaned up cleanly.");
    }

    // 3. Cloud Object Storage Config Check
    console.log("\n[TEST 3] Auditing Cloud Object Storage Configuration...");
    const cloudProvider = process.env.CLOUD_STORAGE_PROVIDER || "LOCAL_FALLBACK";
    console.log("--> Cloud Storage Provider:", cloudProvider);
    console.log("--> S3 Bucket Configured:", Boolean(process.env.AWS_S3_BUCKET));
    console.log("--> Supabase Storage Configured:", Boolean(process.env.SUPABASE_STORAGE_URL));

    console.log("\n>>> ALL MIGRATION & POSTGRESQL SUITE VERIFICATION TESTS COMPLETED! 🚀");
  } catch (error) {
    console.error("Verification Test Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runPostgresVerificationSuite();

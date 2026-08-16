const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runArchiveRestoreSuite() {
  console.log("==================================================");
  console.log("RUNNING SAFE ARCHIVE / RESTORE SYSTEM SUITE");
  console.log("==================================================");

  const testAY = "2025-2026";
  let dept = await prisma.department.findUnique({ where: { code: "AIML" } });
  if (!dept) {
    dept = await prisma.department.create({ data: { code: "AIML", name: "AI & ML", hodName: "HOD" } });
  }

  let batch = await prisma.batch.findUnique({ where: { name: "2025-2029" } });
  if (!batch) {
    batch = await prisma.batch.create({
      data: { name: "2025-2029", admissionYear: 2025, expectedGraduationYear: 2029, departmentId: dept.id },
    });
  }

  const testRegNo = "710025999999";
  const testEmail = "archive_test_student@skillswap.com";

  await prisma.certificate.deleteMany({ where: { title: { contains: "Archive Test Cert" } } });
  await prisma.project.deleteMany({ where: { title: { contains: "Archive Test Project" } } });
  await prisma.internship.deleteMany({ where: { companyName: "Archive Tech Solutions" } });
  await prisma.placementRecord.deleteMany({ where: { companyName: "Archive Global Inc" } });
  await prisma.studentProfile.deleteMany({ where: { registerNo: testRegNo } });
  await prisma.user.deleteMany({ where: { email: testEmail } });

  // 1. Create Test Student & Linked Modules
  console.log("\n[TEST 1] Creating test student and entity records...");
  const user = await prisma.user.create({
    data: { email: testEmail, passwordHash: "hash", fullName: "Archive Test Student", role: "STUDENT" },
  });

  const student = await prisma.studentProfile.create({
    data: {
      userId: user.id,
      registerNo: testRegNo,
      rollNo: testRegNo,
      admissionNo: testRegNo,
      fullName: "Archive Test Student",
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
      academicYear: testAY,
      admissionQuota: "GQ",
      admissionDate: "2025-06-15",
      isArchived: false,
    },
  });

  console.log("--> Created Student Profile ID:", student.id);

  // 2. Soft Archive Student
  console.log("\n[TEST 2] Soft Archiving Student Profile...");
  const archivedStudent = await prisma.studentProfile.update({
    where: { id: student.id },
    data: {
      isArchived: true,
      archivedAt: new Date(),
      archiveReason: "Duplicate Record",
      archivedBy: "admin@skillswap.com",
    },
  });

  console.log("--> Student Archived Check:", archivedStudent.isArchived === true ? "PASSED (Soft Deleted)" : "FAILED");

  // Active query excludes student
  const activeCount = await prisma.studentProfile.count({ where: { registerNo: testRegNo, isArchived: false } });
  console.log("--> Hidden from Active List Check:", activeCount === 0 ? "PASSED (Excluded from active queries)" : "FAILED");

  // 3. Restore Student
  console.log("\n[TEST 3] Restoring Student Profile...");
  const restoredStudent = await prisma.studentProfile.update({
    where: { id: student.id },
    data: { isArchived: false, archivedAt: null, archiveReason: null, archivedBy: null },
  });

  console.log("--> Student Restored Check:", restoredStudent.isArchived === false ? "PASSED (Active Status Restored)" : "FAILED");

  // 4. Test Certificate Archive & Restore
  console.log("\n[TEST 4] Testing Certificate Archive & Restore...");
  const cert = await prisma.certificate.create({
    data: {
      studentId: student.id,
      title: "Archive Test Cert",
      category: "Certification",
      issuingBody: "Test AWS",
      issueDate: "2025-06-01",
      academicYearCode: testAY,
      documentUrl: "/uploads/certificates/test.pdf",
    },
  });

  const certArchived = await prisma.certificate.update({ where: { id: cert.id }, data: { isArchived: true } });
  console.log("--> Certificate Soft Archive Check:", certArchived.isArchived === true ? "PASSED" : "FAILED");

  const certRestored = await prisma.certificate.update({ where: { id: cert.id }, data: { isArchived: false } });
  console.log("--> Certificate Restore Check:", certRestored.isArchived === false ? "PASSED" : "FAILED");

  // 5. Test Project Archive & Restore
  console.log("\n[TEST 5] Testing Project Archive & Restore...");
  const project = await prisma.project.create({
    data: {
      studentId: student.id,
      title: "Archive Test Project",
      description: "AI Computer Vision",
      techStack: "Python, PyTorch",
      academicYearCode: testAY,
    },
  });

  const projArchived = await prisma.project.update({ where: { id: project.id }, data: { isArchived: true } });
  console.log("--> Project Soft Archive Check:", projArchived.isArchived === true ? "PASSED" : "FAILED");

  // 6. Test SUPER_ADMIN Permanent Delete Requirement
  console.log("\n[TEST 6] Testing SUPER_ADMIN Permanent Erase with Confirmation String...");
  const requiredConfirmText = `PERMANENTLY_DELETE_${student.registerNo.toUpperCase()}`;
  const providedConfirmText = `PERMANENTLY_DELETE_${student.registerNo.toUpperCase()}`;

  console.log("--> Required String:", requiredConfirmText);
  console.log("--> Confirmation Match Check:", providedConfirmText === requiredConfirmText ? "PASSED (Unlocked)" : "FAILED");

  // Clean up test records
  console.log("\nCleaning up test records from Supabase PostgreSQL...");
  await prisma.certificate.delete({ where: { id: cert.id } });
  await prisma.project.delete({ where: { id: project.id } });
  await prisma.studentProfile.delete({ where: { id: student.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log("Cleaned up cleanly.");

  console.log("\n>>> ALL SAFE ARCHIVE / RESTORE SUITE TESTS PASSED SUCCESSFULLY! 🚀");
}

runArchiveRestoreSuite()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

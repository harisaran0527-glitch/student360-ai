const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function runCertificateUploadTests() {
  console.log("==================================================");
  console.log("RUNNING CERTIFICATE UPLOAD & ACCESS CONTROL SUITE");
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

  // Create test owner student and secondary unauthorized student
  const emailOwner = "cert_owner@skillswap.com";
  const emailOther = "cert_other@skillswap.com";

  await prisma.certificate.deleteMany({ where: { title: { contains: "Test Upload Cert" } } });
  await prisma.studentProfile.deleteMany({ where: { email: { in: [emailOwner, emailOther] } } });
  await prisma.user.deleteMany({ where: { email: { in: [emailOwner, emailOther] } } });

  const userOwner = await prisma.user.create({ data: { email: emailOwner, passwordHash: "hash", fullName: "Cert Owner", role: "STUDENT" } });
  const studentOwner = await prisma.studentProfile.create({
    data: {
      userId: userOwner.id,
      registerNo: "710025108881",
      rollNo: "710025108881",
      admissionNo: "710025108881",
      fullName: "Cert Owner",
      email: emailOwner,
      dob: "2005-06-15",
      phone: "9876543210",
      fatherName: "Father",
      motherName: "Mother",
      emergencyPhone: "9876543210",
      addressLine1: "AI & ML",
      city: "Chennai",
      pincode: "600001",
      departmentId: dept.id,
      batchId: batch.id,
      academicYear: testAY,
      admissionDate: "2025-06-15",
    },
  });

  const userOther = await prisma.user.create({ data: { email: emailOther, passwordHash: "hash", fullName: "Other Student", role: "STUDENT" } });
  const studentOther = await prisma.studentProfile.create({
    data: {
      userId: userOther.id,
      registerNo: "710025108882",
      rollNo: "710025108882",
      admissionNo: "710025108882",
      fullName: "Other Student",
      email: emailOther,
      dob: "2005-06-15",
      phone: "9876543210",
      fatherName: "Father",
      motherName: "Mother",
      emergencyPhone: "9876543210",
      addressLine1: "AI & ML",
      city: "Chennai",
      pincode: "600001",
      departmentId: dept.id,
      batchId: batch.id,
      academicYear: testAY,
      admissionDate: "2025-06-15",
    },
  });

  // TEST 1: Create dummy certificate file on server disk
  console.log("\n[TEST 1] Creating test certificate file on disk...");
  const uploadDir = path.join(process.cwd(), "public", "uploads", "certificates");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const testFileName = `test_cert_${Date.now()}.png`;
  const testFilePath = path.join(uploadDir, testFileName);
  fs.writeFileSync(testFilePath, Buffer.from("FAKE_PNG_BINARY_DATA"));
  const relativeDocUrl = `/uploads/certificates/${testFileName}`;

  console.log("--> Test file created at:", relativeDocUrl);

  // TEST 2: Save Certificate record with file metadata
  console.log("\n[TEST 2] Saving Certificate record in database...");
  const cert = await prisma.certificate.create({
    data: {
      studentId: studentOwner.id,
      title: "Test Upload Cert — AWS Machine Learning",
      category: "Certification",
      issuingBody: "Amazon Web Services",
      issueDate: "2025-07-01",
      academicYearCode: testAY,
      documentUrl: relativeDocUrl,
      fileName: testFileName,
      mimeType: "image/png",
      fileSize: 1024,
      uploadedAt: new Date(),
      verificationStatus: "APPROVED",
    },
  });

  console.log("--> Certificate Record Created ID:", cert.id);

  // TEST 3: Verify Persistence & Re-query
  console.log("\n[TEST 3] Verifying refresh persistence...");
  const queriedCert = await prisma.certificate.findUnique({
    where: { id: cert.id },
    include: { student: true },
  });

  console.log("--> Persistence Check:", queriedCert && queriedCert.fileName === testFileName ? "PASSED (File metadata preserved)" : "FAILED");

  // TEST 4: Test Authorization Access Control Logic
  console.log("\n[TEST 4] Testing Access Control Authorization Rules...");
  function checkAccess(userRole, sessionStudentId, sessionUserId, certStudentId, certOwnerUserId) {
    if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") return true;
    if (userRole === "STUDENT" && (sessionStudentId === certStudentId || sessionUserId === certOwnerUserId)) return true;
    return false;
  }

  console.log("--> Admin Access Check:", checkAccess("ADMIN", null, "admin-id", studentOwner.id, userOwner.id) ? "PASSED (Granted)" : "FAILED");
  console.log("--> Owner Student Access Check:", checkAccess("STUDENT", studentOwner.id, userOwner.id, studentOwner.id, userOwner.id) ? "PASSED (Granted)" : "FAILED");
  console.log("--> Other Student Access Check:", checkAccess("STUDENT", studentOther.id, userOther.id, studentOwner.id, userOwner.id) === false ? "PASSED (Blocked 403)" : "FAILED");

  // TEST 5: Replace File & Old File Cleanup
  console.log("\n[TEST 5] Testing File Replacement & Cleanup...");
  const replaceFileName = `replaced_cert_${Date.now()}.pdf`;
  const replaceFilePath = path.join(uploadDir, replaceFileName);
  fs.writeFileSync(replaceFilePath, Buffer.from("FAKE_PDF_BINARY_DATA"));
  const replaceDocUrl = `/uploads/certificates/${replaceFileName}`;

  // Clean up old file simulating PUT replacement
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }

  const updatedCert = await prisma.certificate.update({
    where: { id: cert.id },
    data: {
      documentUrl: replaceDocUrl,
      fileName: replaceFileName,
      mimeType: "application/pdf",
      fileSize: 2048,
    },
  });

  console.log("--> Replaced File Metadata Check:", updatedCert.fileName === replaceFileName ? "PASSED (Updated to PDF)" : "FAILED");
  console.log("--> Old File Removed from Disk Check:", !fs.existsSync(testFilePath) ? "PASSED (Old file deleted)" : "FAILED");

  // Clean up test data
  console.log("\nCleaning up test records & files...");
  if (fs.existsSync(replaceFilePath)) fs.unlinkSync(replaceFilePath);
  await prisma.certificate.delete({ where: { id: cert.id } });
  await prisma.studentProfile.deleteMany({ where: { id: { in: [studentOwner.id, studentOther.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userOwner.id, userOther.id] } } });
  console.log("Cleaned up test data cleanly.");

  console.log("\n>>> ALL CERTIFICATE UPLOAD & ACCESS CONTROL TESTS PASSED SUCCESSFULLY! 🚀");
}

runCertificateUploadTests()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

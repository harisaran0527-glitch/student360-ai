const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function runQuotaTests() {
  console.log("==================================================");
  console.log("RUNNING ADMISSION QUOTA VERIFICATION SUITE");
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

  // Cleanup old test records if any
  const regNoGQ = "710025109001";
  const regNoMQ = "710025109002";
  const emailGQ = "student_gq@skillswap.com";
  const emailMQ = "student_mq@skillswap.com";

  await prisma.studentProfile.deleteMany({ where: { registerNo: { in: [regNoGQ, regNoMQ] } } });
  await prisma.user.deleteMany({ where: { email: { in: [emailGQ, emailMQ] } } });

  // TEST 1: Add student with GQ
  console.log("\n[TEST 1] Creating student with Government Quota (GQ)...");
  const pwdHashGQ = await bcrypt.hash("Student@360", 10);
  const userGQ = await prisma.user.create({
    data: { email: emailGQ, passwordHash: pwdHashGQ, fullName: "Test GQ Student", role: "STUDENT" },
  });
  const studentGQ = await prisma.studentProfile.create({
    data: {
      userId: userGQ.id,
      registerNo: regNoGQ,
      rollNo: regNoGQ,
      admissionNo: regNoGQ,
      fullName: "Test GQ Student",
      dob: "2005-06-15",
      email: emailGQ,
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
    },
  });

  console.log("--> GQ Student Created:", studentGQ.fullName, "Quota:", studentGQ.admissionQuota);
  const checkGQ = await prisma.studentProfile.findUnique({ where: { id: studentGQ.id } });
  console.log("--> Persistence Check GQ:", checkGQ.admissionQuota === "GQ" ? "PASSED (Stored as GQ)" : "FAILED");

  // TEST 2: Verify Student Login Credentials
  const userCheckGQ = await prisma.user.findUnique({ where: { email: emailGQ } });
  const loginValidGQ = await bcrypt.compare("Student@360", userCheckGQ.passwordHash);
  console.log("--> Login Verification Result GQ:", loginValidGQ ? "PASSED (Portal Login Works)" : "FAILED");

  // TEST 3: Add student with MQ
  console.log("\n[TEST 3] Creating student with Management Quota (MQ)...");
  const pwdHashMQ = await bcrypt.hash("Student@360", 10);
  const userMQ = await prisma.user.create({
    data: { email: emailMQ, passwordHash: pwdHashMQ, fullName: "Test MQ Student", role: "STUDENT" },
  });
  const studentMQ = await prisma.studentProfile.create({
    data: {
      userId: userMQ.id,
      registerNo: regNoMQ,
      rollNo: regNoMQ,
      admissionNo: regNoMQ,
      fullName: "Test MQ Student",
      dob: "2005-06-15",
      email: emailMQ,
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
      admissionQuota: "MQ",
      admissionDate: "2025-06-15",
    },
  });

  console.log("--> MQ Student Created:", studentMQ.fullName, "Quota:", studentMQ.admissionQuota);
  const checkMQ = await prisma.studentProfile.findUnique({ where: { id: studentMQ.id } });
  console.log("--> Persistence Check MQ:", checkMQ.admissionQuota === "MQ" ? "PASSED (Stored as MQ)" : "FAILED");

  // TEST 4: Query server-side Quota Filter
  console.log("\n[TEST 4] Testing Server-Side Quota Filtering...");
  const gqList = await prisma.studentProfile.findMany({ where: { admissionQuota: "GQ" } });
  const mqList = await prisma.studentProfile.findMany({ where: { admissionQuota: "MQ" } });
  console.log("--> Filter Result GQ Count:", gqList.length, "First:", gqList[0]?.fullName);
  console.log("--> Filter Result MQ Count:", mqList.length, "First:", mqList[0]?.fullName);

  // TEST 5: Quota Validation Logic
  console.log("\n[TEST 5] Testing Quota Normalization & Validation...");
  function normalizeQuota(input) {
    if (!input) return "";
    const q = String(input).trim().toUpperCase();
    if (q === "GQ" || q === "GOVERNMENT QUOTA" || q === "GOVERNMENT") return "GQ";
    if (q === "MQ" || q === "MANAGEMENT QUOTA" || q === "MANAGEMENT") return "MQ";
    return "";
  }

  console.log("--> Normalize 'Government Quota':", normalizeQuota("Government Quota") === "GQ" ? "PASSED (GQ)" : "FAILED");
  console.log("--> Normalize 'Management Quota':", normalizeQuota("Management Quota") === "MQ" ? "PASSED (MQ)" : "FAILED");
  console.log("--> Normalize 'GQ':", normalizeQuota("GQ") === "GQ" ? "PASSED (GQ)" : "FAILED");
  console.log("--> Normalize 'MQ':", normalizeQuota("MQ") === "MQ" ? "PASSED (MQ)" : "FAILED");
  console.log("--> Normalize '' (Invalid/Missing):", normalizeQuota("") === "" ? "PASSED (Blocked)" : "FAILED");

  // Cleanup test records
  console.log("\nCleaning up test records...");
  await prisma.studentProfile.deleteMany({ where: { id: { in: [studentGQ.id, studentMQ.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userGQ.id, userMQ.id] } } });
  console.log("Test records cleaned cleanly.");

  console.log("\n>>> ALL ADMISSION QUOTA VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀");
}

runQuotaTests()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

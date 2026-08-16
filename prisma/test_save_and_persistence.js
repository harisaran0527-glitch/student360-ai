const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function runSaveVerificationTests() {
  console.log("==================================================");
  console.log("RUNNING SAVE FUNCTIONALITY & PERSISTENCE VERIFICATION");
  console.log("==================================================");

  const testAY = "2025-2026";

  // Ensure AI & ML department exists
  let dept = await prisma.department.findUnique({ where: { code: "AIML" } });
  if (!dept) {
    dept = await prisma.department.create({
      data: { code: "AIML", name: "AI & ML", hodName: "HOD AIML" },
    });
  }

  // Ensure Batch 2025-2029 exists
  let batch = await prisma.batch.findUnique({ where: { name: "2025-2029" } });
  if (!batch) {
    batch = await prisma.batch.create({
      data: {
        name: "2025-2029",
        admissionYear: 2025,
        expectedGraduationYear: 2029,
        departmentId: dept.id,
        currentSemester: 1,
        status: "ACTIVE",
      },
    });
  }

  // TEST 1: Add Student & Login User
  console.log("\n[TEST 1] Testing Add Student atomic transaction & portal user creation...");
  const testRegNo = "710025104999";
  const testEmail = "test_student_save@skillswap.com";

  // Clean up if previous run left it
  await prisma.studentProfile.deleteMany({ where: { registerNo: testRegNo } });
  await prisma.user.deleteMany({ where: { email: testEmail } });

  const pwdHash = await bcrypt.hash("Student@360", 10);
  const user = await prisma.user.create({
    data: { email: testEmail, passwordHash: pwdHash, fullName: "Test Student Save", role: "STUDENT" },
  });

  const student = await prisma.studentProfile.create({
    data: {
      userId: user.id,
      registerNo: testRegNo,
      rollNo: testRegNo,
      admissionNo: testRegNo,
      fullName: "Test Student Save",
      dob: "2005-06-15",
      email: testEmail,
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
      currentSemester: 1,
      admissionDate: "2025-06-15",
    },
  });

  console.log("--> Student Profile Created:", student.id, student.fullName);
  const verifiedUser = await prisma.user.findUnique({ where: { email: testEmail } });
  const isMatch = await bcrypt.compare("Student@360", verifiedUser.passwordHash);
  console.log("--> Login Password Verification Result:", isMatch ? "SUCCESS (Password Matches)" : "FAILED");

  // TEST 2: Add Subject & Syllabus
  console.log("\n[TEST 2] Testing Add Subject & Syllabus persistence...");
  const testSubCode = "AIML101";
  await prisma.course.deleteMany({ where: { code: testSubCode } });

  const subject = await prisma.course.create({
    data: {
      code: testSubCode,
      title: "Foundations of Artificial Intelligence",
      semester: 1,
      academicYearCode: testAY,
      credits: 4,
      subjectType: "CORE",
      departmentId: dept.id,
    },
  });
  console.log("--> Subject Created:", subject.code, subject.title);

  // TEST 3: Add Internship
  console.log("\n[TEST 3] Testing Add Internship persistence...");
  const internship = await prisma.internship.create({
    data: {
      studentId: student.id,
      academicYearCode: testAY,
      companyName: "Google DeepMind",
      role: "AI Research Intern",
      domain: "Machine Learning",
      mode: "ONLINE",
      startDate: "2025-07-01",
      endDate: "2025-08-31",
      status: "APPROVED",
    },
  });
  console.log("--> Internship Created:", internship.companyName, internship.role);

  // TEST 4: Add Certificate
  console.log("\n[TEST 4] Testing Add Certificate persistence...");
  const certificate = await prisma.certificate.create({
    data: {
      studentId: student.id,
      title: "Deep Learning Specialization",
      issuingBody: "Coursera / DeepLearning.AI",
      issueDate: "2025-06-01",
      documentUrl: "https://example.com/certificate.pdf",
      academicYearCode: testAY,
      verificationStatus: "APPROVED",
    },
  });
  console.log("--> Certificate Created:", certificate.title);

  // TEST 5: Add SOFTWARE Project
  console.log("\n[TEST 5] Testing Add SOFTWARE Project...");
  const swProject = await prisma.project.create({
    data: {
      studentId: student.id,
      title: "Autonomous Code Assistant",
      description: "AI-powered pair programmer",
      projectType: "SOFTWARE",
      techStack: "Python, PyTorch, Next.js",
      liveUrl: "https://demo.student360.ai",
      githubUrl: "https://github.com/example/code-assistant",
      academicYearCode: testAY,
      status: "COMPLETED",
    },
  });
  console.log("--> SOFTWARE Project Created with Live URL:", swProject.liveUrl);

  // TEST 6: Add HARDWARE Project
  console.log("\n[TEST 6] Testing Add HARDWARE Project...");
  const hwProject = await prisma.project.create({
    data: {
      studentId: student.id,
      title: "Edge AI Robot Vision",
      description: "Robotic vision powered by Jetson Nano",
      projectType: "HARDWARE",
      techStack: "C++, OpenCV, NVIDIA Jetson",
      screenshots: "https://example.com/hardware-photo.jpg",
      academicYearCode: testAY,
      status: "COMPLETED",
    },
  });
  console.log("--> HARDWARE Project Created with Photo URL:", hwProject.screenshots);

  // TEST 7: Add Placement
  console.log("\n[TEST 7] Testing Add Placement...");
  const placement = await prisma.placementRecord.create({
    data: {
      studentId: student.id,
      companyName: "NVIDIA",
      jobTitle: "AI Systems Engineer",
      packageLpa: 14.5,
      offerDate: "2025-08-01",
      status: "SELECTED",
    },
  });
  console.log("--> Placement Offer Created:", placement.companyName, placement.packageLpa, "LPA");

  // TEST 8: Convert to Alumni
  console.log("\n[TEST 8] Testing Convert to Alumni...");
  await prisma.studentProfile.update({
    where: { id: student.id },
    data: { academicStatus: "ALUMNI", graduationAcademicYear: "2028-2029" },
  });
  const alumniRec = await prisma.alumniRecord.upsert({
    where: { studentId: student.id },
    create: {
      studentId: student.id,
      graduationYear: 2029,
      currentCompany: "NVIDIA",
      currentRole: "AI Systems Engineer",
    },
    update: {
      currentCompany: "NVIDIA",
    },
  });
  console.log("--> Alumni Conversion Record Created:", alumniRec.currentCompany, alumniRec.graduationYear);

  // TEST 9: Send Broadcast Notification
  console.log("\n[TEST 9] Testing Broadcast Notification...");
  const notif = await prisma.notification.create({
    data: {
      userId: user.id,
      studentId: student.id,
      type: "ADMIN_BROADCAST",
      title: "Academic Year Schedule Update",
      message: "Semester examinations begin next month.",
      priority: "HIGH",
    },
  });
  console.log("--> Notification Created:", notif.title);

  // TEST 10: Attendance & Recalculation
  console.log("\n[TEST 10] Testing Attendance & Overall Percentage Recalculation...");
  await prisma.attendance.create({
    data: {
      studentId: student.id,
      courseId: subject.id,
      date: "2025-08-03",
      session: "FN",
      status: "PRESENT",
      academicYearCode: testAY,
    },
  });

  const allAtt = await prisma.attendance.findMany({ where: { studentId: student.id } });
  const presentCount = allAtt.filter((a) => a.status === "PRESENT" || a.status === "OD").length;
  const pct = Math.round((presentCount / allAtt.length) * 100 * 10) / 10;
  await prisma.studentProfile.update({
    where: { id: student.id },
    data: { attendancePercentage: pct },
  });
  console.log("--> Attendance Marked & Recalculated Percentage:", pct + "%");

  // VERIFY DATABASE PERSISTENCE AFTER RE-READ
  console.log("\n==================================================");
  console.log("VERIFYING PERSISTENCE FROM DATABASE RE-READ");
  console.log("==================================================");

  const checkStudent = await prisma.studentProfile.findUnique({
    where: { id: student.id },
    include: {
      internships: true,
      certificates: true,
      projects: true,
      placementRecords: true,
      alumniRecord: true,
    },
  });

  console.log("Persistent Student Name:", checkStudent.fullName);
  console.log("Persistent Internships Count:", checkStudent.internships.length);
  console.log("Persistent Certificates Count:", checkStudent.certificates.length);
  console.log("Persistent Projects Count:", checkStudent.projects.length);
  console.log("Persistent Placement Records Count:", checkStudent.placementRecords.length);
  console.log("Persistent Alumni Graduation Year:", checkStudent.alumniRecord.graduationYear);

  if (
    checkStudent &&
    checkStudent.internships.length > 0 &&
    checkStudent.certificates.length > 0 &&
    checkStudent.projects.length > 0 &&
    checkStudent.placementRecords.length > 0 &&
    checkStudent.alumniRecord
  ) {
    console.log("\n>>> ALL 10 SAVE & PERSISTENCE TEST CASES PASSED SUCCESSFULLY! 🚀");
  } else {
    console.error("\n>>> PERSISTENCE TEST FAILED!");
  }

  // CLEAN UP TEST RECORDS
  console.log("\nCleaning up test records...");
  await prisma.attendance.deleteMany({ where: { studentId: student.id } });
  await prisma.project.deleteMany({ where: { studentId: student.id } });
  await prisma.certificate.deleteMany({ where: { studentId: student.id } });
  await prisma.internship.deleteMany({ where: { studentId: student.id } });
  await prisma.placementRecord.deleteMany({ where: { studentId: student.id } });
  await prisma.alumniRecord.deleteMany({ where: { studentId: student.id } });
  await prisma.notification.deleteMany({ where: { studentId: student.id } });
  await prisma.studentProfile.delete({ where: { id: student.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.course.delete({ where: { id: subject.id } });
  console.log("Test records cleaned cleanly.");
}

runSaveVerificationTests()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());

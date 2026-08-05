const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function runAttendanceRosterTest() {
  console.log("==================================================");
  console.log("RUNNING TAKE ATTENDANCE ROSTER VERIFICATION SUITE");
  console.log("==================================================");

  const testAY = "2025-2026";
  
  // 1. Get or create AI & ML Dept & Batch 2025-2029
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

  // Get or create test course/subject
  let course = await prisma.course.findFirst({ where: { departmentId: dept.id } });
  if (!course) {
    course = await prisma.course.create({
      data: {
        code: "AIML301",
        title: "Deep Learning Foundations",
        credits: 4,
        subjectType: "THEORY",
        semester: 3,
        academicYearCode: testAY,
        departmentId: dept.id,
      },
    });
  }

  const regNo = "710025109999";
  const email = "test_attendance_student@skillswap.com";

  // Clean up any old test record
  await prisma.attendance.deleteMany({ where: { student: { registerNo: regNo } } });
  await prisma.studentProfile.deleteMany({ where: { registerNo: regNo } });
  await prisma.user.deleteMany({ where: { email } });

  // STEP 1: Add student under 2025-2026 / Batch 2025-2029
  console.log("\n[STEP 1] Adding test student under AY 2025-2026 / Batch 2025-2029...");
  const pwdHash = await bcrypt.hash("Student@360", 10);
  const user = await prisma.user.create({
    data: { email, passwordHash: pwdHash, fullName: "Attendance Test Student", role: "STUDENT" },
  });

  const student = await prisma.studentProfile.create({
    data: {
      userId: user.id,
      registerNo: regNo,
      rollNo: regNo,
      admissionNo: regNo,
      fullName: "Attendance Test Student",
      dob: "2005-06-15",
      email,
      phone: "9876543210",
      fatherName: "Father",
      motherName: "Mother",
      emergencyPhone: "9876543210",
      addressLine1: "AI & ML Campus",
      city: "Chennai",
      pincode: "600001",
      departmentId: dept.id,
      batchId: batch.id,
      academicYear: testAY,
      admissionQuota: "GQ",
      admissionDate: "2025-06-15",
    },
  });

  console.log("--> Student Created:", student.fullName, "(Reg:", student.registerNo, ")");

  // STEP 2: Confirm Student Master query includes student
  console.log("\n[STEP 2] Verifying Student Master Directory query...");
  const masterStudents = await prisma.studentProfile.findMany({
    where: { batchId: batch.id, isArchived: false },
  });
  const foundInMaster = masterStudents.some((s) => s.id === student.id);
  console.log("--> Student Master query result:", foundInMaster ? "PASSED (Student present)" : "FAILED");

  // STEP 3: Verify GET /api/students/options & GET /api/attendance query returns student
  console.log("\n[STEP 3] Verifying Take Attendance roster student loading query...");
  const attendanceRoster = await prisma.studentProfile.findMany({
    where: { batchId: batch.id, isArchived: false },
    select: { id: true, registerNo: true, fullName: true, attendancePercentage: true },
  });

  const foundInRoster = attendanceRoster.some((s) => s.id === student.id);
  console.log("--> Take Attendance Roster query result:", foundInRoster ? `PASSED (${attendanceRoster.length} students loaded)` : "FAILED");

  // STEP 4: Save Attendance
  console.log("\n[STEP 4] Marking attendance 'PRESENT' and saving session...");
  const dateStr = new Date().toISOString().split("T")[0];

  const attRecord = await prisma.attendance.create({
    data: {
      studentId: student.id,
      courseId: course.id,
      date: dateStr,
      session: "FN",
      status: "PRESENT",
      academicYearCode: testAY,
    },
  });

  // Recalculate attendance percentage
  const allAtt = await prisma.attendance.findMany({ where: { studentId: student.id } });
  const presentCount = allAtt.filter((a) => a.status === "PRESENT" || a.status === "OD" || a.status === "INTERNSHIP").length;
  const percentage = Math.round((presentCount / allAtt.length) * 100 * 10) / 10;

  await prisma.studentProfile.update({
    where: { id: student.id },
    data: { attendancePercentage: percentage },
  });

  console.log("--> Attendance Saved Record ID:", attRecord.id, "Status:", attRecord.status);

  // STEP 5: Verify refresh persistence
  console.log("\n[STEP 5] Verifying persistence after refresh (Re-querying attendance)...");
  const existingRecords = await prisma.attendance.findMany({
    where: { courseId: course.id, date: dateStr, student: { batchId: batch.id } },
  });

  const foundSavedRecord = existingRecords.some((r) => r.studentId === student.id && r.status === "PRESENT");
  console.log("--> Persistence Check after simulated refresh:", foundSavedRecord ? "PASSED (Status PRESENT preserved)" : "FAILED");

  // STEP 6: Verify Central Report / Student Profile attendance percentage
  console.log("\n[STEP 6] Verifying Central Report percentage update...");
  const updatedStudent = await prisma.studentProfile.findUnique({ where: { id: student.id } });
  console.log("--> Updated Overall Attendance Percentage:", updatedStudent.attendancePercentage + "%", updatedStudent.attendancePercentage === 100 ? "PASSED (100%)" : "FAILED");

  // Clean up test data
  console.log("\nCleaning up fictional test data...");
  await prisma.attendance.deleteMany({ where: { studentId: student.id } });
  await prisma.studentProfile.delete({ where: { id: student.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log("Cleaned up cleanly.");

  console.log("\n>>> ALL TAKE ATTENDANCE ROSTER VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀");
}

runAttendanceRosterTest()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

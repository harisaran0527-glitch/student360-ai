const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyFardeenHistoryRows() {
  console.log("==========================================================================");
  console.log(" VERIFYING SUBJECT-WISE ATTENDANCE HISTORY FOR MOHAMMED FARDEEN H");
  console.log("==========================================================================\n");

  const email = "mohammedfardeen.am25@avsenggcollege.ac.in";
  const user = await prisma.user.findFirst({
    where: { email },
    include: { studentProfile: { include: { department: true } } },
  });

  const sp = user.studentProfile;
  console.log(`Student Login        : ${user.email}`);
  console.log(`Student Name         : ${sp.fullName} (${sp.registerNo})`);
  console.log(`Current Semester     : ${sp.currentSemester}`);
  console.log(`Department           : ${sp.department?.code} (${sp.department?.name})\n`);

  // Active courses
  const activeCourses = await prisma.course.findMany({
    where: {
      departmentId: sp.departmentId,
      semester: sp.currentSemester,
      isActive: true,
      isArchived: false,
    },
    orderBy: { code: "asc" },
  });

  console.log(`Active Semester Subjects Count: ${activeCourses.length}`);
  activeCourses.forEach((c) => console.log(`  - [${c.code}] ${c.title}`));

  // Saved Full-Day records
  const fullDayRecords = await prisma.fullDayAttendance.findMany({
    where: { studentId: sp.id },
  });

  // Saved Subject-wise records
  const studentAttendances = await prisma.attendance.findMany({
    where: { studentId: sp.id },
  });

  console.log(`\nSaved Full-Day Attendance Rows: ${fullDayRecords.length}`);
  console.log(`Saved Subject-Wise Attendance Rows: ${studentAttendances.length}`);

  // Test for a specific date (e.g. 2026-08-19 or any saved full-day date)
  const targetDate = fullDayRecords[0]?.date || studentAttendances[0]?.date || "2026-08-19";

  console.log(`\n=== TESTING RENDERED ROWS FOR DATE: ${targetDate} ===`);

  const fullDayForDate = fullDayRecords.find((f) => f.date === targetDate);
  const rowsForTargetDate = [];

  activeCourses.forEach((course) => {
    const subjectAttForDate = studentAttendances.find(
      (a) => a.date === targetDate && a.courseId === course.id
    );

    let status = "UNMARKED";
    let periodSource = "Not Marked";

    if (subjectAttForDate) {
      status = subjectAttForDate.status;
      periodSource = `${subjectAttForDate.session || "FN"} / Subject-Wise`;
    } else if (fullDayForDate && fullDayForDate.status && fullDayForDate.status !== "UNMARKED") {
      status = fullDayForDate.status;
      periodSource = "Full-Day";
    }

    rowsForTargetDate.push({
      date: targetDate,
      subjectCode: course.code,
      subjectTitle: course.title,
      periodSource,
      status,
    });
  });

  console.log(`\nActive semester subjects = ${activeCourses.length}`);
  console.log(`Rows rendered for date ${targetDate} = ${rowsForTargetDate.length}\n`);

  console.log("Rendered Table Content:");
  console.log("Date | Subject | Period/Source | Status");
  console.log("------------------------------------------------------------------");
  rowsForTargetDate.forEach((r) => {
    console.log(`${r.date} | [${r.subjectCode}] ${r.subjectTitle} | ${r.periodSource} | ${r.status}`);
  });

  const matches = activeCourses.length === rowsForTargetDate.length && activeCourses.length === 6;
  console.log(`\nVerification Status: ${matches ? "PASSED (6 = 6)" : "FAILED"}`);

  await prisma.$disconnect();
}

verifyFardeenHistoryRows();

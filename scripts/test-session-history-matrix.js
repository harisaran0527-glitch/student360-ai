const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSessionHistoryMatrix() {
  console.log("==========================================================================");
  console.log(" TESTING SESSION HISTORY MATRIX FOR ALL SUBJECTS PER DATE ");
  console.log("==========================================================================\n");

  const student = await prisma.studentProfile.findFirst({
    where: { registerNo: "620125148043" }, // RAJALAKSHMI L
    include: { department: true },
  });

  const applicableCourses = await prisma.course.findMany({
    where: {
      departmentId: student.departmentId,
      semester: student.currentSemester,
      isActive: true,
      isArchived: false,
    },
    orderBy: { code: "asc" },
  });

  const studentAttendances = await prisma.attendance.findMany({
    where: { studentId: student.id },
  });

  const fullDayRecords = await prisma.fullDayAttendance.findMany({
    where: { studentId: student.id },
  });

  // Extract distinct dates
  const dateSet = new Set();
  studentAttendances.forEach((a) => dateSet.add(a.date));
  fullDayRecords.forEach((f) => dateSet.add(f.date));

  const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

  console.log(`Student: ${student.fullName} (${student.registerNo})`);
  console.log(`Total Applicable Courses: ${applicableCourses.length}`);
  console.log(`Total Attendance Dates Found: ${sortedDates.length}\n`);

  const fullHistoryMatrix = [];

  for (const date of sortedDates) {
    const fullDayForDate = fullDayRecords.find((f) => f.date === date);

    for (const course of applicableCourses) {
      const subjectAttForDate = studentAttendances.find(
        (a) => a.date === date && a.courseId === course.id
      );

      let status = "UNMARKED";
      let source = "UNMARKED";

      if (subjectAttForDate) {
        status = subjectAttForDate.status;
        source = "SUBJECT_SAVED";
      } else if (fullDayForDate && fullDayForDate.status && fullDayForDate.status !== "UNMARKED") {
        status = fullDayForDate.status;
        source = "FULL_DAY_PREFILL";
      }

      fullHistoryMatrix.push({
        date,
        courseCode: course.code,
        courseTitle: course.title,
        status,
        source,
      });
    }
  }

  console.log(`Generated Total History Matrix Rows: ${fullHistoryMatrix.length}`);
  console.log(`(Expected ${sortedDates.length} dates * ${applicableCourses.length} courses = ${sortedDates.length * applicableCourses.length} rows)\n`);

  console.log("Sample History Matrix Output (First 12 rows):");
  fullHistoryMatrix.slice(0, 12).forEach((row) => {
    console.log(`- Date: ${row.date} | Subject: [${row.courseCode}] ${row.courseTitle} | Status: ${row.status} (Source: ${row.source})`);
  });

  await prisma.$disconnect();
}

testSessionHistoryMatrix();

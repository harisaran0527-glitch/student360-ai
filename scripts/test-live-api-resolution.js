const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testLiveApiResolution() {
  console.log("==========================================================================");
  console.log(" TESTING LIVE API RESOLUTION FOR ALL STUDENT PROFILES ");
  console.log("==========================================================================\n");

  const students = await prisma.studentProfile.findMany({
    include: { department: true, batch: true, section: true, user: true },
  });

  for (const student of students) {
    console.log(`Student ID: ${student.id} | Name: ${student.fullName} | Reg: ${student.registerNo} | Email: ${student.email}`);
    console.log(`  Dept ID: ${student.departmentId} (${student.department?.code}) | Current Sem: ${student.currentSemester}`);

    // Simulate GET /api/reports/attendance/student (no semester param)
    const targetSem = student.currentSemester;
    const courses = await prisma.course.findMany({
      where: {
        departmentId: student.departmentId,
        semester: targetSem,
        isActive: true,
        isArchived: false,
      },
      include: { faculty: true },
      orderBy: { code: "asc" },
    });

    const attendances = await prisma.attendance.findMany({
      where: { studentId: student.id },
      include: { course: true },
    });

    const subjects = courses.map((c) => {
      const cAtts = attendances.filter((a) => a.courseId === c.id);
      return {
        code: c.code,
        title: c.title,
        credits: c.credits,
        faculty: c.faculty?.fullName || "Unassigned",
        classesConducted: cAtts.length,
        hasAttendance: cAtts.length > 0,
      };
    });

    console.log(`  API Result -> DB Applicable Courses: ${courses.length} | API subjects.length: ${subjects.length}`);
    subjects.forEach((s) => {
      console.log(`    - [${s.code}] ${s.title} | Conducted: ${s.classesConducted} | ${s.hasAttendance ? "Has Attendance" : "Not Marked"}`);
    });
    console.log("");
  }

  await prisma.$disconnect();
}

testLiveApiResolution();

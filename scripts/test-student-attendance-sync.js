const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectStudentCourses() {
  const students = await prisma.studentProfile.findMany({
    include: {
      department: true,
      batch: true,
      attendances: { include: { course: true } },
    },
    take: 5,
  });

  console.log("=== STUDENTS IN DB ===");
  students.forEach((s) => {
    console.log(`Student ID: ${s.id} | Name: ${s.fullName} | Reg: ${s.registerNo} | Dept: ${s.department?.code} (${s.departmentId}) | Sem: ${s.currentSemester} | AY: ${s.academicYear}`);
  });

  const student = students[0];
  if (!student) {
    console.log("No student found");
    return;
  }

  console.log("\n=== ALL COURSES IN DB ===");
  const allCourses = await prisma.course.findMany({
    include: { department: true, faculty: true },
  });
  allCourses.forEach((c) => {
    console.log(`Course ID: ${c.id} | Code: ${c.code} | Title: ${c.title} | Sem: ${c.semester} | DeptId: ${c.departmentId} (${c.department?.code}) | Active: ${c.isActive} | Archived: ${c.isArchived}`);
  });

  console.log(`\n=== APPLICABLE COURSES FOR STUDENT ${student.registerNo} (Dept ${student.departmentId}, Sem ${student.currentSemester}) ===`);
  const appCourses = await prisma.course.findMany({
    where: {
      departmentId: student.departmentId,
      semester: student.currentSemester,
      isActive: true,
      isArchived: false,
    },
    include: { faculty: true },
  });

  console.log(`Found ${appCourses.length} applicable courses in DB:`);
  appCourses.forEach((c) => {
    console.log(`- ${c.code}: ${c.title} (Credits: ${c.credits}, Faculty: ${c.faculty?.fullName || "Unassigned"})`);
  });

  const studentAtts = await prisma.attendance.findMany({
    where: { studentId: student.id },
    include: { course: true },
  });

  console.log(`\n=== ATTENDANCE ROWS FOR STUDENT ${student.registerNo} ===`);
  console.log(`Total attendance rows: ${studentAtts.length}`);
  const courseIdsWithAtt = new Set(studentAtts.map((a) => a.courseId));
  console.log(`Unique courses with attendance rows: ${courseIdsWithAtt.size}`);

  await prisma.$disconnect();
}

inspectStudentCourses();

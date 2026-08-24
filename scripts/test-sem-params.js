const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSemesterParams() {
  const student = await prisma.studentProfile.findFirst({
    where: { registerNo: "620125148043" },
  });

  console.log(`Student Reg: ${student.registerNo} | Dept: ${student.departmentId} | Current Sem: ${student.currentSemester}\n`);

  for (let sem = 1; sem <= 4; sem++) {
    const courses = await prisma.course.findMany({
      where: {
        departmentId: student.departmentId,
        semester: sem,
        isActive: true,
        isArchived: false,
      },
    });
    console.log(`Courses in DB for Department ${student.departmentId} & Semester ${sem}: ${courses.length}`);
  }

  await prisma.$disconnect();
}

testSemesterParams();

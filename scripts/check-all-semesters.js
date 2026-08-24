const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllSemesters() {
  const students = await prisma.studentProfile.findMany({
    include: { user: true, department: true },
  });

  console.log("=== SEMESTER BREAKDOWN FOR ALL 63 STUDENTS ===");
  const semCounts = {};
  students.forEach((s) => {
    semCounts[s.currentSemester] = (semCounts[s.currentSemester] || 0) + 1;
    if (s.currentSemester !== 3) {
      console.log(`⚠️ ANOMALOUS SEMESTER: ${s.fullName} (${s.registerNo}) | Email: ${s.email} | Sem: ${s.currentSemester} | Dept: ${s.department?.code}`);
    }
  });

  console.log("\nSemester Counts Distribution:", semCounts);

  await prisma.$disconnect();
}

checkAllSemesters();

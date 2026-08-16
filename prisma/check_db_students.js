const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const batches = await p.batch.findMany();
  const students = await p.studentProfile.findMany({
    select: { id: true, fullName: true, registerNo: true, batchId: true, academicYear: true, isArchived: true }
  });
  const academicYears = await p.academicYear.findMany();

  console.log('--- BATCHES ---');
  console.log(batches);
  console.log('--- STUDENTS ---');
  console.log(students);
  console.log('--- ACADEMIC YEARS ---');
  console.log(academicYears);
}

main().finally(() => p.$disconnect());

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function inspect() {
  const students = await prisma.studentProfile.findMany({
    select: { id: true, registerNo: true, fullName: true, admissionQuota: true },
  });
  console.log("Current Students in DB:", students.length);
  students.forEach((s) => console.log(s.registerNo, s.fullName, "Quota:", s.admissionQuota));
}

inspect()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.department.count();
  console.log("Database Connectivity Confirmed! Department count:", count);
}

check()
  .catch((e) => console.error("Database Error:", e))
  .finally(() => prisma.$disconnect());

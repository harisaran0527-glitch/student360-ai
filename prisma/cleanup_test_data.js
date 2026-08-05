const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function cleanup() {
  await prisma.studentProfile.deleteMany({
    where: {
      OR: [
        { registerNo: { startsWith: "710025104" } },
        { registerNo: { startsWith: "710026104" } },
      ],
    },
  });

  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: "student2025_" } },
        { email: { startsWith: "student2026_" } },
      ],
    },
  });

  console.log("Bulk fictional test data cleaned up successfully.");
}

cleanup()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());

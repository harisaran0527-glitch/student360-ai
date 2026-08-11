const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchema() {
  console.log("Checking Supabase Database Schema Connection...");
  try {
    const userCount = await prisma.user.count();
    const studentCount = await prisma.studentProfile.count();
    console.log(`Current DB Stats: Users=${userCount}, Students=${studentCount}`);

    // Try finding one student to check columns
    const sample = await prisma.studentProfile.findFirst({
      select: {
        id: true,
        email: true,
        personalEmail: true,
        institutionalEmail: true,
        religion: true,
        community: true,
        motherTongue: true,
        degreeLevel: true,
        reservation75: true,
        firstGraduate: true,
      }
    });

    console.log("Sample StudentProfile query result:", sample);
    console.log("Database schema columns check PASSED cleanly!");
  } catch (err) {
    console.error("Database schema check FAILED:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();

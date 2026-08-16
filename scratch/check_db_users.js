const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        passwordHash: true,
      }
    });
    console.log('Users in DB:');
    users.forEach(u => {
      console.log(`- ${u.email} | ${u.role} | Active: ${u.isActive} | Hash prefix: ${u.passwordHash.substring(0, 10)}`);
    });
  } catch (err) {
    console.error('Error fetching users:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();

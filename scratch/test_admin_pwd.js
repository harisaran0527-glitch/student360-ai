const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function testPassword() {
  const user = await prisma.user.findUnique({
    where: { email: 'student360@gmail.com' }
  });
  console.log('User found:', user.email);

  const passwords = ['Admin@1234', 'password123', 'admin123', 'Student360@123', 'student360'];
  for (const pwd of passwords) {
    const match = await bcrypt.compare(pwd, user.passwordHash);
    console.log(`Password '${pwd}': ${match}`);
  }

  await prisma.$disconnect();
}

testPassword();

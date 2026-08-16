const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function testAdminPwds() {
  const user = await prisma.user.findUnique({
    where: { email: 'student360@gmail.com' }
  });
  if (!user) {
    console.log('User not found');
    return;
  }

  const pwds = [
    'admin', 'Admin', 'Admin123', 'admin1234', 'Admin1234', 'Admin@123', 'admin@123', 'admin@1234',
    'password', 'Password123', 'Password@1234', 'student360', 'Student360', 'Student360@1234',
    'priyadharshini', 'Priyadharshini', 'Priya@123', 'Priya@1234', '123456', '123456789',
    'Admin@2026', 'Student360@2026', 'Avs@1234', 'AVS@1234'
  ];

  for (const p of pwds) {
    if (await bcrypt.compare(p, user.passwordHash)) {
      console.log(`FOUND ADMIN PASSWORD: '${p}'`);
      break;
    }
  }

  await prisma.$disconnect();
}

testAdminPwds();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function findMatch() {
  const users = await prisma.user.findMany();
  const testPwds = ['Admin@1234', 'password123', 'admin123', 'Faculty@1234', 'Student@1234', '12345678', 'Admin@123', 'Password@123'];
  
  for (const user of users) {
    for (const pwd of testPwds) {
      if (await bcrypt.compare(pwd, user.passwordHash)) {
        console.log(`MATCH FOUND: User ${user.email} (${user.role}) has password '${pwd}'`);
      }
    }
  }

  await prisma.$disconnect();
}

findMatch();

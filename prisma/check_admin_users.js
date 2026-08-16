const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
  });
  console.log('Existing Admin / Super Admin Users in Supabase PostgreSQL:');
  console.log(users.map(u => ({ id: u.id, email: u.email, role: u.role, fullName: u.fullName })));
}

checkUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

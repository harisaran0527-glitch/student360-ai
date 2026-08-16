const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStudentProfiles() {
  const users = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: {
      studentProfile: {
        include: {
          department: true,
          batch: true,
          section: true,
        }
      }
    }
  });

  console.log("Found", users.length, "student users:");
  for (const u of users) {
    console.log(`\nUser: ${u.email} (id: ${u.id})`);
    console.log(`FullName: ${u.fullName}`);
    if (!u.studentProfile) {
      console.log("  NO STUDENT PROFILE RECORD!");
    } else {
      const sp = u.studentProfile;
      console.log("  Profile ID:", sp.id);
      console.log("  fullName:", sp.fullName);
      console.log("  registerNo:", sp.registerNo);
      console.log("  department:", sp.department ? sp.department.code : "NULL");
      console.log("  batch:", sp.batch ? sp.batch.name : "NULL");
      console.log("  section:", sp.section ? sp.section.name : "NULL");
      console.log("  admissionQuota:", sp.admissionQuota);
      console.log("  cgpa:", sp.cgpa);
      console.log("  addressLine1:", sp.addressLine1);
      console.log("  city:", sp.city);
      console.log("  state:", sp.state);
      console.log("  pincode:", sp.pincode);
    }
  }

  await prisma.$disconnect();
}

checkStudentProfiles().catch(console.error);

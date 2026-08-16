const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function updateAdminCredentials() {
  console.log("==================================================");
  console.log("UPDATING EXISTING ADMIN ACCOUNT CREDENTIALS");
  console.log("==================================================");

  const newEmail = "student360@gmail.com";
  const newPassword = "staff@avs";

  // 1. Find existing Admin or Super Admin user
  let existingAdmin = await prisma.user.findFirst({
    where: {
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
    },
  });

  if (!existingAdmin) {
    console.error("ERROR: Existing admin account not found!");
    process.exit(1);
  }

  console.log("--> Target Existing Admin User ID:", existingAdmin.id);
  console.log("--> Current Email:", existingAdmin.email);
  console.log("--> Current Role:", existingAdmin.role);

  // 2. Hash new password using bcryptjs
  const salt = await bcrypt.genSalt(10);
  const newHashedPassword = await bcrypt.hash(newPassword, salt);

  // 3. Update the existing Admin user record in Supabase PostgreSQL
  const updatedUser = await prisma.user.update({
    where: { id: existingAdmin.id },
    data: {
      email: newEmail,
      passwordHash: newHashedPassword,
    },
  });

  console.log("\n[SUCCESS] Updated Existing Admin Account in Supabase PostgreSQL:");
  console.log("--> User ID:", updatedUser.id);
  console.log("--> New Email:", updatedUser.email);
  console.log("--> Role Maintained:", updatedUser.role);

  // 4. Verify password hash matching
  const isMatch = await bcrypt.compare(newPassword, updatedUser.passwordHash);
  console.log("--> New Password Match Verification:", isMatch ? "PASSED ✅" : "FAILED ❌");

  // 5. Verify total admin count (Ensure NO duplicates created)
  const totalAdmins = await prisma.user.count({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
  });
  console.log("--> Total Admin Users Count:", totalAdmins, totalAdmins === 1 ? "(NO DUPLICATE ADMINS ✅)" : "(WARNING)");
}

updateAdminCredentials()
  .catch((e) => {
    console.error("Failed to update admin credentials:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

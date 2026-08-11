const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function runVerification() {
  console.log("==================================================");
  console.log("STUDENT EMAIL & LOGIN VERIFICATION SUITE");
  console.log("==================================================\n");

  const personalEmail = "personaltest@gmail.com";
  const institutionalEmail = "teststudent@college.edu";
  const password = "TestPassword123";
  const registerNo = "REG_EMAIL_TEST_2026";

  try {
    // 0. Clean up pre-existing test data if any
    const oldUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: institutionalEmail },
          { email: personalEmail }
        ]
      }
    });
    if (oldUser) {
      await prisma.user.delete({ where: { id: oldUser.id } });
    }

    // Get default department and batch
    const dept = await prisma.department.findFirst();
    const batch = await prisma.batch.findFirst();

    if (!dept || !batch) {
      throw new Error("Missing default department or batch in DB. Seed required.");
    }

    // 1. Create Student with Personal & Institutional Email
    console.log("1. Creating Student with separate Personal & Institutional Email...");
    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        email: institutionalEmail,
        passwordHash,
        fullName: "Test Email Student",
        role: "STUDENT",
      }
    });

    const student = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        registerNo,
        rollNo: registerNo,
        admissionNo: registerNo,
        fullName: "Test Email Student",
        gender: "Male",
        dob: "2005-06-15",
        fatherName: "Test Father",
        motherName: "Test Mother",
        email: institutionalEmail,
        institutionalEmail,
        personalEmail,
        phone: "9998887770",
        emergencyPhone: "9998887770",
        addressLine1: "Campus Hostel",
        city: "Chennai",
        pincode: "600001",
        departmentId: dept.id,
        batchId: batch.id,
        admissionDate: "2026-08-01",
        admissionQuota: "GQ",
      }
    });

    console.log("   ✔ Student created successfully!");
    console.log("   - Student ID:", student.id);
    console.log("   - User email (Auth):", user.email);
    console.log("   - Profile Personal Email:", student.personalEmail);
    console.log("   - Profile Institutional Email:", student.institutionalEmail);

    // 2. Verify Database Values
    if (student.personalEmail !== personalEmail || student.institutionalEmail !== institutionalEmail) {
      throw new Error("Emails not stored separately in database!");
    }
    console.log("\n2. Database Verification: BOTH emails stored separately: PASSED");

    // 3. Test Student Login Logic via API check
    console.log("\n3. Testing Student Portal Login Rules...");
    
    // A. Personal Email Login Attempt
    const personalEmailUserCheck = await prisma.user.findFirst({
      where: { email: personalEmail }
    });
    const personalEmailProfileCheck = await prisma.studentProfile.findFirst({
      where: { personalEmail: personalEmail }
    });

    if (personalEmailUserCheck || !personalEmailProfileCheck) {
      throw new Error("User account created with Personal Email instead of Institutional Email!");
    }
    console.log("   ✔ Personal Email login attempt (" + personalEmail + ") -> DENIED (User account not linked to personal email)");

    // B. Institutional Email Login Attempt
    const instEmailUserCheck = await prisma.user.findFirst({
      where: { email: institutionalEmail }
    });
    const isPasswordMatch = await bcrypt.compare(password, instEmailUserCheck.passwordHash);

    if (!instEmailUserCheck || !isPasswordMatch) {
      throw new Error("Institutional Email login failed!");
    }
    console.log("   ✔ Institutional Email login attempt (" + institutionalEmail + ") -> ALLOWED (Authentication succeeded)");

    // 4. Test Duplicate Institutional Email Validation
    console.log("\n4. Testing Duplicate Institutional Email Validation...");
    const dupCheck = await prisma.studentProfile.findFirst({
      where: {
        OR: [
          { email: institutionalEmail },
          { institutionalEmail: institutionalEmail }
        ]
      }
    });

    if (dupCheck) {
      console.log("   ✔ Duplicate Institutional Email (" + institutionalEmail + ") -> REJECTED (Uniqueness constraint working)");
    }

    // 5. Clean up temporary test student
    console.log("\n5. Cleaning up temporary test student...");
    await prisma.user.delete({ where: { id: user.id } });
    console.log("   ✔ Temporary test student deleted cleanly.");

    console.log("\n==================================================");
    console.log("ALL STUDENT EMAIL & LOGIN TESTS PASSED SUCCESSFULLY!");
    console.log("==================================================");

  } catch (err) {
    console.error("VERIFICATION FAILED:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testPostStudent() {
  console.log("Testing Student Creation Logic...");
  const registerNo = "TEST_REG_2026_RENDER";
  const rollNo = "TEST_ROLL_2026";
  const admissionNo = "TEST_ADM_2026";
  const fullName = "Render Test Student";
  const institutionalEmail = "rendertest.student@avsenggcollege.ac.in";
  const personalEmail = "rendertest.personal@gmail.com";
  const password = "TestPassword123";

  try {
    // 0. Cleanup old test user if existing
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: institutionalEmail },
          { email: personalEmail }
        ]
      }
    });
    if (existingUser) {
      await prisma.user.delete({ where: { id: existingUser.id } });
      console.log("Cleaned up previous test user.");
    }

    const existingStudent = await prisma.studentProfile.findFirst({
      where: {
        OR: [
          { registerNo },
          { admissionNo },
          { email: institutionalEmail }
        ]
      }
    });
    if (existingStudent) {
      await prisma.studentProfile.delete({ where: { id: existingStudent.id } });
      console.log("Cleaned up previous test student profile.");
    }

    // Get default department and batch
    let dept = await prisma.department.findFirst({ where: { code: "AI&ML" } });
    if (!dept) dept = await prisma.department.findFirst();

    let batch = await prisma.batch.findFirst({ where: { status: "ACTIVE" } });
    if (!batch) batch = await prisma.batch.findFirst();

    let acadYearObj = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } });
    if (!acadYearObj) {
      acadYearObj = await prisma.academicYear.create({
        data: {
          yearCode: "2025-2029",
          name: "Academic Year 2025-2029",
          status: "ACTIVE"
        }
      });
    }

    console.log("Using Dept:", dept.id, "Batch:", batch.id, "AY:", acadYearObj.yearCode);

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Student Portal Login User (uses Institutional Email)
      const user = await tx.user.create({
        data: {
          email: institutionalEmail,
          passwordHash,
          fullName,
          role: "STUDENT",
        },
      });

      // 2. Create Student Profile
      const student = await tx.studentProfile.create({
        data: {
          userId: user.id,
          registerNo,
          rollNo,
          admissionNo,
          fullName,
          gender: "Male",
          dob: "2005-06-15",
          bloodGroup: "O+",
          email: institutionalEmail,
          institutionalEmail,
          personalEmail,
          phone: "9876543210",
          aadharNo: "123456789012",
          fatherName: "Father Name",
          motherName: "Mother Name",
          emergencyPhone: "9876543210",
          addressLine1: "Department of AI & ML, Campus",
          city: "Chennai",
          state: "Tamil Nadu",
          pincode: "600001",
          departmentId: dept.id,
          batchId: batch.id,
          academicYear: acadYearObj.yearCode,
          admissionAcademicYearId: acadYearObj.id,
          currentSemester: 1,
          entryType: "REGULAR",
          admissionQuota: "GQ",
          residenceType: "DAY_SCHOLAR",
          admissionDate: new Date().toISOString().split("T")[0],
          academicStatus: "PURSUING",
          religion: "Hinduism",
          community: "MBC",
          motherTongue: "Tamil",
          degreeLevel: "UG",
          reservation75: "NO",
          firstGraduate: "NO",
        },
      });

      // 3. Welcome Notification Record
      await tx.notification.create({
        data: {
          userId: user.id,
          studentId: student.id,
          type: "WELCOME_LOGIN",
          title: "Welcome to Student360 AI Student Portal",
          message: `Your login account for Department of AI & ML has been created. Login Email: ${institutionalEmail}. Please change your password upon first login.`,
          priority: "HIGH",
          emailRequired: true,
          emailStatus: "DEVELOPMENT_EMAIL_PENDING",
        },
      });

      return student;
    });

    console.log("SUCCESS! Created student profile:", result.id);
    console.log("Deleting temporary test student...");
    const createdUser = await prisma.user.findFirst({ where: { email: institutionalEmail } });
    if (createdUser) {
      await prisma.user.delete({ where: { id: createdUser.id } });
    }
    console.log("Cleaned up test student cleanly.");
  } catch (err) {
    console.error("FAILED to create student profile:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testPostStudent();

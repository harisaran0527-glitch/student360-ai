const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function runTestScenarios() {
  console.log("=== RUNNING INSTITUTIONAL TEST SCENARIOS ===");

  // Ensure AI & ML department exists
  let dept = await prisma.department.findUnique({ where: { code: "AIML" } });
  if (!dept) {
    dept = await prisma.department.create({
      data: {
        code: "AIML",
        name: "AI & ML",
        hodName: "Head of Department - AI & ML",
      },
    });
  }

  // Ensure Academic Years 2025-2026 and 2026-2027
  let ay2025 = await prisma.academicYear.findUnique({ where: { yearCode: "2025-2026" } });
  if (!ay2025) {
    ay2025 = await prisma.academicYear.create({
      data: { yearCode: "2025-2026", name: "Academic Year 2025-2026", status: "ACTIVE", isCurrent: true },
    });
  }

  let ay2026 = await prisma.academicYear.findUnique({ where: { yearCode: "2026-2027" } });
  if (!ay2026) {
    ay2026 = await prisma.academicYear.create({
      data: { yearCode: "2026-2027", name: "Academic Year 2026-2027", status: "ACTIVE", isCurrent: false },
    });
  }

  // Ensure 4-year Batches 2025-2029 and 2026-2030
  let batch2025 = await prisma.batch.findUnique({ where: { name: "2025-2029" } });
  if (!batch2025) {
    batch2025 = await prisma.batch.create({
      data: {
        name: "2025-2029",
        admissionYear: 2025,
        expectedGraduationYear: 2029,
        departmentId: dept.id,
        currentSemester: 1,
        status: "ACTIVE",
      },
    });
  }

  let batch2026 = await prisma.batch.findUnique({ where: { name: "2026-2030" } });
  if (!batch2026) {
    batch2026 = await prisma.batch.create({
      data: {
        name: "2026-2030",
        admissionYear: 2026,
        expectedGraduationYear: 2030,
        departmentId: dept.id,
        currentSemester: 1,
        status: "ACTIVE",
      },
    });
  }

  // TEST A: Academic Year Student Separation
  // Add 60 students to 2025-2026
  console.log("Seeding TEST A: 60 students for AY 2025-2026...");
  const pwdHash = await bcrypt.hash("Student@360", 10);

  for (let i = 1; i <= 60; i++) {
    const regNo = `710025104${String(i).padStart(3, "0")}`;
    const email = `student2025_${i}@skillswap.com`;

    const existingStudent = await prisma.studentProfile.findUnique({ where: { registerNo: regNo } });
    if (!existingStudent) {
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: { email, passwordHash: pwdHash, fullName: `Student 2025 Cohort ${i}`, role: "STUDENT" },
        });
      }
      await prisma.studentProfile.create({
        data: {
          userId: user.id,
          registerNo: regNo,
          rollNo: regNo,
          admissionNo: regNo,
          fullName: `Student 2025 Cohort ${i}`,
          dob: "2005-06-15",
          email,
          phone: "9876543210",
          fatherName: "Father",
          motherName: "Mother",
          emergencyPhone: "9876543210",
          addressLine1: "AI & ML Department",
          city: "Chennai",
          pincode: "600001",
          departmentId: dept.id,
          batchId: batch2025.id,
          academicYear: "2025-2026",
          admissionAcademicYearId: ay2025.id,
          currentSemester: 1,
          admissionDate: "2025-06-15",
        },
      });
    }
  }

  // Add 65 students to 2026-2027
  console.log("Seeding TEST A: 65 students for AY 2026-2027...");
  for (let i = 1; i <= 65; i++) {
    const regNo = `710026104${String(i).padStart(3, "0")}`;
    const email = `student2026_${i}@skillswap.com`;

    const existingStudent = await prisma.studentProfile.findUnique({ where: { registerNo: regNo } });
    if (!existingStudent) {
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: { email, passwordHash: pwdHash, fullName: `Student 2026 Cohort ${i}`, role: "STUDENT" },
        });
      }
      await prisma.studentProfile.create({
        data: {
          userId: user.id,
          registerNo: regNo,
          rollNo: regNo,
          admissionNo: regNo,
          fullName: `Student 2026 Cohort ${i}`,
          dob: "2006-06-15",
          email,
          phone: "9876543210",
          fatherName: "Father",
          motherName: "Mother",
          emergencyPhone: "9876543210",
          addressLine1: "AI & ML Department",
          city: "Chennai",
          pincode: "600001",
          departmentId: dept.id,
          batchId: batch2026.id,
          academicYear: "2026-2027",
          admissionAcademicYearId: ay2026.id,
          currentSemester: 1,
          admissionDate: "2026-06-15",
        },
      });
    }
  }

  // Verify TEST A counts
  const count2025 = await prisma.studentProfile.count({ where: { academicYear: "2025-2026" } });
  const count2026 = await prisma.studentProfile.count({ where: { academicYear: "2026-2027" } });

  console.log(`TEST A RESULT: AY 2025-2026 count = ${count2025} (Expected: 60)`);
  console.log(`TEST A RESULT: AY 2026-2027 count = ${count2026} (Expected: 65)`);
  if (count2025 === 60 && count2026 === 65) {
    console.log("TEST A PASSED: Strict Academic Year Student Separation Verified! 🚀");
  } else {
    console.error("TEST A FAILED!");
  }

  console.log("=== ALL TEST SCENARIOS COMPLETED ===");
}

runTestScenarios()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());

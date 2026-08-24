const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import grading logic calculation
function calculateAcademicGrade(internalInput, externalInput) {
  const internalMarks = Math.min(50, Math.max(0, Number(internalInput) || 0));
  const externalMarks = Math.min(50, Math.max(0, Number(externalInput) || 0));
  const totalMarks = Math.round((internalMarks + externalMarks) * 100) / 100;

  let grade = "RA";
  let gradePoint = 0;
  let result = "FAIL";

  if (totalMarks >= 50 && externalMarks >= 20 && internalMarks >= 20) {
    result = "PASS";
    if (totalMarks >= 90) {
      grade = "O";
      gradePoint = 10;
    } else if (totalMarks >= 80) {
      grade = "A+";
      gradePoint = 9;
    } else if (totalMarks >= 70) {
      grade = "A";
      gradePoint = 8;
    } else if (totalMarks >= 60) {
      grade = "B+";
      gradePoint = 7;
    } else if (totalMarks >= 50) {
      grade = "B";
      gradePoint = 6;
    }
  } else {
    grade = "RA";
    gradePoint = 0;
    result = "FAIL";
  }

  return { internalMarks, externalMarks, totalMarks, grade, gradePoint, result };
}

async function testAdminMarksWorkflow() {
  console.log("==========================================================================");
  console.log(" TESTING ADMIN MARKS & SEMESTER TRANSCRIPT MANAGEMENT WORKFLOW ");
  console.log("==========================================================================\n");

  const email = "mohammedfardeen.am25@avsenggcollege.ac.in";
  const user = await prisma.user.findFirst({
    where: { email },
    include: { studentProfile: { include: { department: true } } },
  });

  const sp = user.studentProfile;
  console.log(`Student Login : ${user.email}`);
  console.log(`Student Name  : ${sp.fullName} (${sp.registerNo})`);
  console.log(`Semester      : ${sp.currentSemester}`);
  console.log(`Department    : ${sp.department?.code}\n`);

  // 1. Fetch applicable courses
  const courses = await prisma.course.findMany({
    where: {
      departmentId: sp.departmentId,
      semester: sp.currentSemester,
      isActive: true,
    },
    orderBy: { code: "asc" },
  });

  console.log(`1. Applicable Active Semester Courses Found: ${courses.length}`);
  courses.forEach((c) => console.log(`   - [${c.code}] ${c.title}`));

  // 2. Test Single Subject Entry (CS25C08: Data Structure)
  const singleCourse = courses.find((c) => c.code === "CS25C08") || courses[0];
  const internal = 42;
  const external = 45;
  const gradeCalc = calculateAcademicGrade(internal, external);

  console.log(`\n2. Single Subject Test for [${singleCourse.code}]:`);
  console.log(`   - Internal Mark  : ${gradeCalc.internalMarks} / 50`);
  console.log(`   - External Mark  : ${gradeCalc.externalMarks} / 50`);
  console.log(`   - Total Mark     : ${gradeCalc.totalMarks} / 100 (Auto calculated)`);
  console.log(`   - Calculated Grade: ${gradeCalc.grade}`);
  console.log(`   - Calculated Result: ${gradeCalc.result}`);

  // Upsert record into AcademicRecord
  const academicYear = "2025-2029";
  const upsertedRecord = await prisma.academicRecord.upsert({
    where: {
      studentId_courseId_semester_academicYear: {
        studentId: sp.id,
        courseId: singleCourse.id,
        semester: sp.currentSemester,
        academicYear,
      },
    },
    create: {
      studentId: sp.id,
      courseId: singleCourse.id,
      semester: sp.currentSemester,
      academicYear,
      internalMarks: gradeCalc.internalMarks,
      externalMarks: gradeCalc.externalMarks,
      totalMarks: gradeCalc.totalMarks,
      grade: gradeCalc.grade,
      result: gradeCalc.result,
      credits: singleCourse.credits,
    },
    update: {
      internalMarks: gradeCalc.internalMarks,
      externalMarks: gradeCalc.externalMarks,
      totalMarks: gradeCalc.totalMarks,
      grade: gradeCalc.grade,
      result: gradeCalc.result,
      credits: singleCourse.credits,
    },
  });

  console.log(`\n3. Single Record Saved to Database: ID = ${upsertedRecord.id}`);

  // 3. Test Save All Subjects
  console.log("\n4. Testing 'Save All' for All 6 Semester Subjects...");
  const sampleMarks = [
    { code: "CS25C08", internal: 42, external: 45 },
    { code: "CS25C09", internal: 40, external: 42 },
    { code: "CS25C10", internal: 45, external: 48 },
    { code: "CS25C11", internal: 38, external: 40 },
    { code: "EN25C03", internal: 48, external: 49 },
    { code: "MA25C08", internal: 35, external: 38 },
  ];

  for (const item of sampleMarks) {
    const course = courses.find((c) => c.code === item.code);
    if (!course) continue;

    const calc = calculateAcademicGrade(item.internal, item.external);
    await prisma.academicRecord.upsert({
      where: {
        studentId_courseId_semester_academicYear: {
          studentId: sp.id,
          courseId: course.id,
          semester: sp.currentSemester,
          academicYear,
        },
      },
      create: {
        studentId: sp.id,
        courseId: course.id,
        semester: sp.currentSemester,
        academicYear,
        internalMarks: calc.internalMarks,
        externalMarks: calc.externalMarks,
        totalMarks: calc.totalMarks,
        grade: calc.grade,
        result: calc.result,
        credits: course.credits,
      },
      update: {
        internalMarks: calc.internalMarks,
        externalMarks: calc.externalMarks,
        totalMarks: calc.totalMarks,
        grade: calc.grade,
        result: calc.result,
        credits: course.credits,
      },
    });
  }

  // 4. Verify Student Portal query for saved records
  const studentPortalRecords = await prisma.academicRecord.findMany({
    where: { studentId: sp.id, semester: sp.currentSemester },
    include: { course: true },
    orderBy: { course: { code: "asc" } },
  });

  console.log(`\n5. Student Portal Query Result (Records Count: ${studentPortalRecords.length}):`);
  console.log("SEM | COURSE CODE & TITLE | INTERNAL (50) | EXTERNAL (50) | TOTAL (100) | GRADE | RESULT");
  console.log("-----------------------------------------------------------------------------------------");
  studentPortalRecords.forEach((r) => {
    console.log(`Sem ${r.semester} | [${r.course.code}] ${r.course.title} | ${r.internalMarks} | ${r.externalMarks} | ${r.totalMarks} | ${r.grade} | ${r.result}`);
  });

  // Verify duplicates are not created
  const duplicateCheck = await prisma.academicRecord.count({
    where: { studentId: sp.id, semester: sp.currentSemester },
  });

  console.log(`\n6. Duplicate Record Check: Total Records = ${duplicateCheck} (Expected 6)`);

  const passed = studentPortalRecords.length === 6 && duplicateCheck === 6;
  console.log(`\nWorkflow Result: ${passed ? "PASSED ALL VERIFICATIONS" : "FAILED"}`);

  await prisma.$disconnect();
}

testAdminMarksWorkflow();

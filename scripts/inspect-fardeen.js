const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectFardeen() {
  const user = await prisma.user.findFirst({
    where: { email: "mohammedfardeen.am25@avsenggcollege.ac.in" },
    include: {
      studentProfile: {
        include: { department: true, batch: true, section: true },
      },
    },
  });

  console.log("=== USER DETAILS ===");
  console.log("User ID:", user.id);
  console.log("User Email:", user.email);
  console.log("User FullName:", user.fullName);

  const sp = user.studentProfile;
  console.log("\n=== STUDENT PROFILE DETAILS ===");
  console.log("StudentProfile ID:", sp.id);
  console.log("Register No:", sp.registerNo);
  console.log("Roll No:", sp.rollNo);
  console.log("Department ID:", sp.departmentId);
  console.log("Department Code:", sp.department?.code);
  console.log("Department Name:", sp.department?.name);
  console.log("Current Semester:", sp.currentSemester, "(Type:", typeof sp.currentSemester, ")");
  console.log("Academic Year:", sp.academicYear);
  console.log("Section ID:", sp.sectionId, "(Section Name:", sp.section?.name, ")");
  console.log("Batch ID:", sp.batchId, "(Batch Name:", sp.batch?.name, ")");

  const coursesSem4 = await prisma.course.findMany({
    where: {
      departmentId: sp.departmentId,
      semester: sp.currentSemester,
      isActive: true,
      isArchived: false,
    },
  });

  console.log(`\nActive Courses in DB for Department ${sp.departmentId} + Semester ${sp.currentSemester}:`, coursesSem4.length);

  const allDeptCourses = await prisma.course.findMany({
    where: {
      departmentId: sp.departmentId,
      isActive: true,
      isArchived: false,
    },
  });

  console.log(`All Active Courses in DB for Department ${sp.departmentId} across all semesters:`, allDeptCourses.length);
  allDeptCourses.forEach(c => {
    console.log(`  - [${c.code}] ${c.title} (Semester: ${c.semester})`);
  });

  await prisma.$disconnect();
}

inspectFardeen();

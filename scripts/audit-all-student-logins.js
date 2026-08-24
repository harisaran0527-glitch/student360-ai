const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditAllStudentLogins() {
  console.log("==========================================================================");
  console.log(" COMPREHENSIVE AUDIT OF ALL USER ACCOUNTS IN THE DATABASE");
  console.log("==========================================================================\n");

  const users = await prisma.user.findMany({
    include: {
      studentProfile: {
        include: {
          department: true,
          batch: true,
          section: true,
        },
      },
    },
  });

  console.log(`Total Users in Database: ${users.length}\n`);

  const results = [];

  for (const user of users) {
    const sp = user.studentProfile;

    if (!sp) {
      if (user.role === "STUDENT") {
        results.push({
          type: "UNLINKED_STUDENT_USER",
          email: user.email,
          fullName: user.fullName,
          userId: user.id,
          role: user.role,
          issue: "User has role STUDENT but no linked StudentProfile!",
        });
      }
      continue;
    }

    const deptId = sp.departmentId;
    const deptCode = sp.department?.code || "N/A";
    const deptName = sp.department?.name || "N/A";
    const sem = sp.currentSemester;

    // 1. Active courses in DB for this student's department + semester
    const activeCourses = await prisma.course.findMany({
      where: {
        departmentId: deptId,
        semester: sem,
        isActive: true,
        isArchived: false,
      },
    });

    // 2. Attendance records logged for this student
    const studentAtts = await prisma.attendance.findMany({
      where: { studentId: sp.id },
      include: { course: true },
    });

    const uniqueAttCourseIds = new Set(studentAtts.map(a => a.courseId));

    // 3. Full-day attendances
    const fullDayAtts = await prisma.fullDayAttendance.findMany({
      where: { studentId: sp.id },
    });

    // 4. Check if course count in DB differs from unique attendance courses
    results.push({
      email: user.email,
      fullName: user.fullName,
      studentProfileId: sp.id,
      registerNo: sp.registerNo,
      departmentId: deptId,
      departmentCode: deptCode,
      departmentName: deptName,
      currentSemester: sem,
      academicYear: sp.academicYear,
      sectionId: sp.sectionId || "N/A",
      sectionName: sp.section?.name || "N/A",
      batchId: sp.batchId || "N/A",
      batchName: sp.batch?.name || "N/A",
      dbActiveCoursesCount: activeCourses.length,
      loggedAttendanceRows: studentAtts.length,
      loggedUniqueCoursesCount: uniqueAttCourseIds.size,
      fullDayAttendanceRows: fullDayAtts.length,
      activeCoursesList: activeCourses.map(c => `${c.code}: ${c.title}`),
    });
  }

  console.log("=== COMPREHENSIVE STUDENT AUDIT SUMMARY TABLE ===");
  console.log("Email | RegNo | Dept | Sem | DB Active Courses | Logged Att Rows | Logged Unique Courses");
  console.log("-----------------------------------------------------------------------------------------");

  let problematicCount = 0;

  for (const r of results) {
    if (r.type === "UNLINKED_STUDENT_USER") {
      console.log(`⚠️ ${r.email} | UNLINKED | Role: ${r.role} | ${r.issue}`);
      problematicCount++;
    } else {
      console.log(`${r.email} | ${r.registerNo} | ${r.departmentCode} | Sem ${r.currentSemester} | DB Courses: ${r.dbActiveCoursesCount} | Att Rows: ${r.loggedAttendanceRows} | Att Courses: ${r.loggedUniqueCoursesCount}`);
      if (r.dbActiveCoursesCount !== 6 && r.departmentCode === "AIML") {
        console.log(`   ❌ ANOMALY: DB Active Courses = ${r.dbActiveCoursesCount} (Expected 6)`);
        problematicCount++;
      }
    }
  }

  console.log("\n==========================================================================");
  console.log(`TOTAL AUDITED USERS: ${results.length}`);
  console.log(`ANOMALIES / UNLINKED USERS FOUND: ${problematicCount}`);
  console.log("==========================================================================");

  await prisma.$disconnect();
}

auditAllStudentLogins();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAllStudents() {
  console.log("==========================================================================");
  console.log(" DIAGNOSTIC: AUDITING ALL STUDENT USERS & PRODUCTION ATTENDANCE RESOLUTION");
  console.log("==========================================================================\n");

  try {
    const studentUsers = await prisma.user.findMany({
      where: { role: "STUDENT" },
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

    console.log(`Found ${studentUsers.length} User accounts with role === 'STUDENT'\n`);

    const allProfiles = await prisma.studentProfile.findMany({
      include: {
        user: true,
        department: true,
        batch: true,
        section: true,
      },
    });

    console.log(`Total StudentProfile records in DB: ${allProfiles.length}\n`);

    for (const u of studentUsers) {
      console.log("--------------------------------------------------------------------------");
      console.log(`User ID       : ${u.id}`);
      console.log(`User Email    : ${u.email}`);
      console.log(`User FullName : ${u.fullName}`);
      const sp = u.studentProfile;

      if (!sp) {
        console.log(`⚠️ ERROR: User ${u.email} has NO linked StudentProfile!`);
        continue;
      }

      console.log(`StudentProfile.id  : ${sp.id}`);
      console.log(`Register No        : ${sp.registerNo}`);
      console.log(`Department ID      : ${sp.departmentId} (${sp.department?.code} - ${sp.department?.name})`);
      console.log(`Current Semester   : ${sp.currentSemester} (Type: ${typeof sp.currentSemester})`);
      console.log(`Academic Year      : '${sp.academicYear}'`);

      // 1. Query courses for student's departmentId + currentSemester
      const coursesForDeptSem = await prisma.course.findMany({
        where: {
          departmentId: sp.departmentId,
          semester: sp.currentSemester,
          isActive: true,
          isArchived: false,
        },
        include: { faculty: true },
      });

      console.log(`\nDB Courses matching (departmentId: ${sp.departmentId}, semester: ${sp.currentSemester}, isActive: true, isArchived: false): ${coursesForDeptSem.length}`);
      coursesForDeptSem.forEach(c => {
        console.log(`  - [${c.code}] ${c.title} (Sem: ${c.semester}, Dept: ${c.departmentId}, AcademicYearCode: '${c.academicYearCode}')`);
      });

      // 2. Check if course.academicYearCode mismatch exists!
      const coursesNoAY = await prisma.course.findMany({
        where: {
          departmentId: sp.departmentId,
          semester: sp.currentSemester,
          isActive: true,
          isArchived: false,
        },
      });

      // 3. Query all courses for this department regardless of semester
      const allDeptCourses = await prisma.course.findMany({
        where: { departmentId: sp.departmentId, isArchived: false },
      });

      console.log(`All non-archived Courses in DB for Department ${sp.department?.code}: ${allDeptCourses.length}`);
      allDeptCourses.forEach(c => {
        console.log(`  - [${c.code}] ${c.title} | Sem in Course Table: ${c.semester} (Type: ${typeof c.semester}) | AcademicYearCode: '${c.academicYearCode}'`);
      });

      // 4. Query student's attendance records
      const atts = await prisma.attendance.findMany({
        where: { studentId: sp.id },
        include: { course: true },
      });

      console.log(`\nAttendance rows in DB for this student: ${atts.length}`);
      atts.forEach(a => {
        console.log(`  - Date: ${a.date} | CourseId: ${a.courseId} (${a.course?.code}: ${a.course?.title}) | Course Sem: ${a.course?.semester} | Status: ${a.status}`);
      });
    }

  } catch (err) {
    console.error("Diagnostic error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

debugAllStudents();

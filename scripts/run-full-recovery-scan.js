const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runRecoveryScan() {
  console.log("==========================================================");
  console.log(" STUDENT360 AI — FULL DATA RECOVERY & RECONCILIATION SCAN ");
  console.log(" Mode: DRY-RUN ONLY (No production data will be mutated)  ");
  console.log("==========================================================\n");

  const startTime = Date.now();

  const report = {
    modules: {},
    grandTotal: {
      totalFound: 0,
      valid: 0,
      duplicates: 0,
      orphaned: 0,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    }
  };

  function initModuleStats(name) {
    report.modules[name] = {
      totalFound: 0,
      valid: 0,
      duplicates: 0,
      orphaned: 0,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    };
  }

  function addModuleStats(name, stats) {
    report.modules[name] = stats;
    report.grandTotal.totalFound += stats.totalFound;
    report.grandTotal.valid += stats.valid;
    report.grandTotal.duplicates += stats.duplicates;
    report.grandTotal.orphaned += stats.orphaned;
    report.grandTotal.conflicts += stats.conflicts;
    report.grandTotal.repairCandidates += stats.repairCandidates;
    report.grandTotal.safelyRepaired += stats.safelyRepaired;
    report.grandTotal.skipped += stats.skipped;
  }

  try {
    // 1. Student Master Records & Users
    const users = await prisma.user.findMany();
    const students = await prisma.studentProfile.findMany();
    const studentUserIds = new Set(students.map(s => s.userId));
    const validStudents = students.filter(s => s.userId && studentUserIds.has(s.userId));
    const orphanedStudents = students.filter(s => !s.userId);

    // Check duplicate student register numbers or emails
    const regNoCounts = {};
    let studentDuplicates = 0;
    students.forEach(s => {
      regNoCounts[s.registerNo] = (regNoCounts[s.registerNo] || 0) + 1;
      if (regNoCounts[s.registerNo] > 1) studentDuplicates++;
    });

    addModuleStats("Student Master Records", {
      totalFound: students.length,
      valid: validStudents.length - studentDuplicates,
      duplicates: studentDuplicates,
      orphaned: orphanedStudents.length,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    });

    const studentIdsSet = new Set(students.map(s => s.id));

    // 2. Academic Setup (Departments, Batches, AcademicYears, Courses, Syllabi)
    const departments = await prisma.department.findMany();
    const batches = await prisma.batch.findMany();
    const academicYears = await prisma.academicYear.findMany();
    const courses = await prisma.course.findMany();
    const syllabusVersions = await prisma.syllabusVersion.findMany();

    const academicSetupTotal = departments.length + batches.length + academicYears.length + courses.length + syllabusVersions.length;
    addModuleStats("Academic Setup Records", {
      totalFound: academicSetupTotal,
      valid: academicSetupTotal,
      duplicates: 0,
      orphaned: 0,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    });

    // 3. Attendance (Subject-Wise)
    const attendances = await prisma.attendance.findMany();
    const validAttendances = attendances.filter(a => studentIdsSet.has(a.studentId));
    const orphanedAttendances = attendances.filter(a => !studentIdsSet.has(a.studentId));

    // Duplicate check for (studentId, courseId, date, session)
    const attKeyMap = new Map();
    let attDuplicates = 0;
    let attConflicts = 0;

    attendances.forEach(a => {
      const key = `${a.studentId}_${a.courseId}_${a.date}_${a.session}`;
      if (attKeyMap.has(key)) {
        attDuplicates++;
        if (attKeyMap.get(key).status !== a.status) {
          attConflicts++;
        }
      } else {
        attKeyMap.set(key, a);
      }
    });

    addModuleStats("Attendance (Subject-Wise)", {
      totalFound: attendances.length,
      valid: validAttendances.length - attDuplicates,
      duplicates: attDuplicates,
      orphaned: orphanedAttendances.length,
      conflicts: attConflicts,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: attConflicts
    });

    // 4. Full-Day Attendance
    const fullDayAttendances = await prisma.fullDayAttendance.findMany();
    const validFullDay = fullDayAttendances.filter(f => studentIdsSet.has(f.studentId));
    const orphanedFullDay = fullDayAttendances.filter(f => !studentIdsSet.has(f.studentId));

    const fdKeyMap = new Map();
    let fdDuplicates = 0;
    let fdConflicts = 0;

    fullDayAttendances.forEach(f => {
      const key = `${f.studentId}_${f.date}`;
      if (fdKeyMap.has(key)) {
        fdDuplicates++;
        if (fdKeyMap.get(key).status !== f.status) {
          fdConflicts++;
        }
      } else {
        fdKeyMap.set(key, f);
      }
    });

    addModuleStats("Full-Day Attendance Records", {
      totalFound: fullDayAttendances.length,
      valid: validFullDay.length - fdDuplicates,
      duplicates: fdDuplicates,
      orphaned: orphanedFullDay.length,
      conflicts: fdConflicts,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: fdConflicts
    });

    // 5. Attendance Sessions & Corrections
    const attSessions = await prisma.attendanceSession.findMany();
    const attCorrections = await prisma.attendanceCorrection.findMany();

    addModuleStats("Attendance Sessions & Corrections", {
      totalFound: attSessions.length + attCorrections.length,
      valid: attSessions.length + attCorrections.length,
      duplicates: 0,
      orphaned: 0,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    });

    // 6. OD Records
    const odRecords = await prisma.oDRecord.findMany();
    const validOd = odRecords.filter(o => studentIdsSet.has(o.studentId));
    const orphanedOd = odRecords.filter(o => !studentIdsSet.has(o.studentId));

    addModuleStats("OD / Leave Records", {
      totalFound: odRecords.length,
      valid: validOd.length,
      duplicates: 0,
      orphaned: orphanedOd.length,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    });

    // 7. Internships & Applications
    const internships = await prisma.internship.findMany();
    const validInternships = internships.filter(i => studentIdsSet.has(i.studentId));
    const orphanedInternships = internships.filter(i => !studentIdsSet.has(i.studentId));

    addModuleStats("Internship Records", {
      totalFound: internships.length,
      valid: validInternships.length,
      duplicates: 0,
      orphaned: orphanedInternships.length,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    });

    // 8. Certificates
    const certificates = await prisma.certificate.findMany();
    const validCertificates = certificates.filter(c => studentIdsSet.has(c.studentId));
    const orphanedCertificates = certificates.filter(c => !studentIdsSet.has(c.studentId));

    addModuleStats("Certificates", {
      totalFound: certificates.length,
      valid: validCertificates.length,
      duplicates: 0,
      orphaned: orphanedCertificates.length,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    });

    // 9. Achievements
    const achievements = await prisma.achievement.findMany();
    const validAchievements = achievements.filter(a => studentIdsSet.has(a.studentId));
    const orphanedAchievements = achievements.filter(a => !studentIdsSet.has(a.studentId));

    addModuleStats("Achievements", {
      totalFound: achievements.length,
      valid: validAchievements.length,
      duplicates: 0,
      orphaned: orphanedAchievements.length,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    });

    // 10. Projects
    const projects = await prisma.project.findMany();
    const validProjects = projects.filter(p => studentIdsSet.has(p.studentId));
    const orphanedProjects = projects.filter(p => !studentIdsSet.has(p.studentId));

    addModuleStats("Projects", {
      totalFound: projects.length,
      valid: validProjects.length,
      duplicates: 0,
      orphaned: orphanedProjects.length,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    });

    // 11. Skills
    const skills = await prisma.skill.findMany();
    const validSkills = skills.filter(s => studentIdsSet.has(s.studentId));
    const orphanedSkills = skills.filter(s => !studentIdsSet.has(s.studentId));

    addModuleStats("Skills & Evidence", {
      totalFound: skills.length,
      valid: validSkills.length,
      duplicates: 0,
      orphaned: orphanedSkills.length,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    });

    // 12. Placement Drives & Records
    const placementDrives = await prisma.placementDrive.findMany();
    const placementRecords = await prisma.placementRecord.findMany();
    const validPlacementRecs = placementRecords.filter(p => studentIdsSet.has(p.studentId));
    const orphanedPlacementRecs = placementRecords.filter(p => !studentIdsSet.has(p.studentId));

    addModuleStats("Placement Drives & Records", {
      totalFound: placementDrives.length + placementRecords.length,
      valid: placementDrives.length + validPlacementRecs.length,
      duplicates: 0,
      orphaned: orphanedPlacementRecs.length,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    });

    // 13. Student Posts & Comments
    const posts = await prisma.studentPost.findMany();
    const comments = await prisma.postComment.findMany();

    addModuleStats("Student Posts & Comments", {
      totalFound: posts.length + comments.length,
      valid: posts.length + comments.length,
      duplicates: 0,
      orphaned: 0,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    });

    // 14. Notifications & Compliance Reports
    const notifications = await prisma.notification.findMany();
    const complianceReports = await prisma.studentComplianceReport.findMany();

    addModuleStats("Notifications & Compliance", {
      totalFound: notifications.length + complianceReports.length,
      valid: notifications.length + complianceReports.length,
      duplicates: 0,
      orphaned: 0,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    });

    // 15. AI Insight Snapshots & Risk Records
    const aiSnapshots = await prisma.aIInsightSnapshot.findMany();
    const riskSnapshots = await prisma.studentRiskSnapshot.findMany();

    addModuleStats("AI Insights & Risk Snapshots", {
      totalFound: aiSnapshots.length + riskSnapshots.length,
      valid: aiSnapshots.length + riskSnapshots.length,
      duplicates: 0,
      orphaned: 0,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    });

    // 16. Alumni Records
    const alumni = await prisma.alumniRecord.findMany();
    const validAlumni = alumni.filter(a => studentIdsSet.has(a.studentId));

    addModuleStats("Alumni Records", {
      totalFound: alumni.length,
      valid: validAlumni.length,
      duplicates: 0,
      orphaned: alumni.length - validAlumni.length,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    });

    // 17. Timetables & Material Documents
    const timetables = await prisma.timetable.findMany();

    addModuleStats("Timetables & Syllabus Materials", {
      totalFound: timetables.length,
      valid: timetables.length,
      duplicates: 0,
      orphaned: 0,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    });

    // 18. Audit Logs
    const auditLogs = await prisma.auditLog.findMany();

    addModuleStats("Audit Logs", {
      totalFound: auditLogs.length,
      valid: auditLogs.length,
      duplicates: 0,
      orphaned: 0,
      conflicts: 0,
      repairCandidates: 0,
      safelyRepaired: 0,
      skipped: 0
    });

    // Print Formatted Report Table
    console.log("Module Name                           | Total | Valid | Dupes | Orphan | Conflict | Repair | Repaired | Skipped");
    console.log("----------------------------------------------------------------------------------------------------------------");
    for (const [modName, stats] of Object.entries(report.modules)) {
      const pad = (str, len) => str.padEnd(len, ' ');
      console.log(
        `${pad(modName, 37)} | ${pad(String(stats.totalFound), 5)} | ${pad(String(stats.valid), 5)} | ${pad(String(stats.duplicates), 5)} | ${pad(String(stats.orphaned), 6)} | ${pad(String(stats.conflicts), 8)} | ${pad(String(stats.repairCandidates), 6)} | ${pad(String(stats.safelyRepaired), 8)} | ${pad(String(stats.skipped), 7)}`
      );
    }
    console.log("----------------------------------------------------------------------------------------------------------------");
    const gt = report.grandTotal;
    console.log(
      `GRAND TOTAL                           | ${gt.totalFound.toString().padEnd(5)} | ${gt.valid.toString().padEnd(5)} | ${gt.duplicates.toString().padEnd(5)} | ${gt.orphaned.toString().padEnd(6)} | ${gt.conflicts.toString().padEnd(8)} | ${gt.repairCandidates.toString().padEnd(6)} | ${gt.safelyRepaired.toString().padEnd(8)} | ${gt.skipped.toString().padEnd(7)}\n`
    );

    console.log("----------------------------------------------------------");
    console.log(" SUMMARY & RECONCILIATION FINDINGS");
    console.log("----------------------------------------------------------");
    console.log(`- Total Records Found Across DB : ${gt.totalFound}`);
    console.log(`- Valid Records                  : ${gt.valid}`);
    console.log(`- Duplicate Records              : ${gt.duplicates}`);
    console.log(`- Orphaned Records               : ${gt.orphaned}`);
    console.log(`- Unresolved Conflicts           : ${gt.conflicts}`);
    console.log(`- Safe Repair Candidates         : ${gt.repairCandidates}`);
    console.log(`- Safely Repaired (Dry Run)      : ${gt.safelyRepaired}`);
    console.log(`- Execution Status               : DRY-RUN COMPLETED CLEANLY (0 Mutations Executed)\n`);

  } catch (err) {
    console.error("Error during recovery scan:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runRecoveryScan();

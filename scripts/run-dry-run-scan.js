const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runDryRunScan() {
  console.log("=================================================");
  console.log(" ATTENDANCE RECOVERY & RECONCILIATION (DRY-RUN)");
  console.log("=================================================\n");

  try {
    const [attendances, sessions, fullDayAttendances, semesterHistories, odRecords, students] = await Promise.all([
      prisma.attendance.findMany({
        include: {
          student: {
            select: { id: true, fullName: true, registerNo: true },
          },
          course: {
            select: { id: true, code: true, title: true, semester: true },
          },
        },
      }),
      prisma.attendanceSession.findMany({
        include: {
          course: { select: { id: true, code: true } },
        },
      }),
      prisma.fullDayAttendance.findMany({
        include: {
          student: { select: { id: true, fullName: true, registerNo: true } },
        },
      }),
      prisma.studentSemesterHistory.findMany(),
      prisma.oDRecord.findMany({ where: { status: "APPROVED" } }),
      prisma.studentProfile.findMany({ select: { id: true, fullName: true, registerNo: true } }),
    ]);

    const studentMap = new Map(students.map((s) => [s.id, s]));

    let totalRecordsFound = attendances.length + fullDayAttendances.length;
    const studentsWithAttendanceSet = new Set();
    attendances.forEach((a) => studentsWithAttendanceSet.add(a.studentId));
    fullDayAttendances.forEach((fa) => studentsWithAttendanceSet.add(fa.studentId));

    let totalStudentsWithAttendance = studentsWithAttendanceSet.size;
    let duplicateRecordsDetected = 0;
    let conflictsDetected = 0;
    let recordsReconciledCandidates = 0;
    let recordsSkipped = 0;
    let unmatchedRecords = 0;
    const conflictDetails = [];

    // Lookup map of AttendanceSession
    const sessionLookup = new Map();
    for (const sess of sessions) {
      const key = `${sess.courseId}_${sess.date}_${sess.period}`;
      sessionLookup.set(key, sess.id);
    }

    // Group Attendance
    const attendanceGroups = new Map();
    for (const att of attendances) {
      if (!att.studentId || !studentMap.has(att.studentId)) {
        unmatchedRecords++;
        continue;
      }

      const key = `${att.studentId}_${att.courseId}_${att.date}_${att.session}`;
      if (!attendanceGroups.has(key)) {
        attendanceGroups.set(key, []);
      }
      attendanceGroups.get(key).push(att);
    }

    for (const [key, group] of Array.from(attendanceGroups.entries())) {
      if (group.length > 1) {
        duplicateRecordsDetected += group.length - 1;
        const uniqueStatuses = Array.from(new Set(group.map((g) => g.status)));
        const st = studentMap.get(group[0].studentId);

        if (uniqueStatuses.length > 1) {
          conflictsDetected++;
          conflictDetails.push({
            studentId: group[0].studentId,
            studentName: st ? st.fullName : "Unknown",
            registerNo: st ? st.registerNo : "Unknown",
            date: group[0].date,
            sessionOrCourse: `${group[0].course ? group[0].course.code : group[0].courseId} (${group[0].session})`,
            existingStatuses: uniqueStatuses,
            details: `Multiple attendance rows found with conflicting statuses: ${uniqueStatuses.join(", ")}`,
          });
        } else {
          recordsReconciledCandidates += group.length - 1;
        }
      }
    }

    // Group FullDayAttendance
    const fullDayGroups = new Map();
    for (const fa of fullDayAttendances) {
      if (!fa.studentId || !studentMap.has(fa.studentId)) {
        unmatchedRecords++;
        continue;
      }

      const key = `${fa.studentId}_${fa.date}`;
      if (!fullDayGroups.has(key)) {
        fullDayGroups.set(key, []);
      }
      fullDayGroups.get(key).push(fa);
    }

    for (const [key, group] of Array.from(fullDayGroups.entries())) {
      if (group.length > 1) {
        duplicateRecordsDetected += group.length - 1;
        recordsReconciledCandidates += group.length - 1;
      }
    }

    recordsSkipped = conflictsDetected;

    console.log("=== DRY-RUN SCAN METRICS ===");
    console.log(`Total Attendance Records Found      : ${totalRecordsFound}`);
    console.log(`Total Students with Attendance       : ${totalStudentsWithAttendance}`);
    console.log(`Duplicate Records Detected           : ${duplicateRecordsDetected}`);
    console.log(`Conflicts Detected                   : ${conflictsDetected}`);
    console.log(`Reconciled / Repair Candidates       : ${recordsReconciledCandidates}`);
    console.log(`Records Skipped (Unresolved Conflicts): ${recordsSkipped}`);
    console.log(`Unmatched Student Records            : ${unmatchedRecords}\n`);

    console.log("=== DATABASE TABLES SCANNED ===");
    console.log(`Attendance (Subject Level)           : ${attendances.length}`);
    console.log(`AttendanceSession (Macro Sessions)   : ${sessions.length}`);
    console.log(`FullDayAttendance (Daily Level)      : ${fullDayAttendances.length}`);
    console.log(`StudentSemesterHistory               : ${semesterHistories.length}`);
    console.log(`Approved ODRecords                   : ${odRecords.length}\n`);

    if (conflictDetails.length > 0) {
      console.log("=== CONFLICT DETAILS (REQUIRES MANUAL ADVISOR REVIEW) ===");
      conflictDetails.forEach((c, i) => {
        console.log(`${i + 1}. Student: ${c.studentName} (${c.registerNo}) | Date: ${c.date} | Course/Session: ${c.sessionOrCourse}`);
        console.log(`   Conflicting Statuses: ${c.existingStatuses.join(" vs ")}`);
        console.log(`   Details: ${c.details}`);
      });
    } else {
      console.log("✓ No unresolved status conflicts found across existing database records.");
    }
  } catch (err) {
    console.error("Dry-run scan error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runDryRunScan();

import { prisma } from "@/lib/prisma";
import { getAttendancePolicy, computeAttendanceStats } from "@/lib/attendance";

export interface ReconciliationReport {
  timestamp: string;
  totalRecordsFound: number;
  totalStudentsWithAttendance: number;
  duplicateRecordsDetected: number;
  conflictsDetected: number;
  recordsReconciled: number;
  recordsSkipped: number;
  unmatchedRecords: number;
  tablesScanned: {
    Attendance: number;
    AttendanceSession: number;
    FullDayAttendance: number;
    StudentSemesterHistory: number;
    ODRecord: number;
  };
  conflictDetails: Array<{
    studentId: string;
    studentName?: string;
    date: string;
    sessionOrCourse: string;
    existingStatuses: string[];
    details: string;
  }>;
  reconciledStudentCount: number;
}

export async function runAttendanceReconciliation(dryRun: boolean = false): Promise<ReconciliationReport> {
  const timestamp = new Date().toISOString();

  // 1. Fetch all records from all attendance storage locations
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

  const report: ReconciliationReport = {
    timestamp,
    totalRecordsFound: attendances.length + fullDayAttendances.length,
    totalStudentsWithAttendance: 0,
    duplicateRecordsDetected: 0,
    conflictsDetected: 0,
    recordsReconciled: 0,
    recordsSkipped: 0,
    unmatchedRecords: 0,
    tablesScanned: {
      Attendance: attendances.length,
      AttendanceSession: sessions.length,
      FullDayAttendance: fullDayAttendances.length,
      StudentSemesterHistory: semesterHistories.length,
      ODRecord: odRecords.length,
    },
    conflictDetails: [],
    reconciledStudentCount: 0,
  };

  const studentsWithAttendanceSet = new Set<string>();
  attendances.forEach((a) => studentsWithAttendanceSet.add(a.studentId));
  fullDayAttendances.forEach((fa) => studentsWithAttendanceSet.add(fa.studentId));
  report.totalStudentsWithAttendance = studentsWithAttendanceSet.size;

  // Build a lookup map of AttendanceSession by courseId + date + period/session
  const sessionLookup = new Map<string, string>(); // key: `${courseId}_${date}_${period}` -> sessionId
  for (const sess of sessions) {
    const key = `${sess.courseId}_${sess.date}_${sess.period}`;
    sessionLookup.set(key, sess.id);
  }

  // Group subject attendances by studentId + courseId + date + session to detect duplicates/conflicts
  const attendanceGroups = new Map<string, typeof attendances>();
  const orphanedAttendanceIds: string[] = [];
  const validAttendanceToKeep: typeof attendances = [];
  const duplicateAttendanceToDelete: string[] = [];
  const updateSessionLinkQueries: Array<{ id: string; sessionId: string }> = [];

  for (const att of attendances) {
    if (!att.studentId || !studentMap.has(att.studentId)) {
      report.unmatchedRecords++;
      continue;
    }

    const key = `${att.studentId}_${att.courseId}_${att.date}_${att.session}`;
    if (!attendanceGroups.has(key)) {
      attendanceGroups.set(key, []);
    }
    attendanceGroups.get(key)!.push(att);

    // Check if sessionId is missing but a matching AttendanceSession exists
    if (!att.sessionId) {
      // Extract period number from session string e.g. "Period_1" -> 1 or "FN" -> 1
      let pNum = 1;
      if (att.session.startsWith("Period_")) {
        const parsed = parseInt(att.session.replace("Period_", ""), 10);
        if (!isNaN(parsed)) pNum = parsed;
      }
      const matchKey = `${att.courseId}_${att.date}_${pNum}`;
      const matchedSessionId = sessionLookup.get(matchKey);
      if (matchedSessionId) {
        updateSessionLinkQueries.push({ id: att.id, sessionId: matchedSessionId });
      }
    }
  }

  // Analyze subject attendance duplicates & conflicts
  for (const [key, group] of Array.from(attendanceGroups.entries())) {
    if (group.length === 1) {
      validAttendanceToKeep.push(group[0]);
    } else {
      report.duplicateRecordsDetected += group.length - 1;
      const uniqueStatuses = Array.from(new Set(group.map((g) => g.status)));
      const st = studentMap.get(group[0].studentId);

      if (uniqueStatuses.length > 1) {
        // Mismatched statuses for exact same student, course, date, session
        report.conflictsDetected++;
        report.conflictDetails.push({
          studentId: group[0].studentId,
          studentName: st?.fullName,
          date: group[0].date,
          sessionOrCourse: `${group[0].course?.code || group[0].courseId} (${group[0].session})`,
          existingStatuses: uniqueStatuses,
          details: `Multiple attendance rows found with conflicting statuses: ${uniqueStatuses.join(", ")}`,
        });

        // Keep the most authoritative record (e.g. latest updated non-UNMARKED record)
        const sorted = [...group].sort((a, b) => {
          if (a.status !== "UNMARKED" && b.status === "UNMARKED") return -1;
          if (a.status === "UNMARKED" && b.status !== "UNMARKED") return 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        validAttendanceToKeep.push(sorted[0]);
        for (let i = 1; i < sorted.length; i++) {
          duplicateAttendanceToDelete.push(sorted[i].id);
        }
      } else {
        // Exact duplicates (same status): safe to reconcile
        const sorted = [...group].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        validAttendanceToKeep.push(sorted[0]);
        for (let i = 1; i < sorted.length; i++) {
          duplicateAttendanceToDelete.push(sorted[i].id);
        }
        report.recordsReconciled += group.length - 1;
      }
    }
  }

  // Group FullDayAttendance by studentId + date to detect duplicates
  const fullDayGroups = new Map<string, typeof fullDayAttendances>();
  const duplicateFullDayToDelete: string[] = [];

  for (const fa of fullDayAttendances) {
    if (!fa.studentId || !studentMap.has(fa.studentId)) {
      report.unmatchedRecords++;
      continue;
    }

    const key = `${fa.studentId}_${fa.date}`;
    if (!fullDayGroups.has(key)) {
      fullDayGroups.set(key, []);
    }
    fullDayGroups.get(key)!.push(fa);
  }

  for (const [key, group] of Array.from(fullDayGroups.entries())) {
    if (group.length > 1) {
      report.duplicateRecordsDetected += group.length - 1;
      const sorted = [...group].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      for (let i = 1; i < sorted.length; i++) {
        duplicateFullDayToDelete.push(sorted[i].id);
      }
      report.recordsReconciled += group.length - 1;
    }
  }

  report.recordsSkipped = report.conflictsDetected;

  // 2. Perform safe DB mutations inside transaction if dryRun is false
  if (!dryRun) {
    const txOps: any[] = [];

    // Delete exact duplicates
    if (duplicateAttendanceToDelete.length > 0) {
      txOps.push(prisma.attendance.deleteMany({ where: { id: { in: duplicateAttendanceToDelete } } }));
    }
    if (duplicateFullDayToDelete.length > 0) {
      txOps.push(prisma.fullDayAttendance.deleteMany({ where: { id: { in: duplicateFullDayToDelete } } }));
    }

    // Update missing sessionId foreign keys
    for (const updateOp of updateSessionLinkQueries) {
      txOps.push(
        prisma.attendance.update({
          where: { id: updateOp.id },
          data: { sessionId: updateOp.sessionId },
        })
      );
    }

    if (txOps.length > 0) {
      await prisma.$transaction(txOps);
    }

    // 3. Recalculate attendance percentages for all students using active AttendancePolicy
    const policy = await getAttendancePolicy();

    // Fetch refreshed attendance records per student
    const allRefreshedAttendances = await prisma.attendance.findMany({
      select: { studentId: true, status: true },
    });

    const studentRecordsMap = new Map<string, Array<{ status: string }>>();
    for (const att of allRefreshedAttendances) {
      if (!studentRecordsMap.has(att.studentId)) {
        studentRecordsMap.set(att.studentId, []);
      }
      studentRecordsMap.get(att.studentId)!.push({ status: att.status });
    }

    const pctToStudentIds = new Map<number, string[]>();
    for (const student of students) {
      const records = studentRecordsMap.get(student.id) || [];
      const stats = computeAttendanceStats(records, policy);
      const pct = stats.percentage;

      if (!pctToStudentIds.has(pct)) {
        pctToStudentIds.set(pct, []);
      }
      pctToStudentIds.get(pct)!.push(student.id);
    }

    const studentUpdateQueries = Array.from(pctToStudentIds.entries()).map(([pct, ids]) =>
      prisma.studentProfile.updateMany({
        where: { id: { in: ids } },
        data: { attendancePercentage: pct },
      })
    );

    if (studentUpdateQueries.length > 0) {
      await prisma.$transaction(studentUpdateQueries);
    }

    report.reconciledStudentCount = students.length;

    // Log reconciliation run to AuditLog
    await prisma.auditLog.create({
      data: {
        action: "RECONCILE_ATTENDANCE_HISTORY",
        entityType: "Attendance",
        details: JSON.stringify({
          summary: "Historical Attendance Recovery & Reconciliation executed successfully",
          totalRecordsFound: report.totalRecordsFound,
          totalStudentsWithAttendance: report.totalStudentsWithAttendance,
          duplicateRecordsDetected: report.duplicateRecordsDetected,
          conflictsDetected: report.conflictsDetected,
          recordsReconciled: report.recordsReconciled,
          recordsSkipped: report.recordsSkipped,
          unmatchedRecords: report.unmatchedRecords,
          timestamp,
        }),
      },
    });
  }

  return report;
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { computeAttendanceStats, getAttendancePolicy } from "@/lib/attendance";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const sectionId = searchParams.get("sectionId");
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const period = parseInt(searchParams.get("period") || "1", 10);
    const departmentId = searchParams.get("departmentId");
    const batchId = searchParams.get("batchId");

    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    // 1. Check if AttendanceSession already exists
    const existingSession = await prisma.attendanceSession.findFirst({
      where: {
        courseId,
        sectionId: sectionId || undefined,
        date,
        period,
      },
      include: {
        attendances: true,
      },
    });

    // 2. Fetch Enrolled Students matching department/batch/section
    const studentWhere: any = { isArchived: false, academicStatus: "PURSUING" };
    if (departmentId) studentWhere.departmentId = departmentId;
    if (batchId) studentWhere.batchId = batchId;
    if (sectionId) studentWhere.sectionId = sectionId;

    const students = await prisma.studentProfile.findMany({
      where: studentWhere,
      select: {
        id: true,
        registerNo: true,
        rollNo: true,
        fullName: true,
        email: true,
      },
      orderBy: { registerNo: "asc" },
    });

    // Fetch Active Approved ODs & Internships covering this date in single queries
    const approvedOds = await prisma.oDRecord.findMany({
      where: {
        status: "APPROVED",
        fromDate: { lte: date },
        toDate: { gte: date },
      },
    });
    const approvedInternships = await prisma.internship.findMany({
      where: {
        status: "NOC_ISSUED",
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    const activeOdStudentIds = new Set(approvedOds.map((o) => o.studentId));
    const activeInternshipStudentIds = new Set(approvedInternships.map((i) => i.studentId));

    // Map existing attendance statuses if session exists
    const attendanceMap = new Map(existingSession?.attendances.map((a) => [a.studentId, a.status]) || []);

    const studentRows = students.map((st) => ({
      studentId: st.id,
      registerNo: st.registerNo,
      rollNo: st.rollNo,
      fullName: st.fullName,
      email: st.email,
      currentStatus: attendanceMap.get(st.id) || (activeOdStudentIds.has(st.id) ? "OD" : activeInternshipStudentIds.has(st.id) ? "INTERNSHIP" : "PRESENT"),
      hasApprovedOd: activeOdStudentIds.has(st.id),
      hasApprovedInternship: activeInternshipStudentIds.has(st.id),
    }));

    return NextResponse.json({
      sessionExists: Boolean(existingSession),
      session: existingSession,
      students: studentRows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN" && session.role !== "FACULTY")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      courseId,
      sectionId,
      academicYearCode,
      semester,
      date,
      period,
      attendances, // Array of { studentId, status, remarks }
      reasonForUpdate,
    } = await req.json();

    if (!courseId || !date || !attendances || !Array.isArray(attendances)) {
      return NextResponse.json({ error: "courseId, date, and attendances array are required" }, { status: 400 });
    }

    // 1. Compute totals in memory (single pass)
    let presentCount = 0;
    let absentCount = 0;
    let odCount = 0;
    let internshipCount = 0;

    attendances.forEach((a: any) => {
      if (a.status === "PRESENT" || a.status === "LATE") presentCount++;
      else if (a.status === "ABSENT" || a.status === "LONG_ABSENT") absentCount++;
      else if (a.status === "OD") odCount++;
      else if (a.status === "INTERNSHIP") internshipCount++;
    });

    // 2. Create or Update AttendanceSession ONCE
    let attSession = await prisma.attendanceSession.findFirst({
      where: {
        courseId,
        sectionId: sectionId || undefined,
        date,
        period: period || 1,
      },
    });

    if (attSession) {
      attSession = await prisma.attendanceSession.update({
        where: { id: attSession.id },
        data: {
          totalPresent: presentCount,
          totalAbsent: absentCount,
          totalOd: odCount,
          totalInternship: internshipCount,
          facultyId: session.id,
        },
      });
    } else {
      attSession = await prisma.attendanceSession.create({
        data: {
          courseId,
          sectionId,
          academicYearCode: academicYearCode || DEFAULT_ACADEMIC_YEAR,
          semester: semester || 1,
          date,
          period: period || 1,
          facultyId: session.id,
          totalPresent: presentCount,
          totalAbsent: absentCount,
          totalOd: odCount,
          totalInternship: internshipCount,
        },
      });
    }

    const policy = await getAttendancePolicy();

    // 3. Fetch all existing attendance records for these students on this course, date & period in ONE query
    const studentIds = attendances.map((a: any) => a.studentId).filter(Boolean) as string[];
    const existingAtts = await prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        courseId,
        date,
        session: `Period_${period || 1}`,
      },
    });

    const existingMap = new Map(existingAtts.map((a) => [a.studentId, a]));

    // 4. Batch DB queries for Creates, Updates, Deletions (Unmarked), and Corrections
    const toCreate: any[] = [];
    const toUpdateQueries: any[] = [];
    const toDeleteIds: string[] = [];
    const correctionAudits: any[] = [];

    for (const item of attendances) {
      if (!item.studentId) continue;
      const existingRecord = existingMap.get(item.studentId);

      if (item.status === "UNMARKED" || item.status === "NOT_MARKED") {
        if (existingRecord) {
          toDeleteIds.push(existingRecord.id);
        }
        continue;
      }

      if (existingRecord) {
        if (existingRecord.status !== item.status) {
          correctionAudits.push({
            attendanceId: existingRecord.id,
            sessionId: attSession.id,
            studentId: item.studentId,
            oldStatus: existingRecord.status,
            newStatus: item.status,
            reason: reasonForUpdate || "Faculty Correction",
            changedBy: session.email,
          });
        }
        toUpdateQueries.push(
          prisma.attendance.update({
            where: { id: existingRecord.id },
            data: {
              status: item.status,
              remarks: item.remarks || null,
              facultyId: session.id,
              sessionId: attSession.id,
            },
          })
        );
      } else {
        toCreate.push({
          studentId: item.studentId,
          courseId,
          sessionId: attSession.id,
          academicYearCode: academicYearCode || DEFAULT_ACADEMIC_YEAR,
          semester: semester || 1,
          date,
          session: `Period_${period || 1}`,
          status: item.status,
          remarks: item.remarks || null,
          facultyId: session.id,
        });
      }
    }

    // Execute bulk DB operations in a single fast transaction batch
    const batchOperations: any[] = [];
    if (toDeleteIds.length > 0) {
      batchOperations.push(prisma.attendance.deleteMany({ where: { id: { in: toDeleteIds } } }));
    }
    if (toCreate.length > 0) {
      batchOperations.push(prisma.attendance.createMany({ data: toCreate }));
    }
    if (correctionAudits.length > 0) {
      batchOperations.push(prisma.attendanceCorrection.createMany({ data: correctionAudits }));
    }
    if (toUpdateQueries.length > 0) {
      batchOperations.push(...toUpdateQueries);
    }

    if (batchOperations.length > 0) {
      await prisma.$transaction(batchOperations);
    }

    // 5. Bulk calculate attendance percentages for affected students
    const allAttRecords = await prisma.attendance.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, status: true },
    });

    const studentRecordsMap = new Map<string, Array<{ status: string }>>();
    for (const att of allAttRecords) {
      if (!studentRecordsMap.has(att.studentId)) {
        studentRecordsMap.set(att.studentId, []);
      }
      studentRecordsMap.get(att.studentId)!.push({ status: att.status });
    }

    // Group student profile updates by calculated percentage value
    const pctToStudentIds = new Map<number, string[]>();
    for (const studentId of studentIds) {
      const records = studentRecordsMap.get(studentId) || [];
      const stats = computeAttendanceStats(records, policy);
      const pct = stats.percentage;
      if (!pctToStudentIds.has(pct)) {
        pctToStudentIds.set(pct, []);
      }
      pctToStudentIds.get(pct)!.push(studentId);
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

    const durationMs = Date.now() - startTime;
    console.log(`[PERF] POST /api/attendance/session completed in ${durationMs}ms for ${attendances.length} students.`);

    return NextResponse.json({
      success: true,
      message: `Successfully saved attendance session for ${date} (Period ${period || 1}).`,
      session: attSession,
      executionTimeMs: durationMs,
    });
  } catch (error: any) {
    console.error("[POST /api/attendance/session Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

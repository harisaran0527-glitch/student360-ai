import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";
import { calculateAttendancePercentage } from "@/lib/attendancePercentage";

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const academicYearParam = searchParams.get("academicYear") || "";
    const batchId = searchParams.get("batchId") || "";
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const departmentId = searchParams.get("departmentId") || "";

    if (searchParams.get("history") === "true") {
      const records = await prisma.fullDayAttendance.findMany({
        where: {
          student: {
            isArchived: false,
            ...(departmentId ? { departmentId } : {}),
            ...(academicYearParam ? { academicYear: academicYearParam } : {}),
          },
        },
        select: {
          date: true,
          status: true,
        },
      });

      const historyMap: Record<string, {
        date: string;
        marked: number;
        present: number;
        absent: number;
        od: number;
        ml: number;
        longAbsent: number;
      }> = {};

      for (const rec of records) {
        const s = rec.status.toUpperCase();
        if (s === "UNMARKED") continue;
        if (!historyMap[rec.date]) {
          historyMap[rec.date] = {
            date: rec.date,
            marked: 0,
            present: 0,
            absent: 0,
            od: 0,
            ml: 0,
            longAbsent: 0,
          };
        }
        const summary = historyMap[rec.date];
        summary.marked++;
        if (s === "PRESENT") summary.present++;
        else if (s === "ABSENT") summary.absent++;
        else if (s === "OD") summary.od++;
        else if (s === "MEDICAL_LEAVE" || s === "ML") summary.ml++;
        else if (s === "LONG_ABSENT") summary.longAbsent++;
      }

      const historyList = Object.values(historyMap).sort((a, b) => b.date.localeCompare(a.date));

      logApiPerf("GET /api/attendance/full-day?history=true", startTime);
      return apiSuccess({ history: historyList });
    }

    const studentWhere: any = {
      isArchived: false,
    };

    if (batchId) studentWhere.batchId = batchId;
    if (departmentId) studentWhere.departmentId = departmentId;
    if (academicYearParam) studentWhere.academicYear = academicYearParam;

    const students = await prisma.studentProfile.findMany({
      where: studentWhere,
      orderBy: { registerNo: "asc" },
      select: {
        id: true,
        registerNo: true,
        rollNo: true,
        fullName: true,
        email: true,
        batchId: true,
        academicYear: true,
        attendancePercentage: true,
        department: {
          select: {
            code: true,
          },
        },
      },
    });

    const studentIds = students.map((s) => s.id);

    const existingAttendance = await prisma.fullDayAttendance.findMany({
      where: {
        date,
        studentId: { in: studentIds },
      },
    });

    logApiPerf("GET /api/attendance/full-day", startTime);
    return apiSuccess({
      students,
      existingAttendance,
      isEditMode: existingAttendance.length > 0,
    });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch full day attendance roster", 500);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const { date, attendanceRecords } = await req.json();

    if (!date || !Array.isArray(attendanceRecords)) {
      return apiError("Date and attendanceRecords are required.", 400);
    }

    const studentIds: string[] = attendanceRecords.map((r: any) => r.studentId).filter(Boolean);

    // Validate statuses first
    for (const rec of attendanceRecords) {
      let status = rec.status;
      if (status === "ML") status = "MEDICAL_LEAVE";
      if (!["PRESENT", "ABSENT", "OD", "MEDICAL_LEAVE", "LONG_ABSENT", "UNMARKED"].includes(status)) {
        throw new Error(`Invalid attendance status '${status}'`);
      }
    }

    // Atomic two-step bulk operation: delete existing records for date and studentIds, then insert marked records
    await prisma.$transaction([
      prisma.fullDayAttendance.deleteMany({
        where: {
          date,
          studentId: { in: studentIds },
        },
      }),
      prisma.fullDayAttendance.createMany({
        data: attendanceRecords
          .filter((r: any) => r.status && r.status !== "UNMARKED")
          .map((r: any) => ({
            studentId: r.studentId,
            date,
            status: r.status === "ML" ? "MEDICAL_LEAVE" : r.status,
            remarks: r.remarks || null,
          })),
      }),
    ]);

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "SAVE_FULL_DAY_ATTENDANCE",
        entityType: "FullDayAttendance",
        details: `Saved full day attendance for Date ${date}, Total Students: ${attendanceRecords.length}`,
      },
    });

    // Recalculate percentages for all affected students based on actual full day attendance
    const allFullDayRecords = await prisma.fullDayAttendance.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, status: true },
    });

    const studentRecordsMap = new Map<string, { status: string }[]>();
    for (const att of allFullDayRecords) {
      if (att.status === "UNMARKED") continue;
      if (!studentRecordsMap.has(att.studentId)) {
        studentRecordsMap.set(att.studentId, []);
      }
      studentRecordsMap.get(att.studentId)!.push({ status: att.status });
    }

    // Group student profile updates by calculated percentage
    const pctToStudentIds = new Map<number, string[]>();
    for (const studentId of studentIds) {
      const records = studentRecordsMap.get(studentId) || [];
      const percentage = calculateAttendancePercentage(records);
      if (!pctToStudentIds.has(percentage)) {
        pctToStudentIds.set(percentage, []);
      }
      pctToStudentIds.get(percentage)!.push(studentId);
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
    console.log(`[PERF] POST /api/attendance/full-day completed in ${durationMs}ms for ${attendanceRecords.length} students.`);

    return apiSuccess({ count: attendanceRecords.length, executionTimeMs: durationMs }, "Full day attendance saved successfully.", 200);
  } catch (error: any) {
    console.error("[POST /api/attendance/full-day Error]", error);
    return apiError("An error occurred while saving full day attendance. Please try again.", 500);
  }
}

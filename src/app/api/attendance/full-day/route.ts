import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

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

    await prisma.$transaction(async (tx) => {
      for (const rec of attendanceRecords) {
        const { studentId, status, remarks } = rec;
        if (!studentId) continue;

        // Upsert record sequentially
        await tx.fullDayAttendance.upsert({
          where: {
            studentId_date: {
              studentId,
              date,
            },
          },
          update: {
            status,
            remarks: remarks || null,
          },
          create: {
            studentId,
            date,
            status,
            remarks: remarks || null,
          },
        });
      }

      // Write Audit Log
      await tx.auditLog.create({
        data: {
          userId: session.id,
          userEmail: session.email,
          userRole: session.role,
          action: "SAVE_FULL_DAY_ATTENDANCE",
          entityType: "FullDayAttendance",
          details: `Saved full day attendance for Date ${date}, Total Students: ${attendanceRecords.length}`,
        },
      });
    });

    logApiPerf("POST /api/attendance/full-day", startTime);
    return apiSuccess({ count: attendanceRecords.length }, "Full day attendance saved successfully.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to save full day attendance", 500);
  }
}

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
        attendancePercentage: true,
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

    const studentIds: string[] = [];

    // Save attendance sequentially outside a transaction (pool-safe)
    for (const rec of attendanceRecords) {
      const { studentId, remarks } = rec;
      let status = rec.status;
      if (!studentId) continue;

      studentIds.push(studentId);

      if (status === "ML") {
        status = "MEDICAL_LEAVE";
      }

      if (!["PRESENT", "ABSENT", "OD", "MEDICAL_LEAVE", "LONG_ABSENT", "UNMARKED"].includes(status)) {
        throw new Error(`Invalid attendance status '${status}'`);
      }

      if (status === "UNMARKED") {
        await prisma.fullDayAttendance.deleteMany({
          where: {
            studentId,
            date,
          },
        });
      } else {
        // Upsert record sequentially outside interactive transaction
        await prisma.fullDayAttendance.upsert({
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
    }

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

    const countsMap = new Map<string, { present: number; total: number }>();
    for (const att of allFullDayRecords) {
      if (!countsMap.has(att.studentId)) {
        countsMap.set(att.studentId, { present: 0, total: 0 });
      }
      const item = countsMap.get(att.studentId)!;
      item.total++;
      if (att.status === "PRESENT" || att.status === "OD" || att.status === "MEDICAL_LEAVE" || att.status === "ML") {
        item.present++;
      }
    }

    // Update student profiles sequentially (outside transaction, pool-safe)
    for (const studentId of studentIds) {
      const item = countsMap.get(studentId) || { present: 0, total: 0 };
      const percentage = item.total > 0 ? Math.round((item.present / item.total) * 100 * 10) / 10 : 0.0;
      await prisma.studentProfile.update({
        where: { id: studentId },
        data: { attendancePercentage: percentage },
      });
    }

    logApiPerf("POST /api/attendance/full-day", startTime);
    return apiSuccess({ count: attendanceRecords.length }, "Full day attendance saved successfully.", 200);
  } catch (error: any) {
    console.error("Error saving full day attendance:", error);
    return apiError("An error occurred while saving full day attendance. Please try again.", 500);
  }
}

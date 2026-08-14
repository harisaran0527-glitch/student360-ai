import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getOrCreateDefaultDepartment } from "@/lib/departmentEngine";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const academicYearParam = searchParams.get("academicYear") || DEFAULT_ACADEMIC_YEAR;
    const batchId = searchParams.get("batchId") || "";
    const courseId = searchParams.get("courseId") || "";
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const dept = await getOrCreateDefaultDepartment();

    // 1. Fetch available subjects/courses for AI & ML
    const courses = await prisma.course.findMany({
      where: { departmentId: dept.id, isActive: true },
      orderBy: { code: "asc" },
    });

    if (!batchId) {
      logApiPerf("GET /api/attendance (no batch)", startTime);
      return new NextResponse(
        JSON.stringify({
          success: true,
          data: { courses, students: [], existingAttendance: [], isEditMode: false },
          courses,
          students: [],
          existingAttendance: [],
          isEditMode: false,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, max-age=0, must-revalidate",
          },
        }
      );
    }

    // 2. Fetch students belonging to the batch (non-archived active students)
    const studentWhere: any = {
      batchId,
      isArchived: false,
    };

    // Parallel fetch students & existing attendance
    const [students, existingAttendance] = await Promise.all([
      prisma.studentProfile.findMany({
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
      }),
      courseId && date
        ? prisma.attendance.findMany({
            where: {
              courseId,
              date,
              student: { batchId },
            },
          })
        : Promise.resolve([]),
    ]);

    logApiPerf("GET /api/attendance", startTime);
    return new NextResponse(
      JSON.stringify({
        success: true,
        data: {
          courses,
          students,
          existingAttendance,
          isEditMode: existingAttendance.length > 0,
        },
        courses,
        students,
        existingAttendance,
        isEditMode: existingAttendance.length > 0,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch attendance roster", 500);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const { academicYear, batchId, courseId, date, sessionName, attendanceRecords } = await req.json();

    if (!academicYear || !batchId || !courseId || !date || !Array.isArray(attendanceRecords)) {
      return apiError("Academic Year, Batch, Subject/Course, Date, and Attendance Records are required.", 400);
    }

    const targetSession = sessionName || "FN";

    // Use transaction to upsert attendance and update student attendance percentages
    await prisma.$transaction(async (tx) => {
      const studentIds = attendanceRecords.map((r) => r.studentId).filter(Boolean) as string[];

      // 1. Fetch all existing attendance records for these students on this course, date & session
      const existingAtts = await tx.attendance.findMany({
        where: {
          courseId,
          date,
          session: targetSession,
          studentId: { in: studentIds },
        },
      });

      const existingMap = new Map(existingAtts.map((a) => [a.studentId, a]));

      // 2. Perform bulk upsert promises in parallel
      const upsertPromises = attendanceRecords
        .map((rec) => {
          const { studentId, status, remarks } = rec;
          if (!studentId) return null;

          const existing = existingMap.get(studentId);
          if (existing) {
            return tx.attendance.update({
              where: { id: existing.id },
              data: {
                status: status || "PRESENT",
                academicYearCode: academicYear,
                facultyId: session.id,
                remarks: remarks || null,
              },
            });
          } else {
            return tx.attendance.create({
              data: {
                studentId,
                courseId,
                date,
                session: targetSession,
                status: status || "PRESENT",
                academicYearCode: academicYear,
                facultyId: session.id,
                remarks: remarks || null,
              },
            });
          }
        })
        .filter(Boolean) as Promise<any>[];

      await Promise.all(upsertPromises);

      // 3. Fetch all attendance records for the affected students in a single query to compute percentages
      const allAttRecords = await tx.attendance.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, status: true },
      });

      const countsMap = new Map<string, { present: number; total: number }>();
      for (const att of allAttRecords) {
        if (!countsMap.has(att.studentId)) {
          countsMap.set(att.studentId, { present: 0, total: 0 });
        }
        const item = countsMap.get(att.studentId)!;
        item.total++;
        if (att.status === "PRESENT" || att.status === "OD" || att.status === "INTERNSHIP") {
          item.present++;
        }
      }

      // 4. Update student profile attendance percentages in parallel
      const updateProfilePromises: any[] = [];
      countsMap.forEach((item, studentId) => {
        const percentage = Math.round((item.present / item.total) * 100 * 10) / 10;
        updateProfilePromises.push(
          tx.studentProfile.update({
            where: { id: studentId },
            data: { attendancePercentage: percentage },
          })
        );
      });

      await Promise.all(updateProfilePromises);

      // Write Audit Log
      await tx.auditLog.create({
        data: {
          userId: session.id,
          userEmail: session.email,
          userRole: session.role,
          action: "SAVE_ATTENDANCE",
          entityType: "Attendance",
          details: `Saved attendance for Course ID ${courseId}, Date ${date}, Academic Year ${academicYear}, Total Students: ${attendanceRecords.length}`,
        },
      });
    });

    logApiPerf("POST /api/attendance", startTime);
    return apiSuccess({ count: attendanceRecords.length }, "Attendance saved successfully.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to save attendance session", 500);
  }
}


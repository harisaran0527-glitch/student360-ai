import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getOrCreateDefaultDepartment } from "@/lib/departmentEngine";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession();
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

    // 3. Fetch existing attendance for this course and date if selected
    let existingAttendance: any[] = [];
    if (courseId && date) {
      existingAttendance = await prisma.attendance.findMany({
        where: {
          courseId,
          date,
          student: { batchId },
        },
      });
    }

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
    const session = await getSession();
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
      for (const rec of attendanceRecords) {
        const { studentId, status, remarks } = rec;
        if (!studentId) continue;

        // Check if attendance record exists
        const existing = await tx.attendance.findFirst({
          where: {
            studentId,
            courseId,
            date,
            session: targetSession,
          },
        });

        if (existing) {
          await tx.attendance.update({
            where: { id: existing.id },
            data: {
              status: status || "PRESENT",
              academicYearCode: academicYear,
              facultyId: session.id,
              remarks: remarks || null,
            },
          });
        } else {
          await tx.attendance.create({
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

        // Recalculate attendance percentage for this student
        const allAtt = await tx.attendance.findMany({
          where: { studentId },
          select: { status: true },
        });

        if (allAtt.length > 0) {
          const presentCount = allAtt.filter(
            (a) => a.status === "PRESENT" || a.status === "OD" || a.status === "INTERNSHIP"
          ).length;
          const percentage = Math.round((presentCount / allAtt.length) * 100 * 10) / 10;

          await tx.studentProfile.update({
            where: { id: studentId },
            data: { attendancePercentage: percentage },
          });
        }
      }

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

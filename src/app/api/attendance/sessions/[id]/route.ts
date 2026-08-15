import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, logApiPerf } from "@/lib/apiResponse";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return apiError("Unauthorized: Only Admin can archive or delete attendance sessions", 401);
    }

    const sessionId = params.id;
    const { reason, notes } = await req.json().catch(() => ({ reason: "Admin Session Cancellation", notes: "" }));

    const attSession = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { attendances: true },
    });

    if (!attSession) {
      return apiError("Attendance session not found", 404);
    }

    // Get list of student IDs affected by this session
    const affectedStudentIds = Array.from(new Set(attSession.attendances.map((a) => a.studentId)));

    // Permanently delete session & its individual attendance records
    await prisma.$transaction([
      prisma.attendance.deleteMany({
        where: { sessionId: sessionId },
      }),
      prisma.attendanceSession.delete({
        where: { id: sessionId },
      }),
    ]);

    // Recalculate affected student overall attendance percentages automatically
    for (const studentId of affectedStudentIds) {
      const allAtts = await prisma.attendance.findMany({ where: { studentId } });
      const total = allAtts.length;
      const present = allAtts.filter((a) => a.status === "PRESENT" || a.status === "OD" || a.status === "INTERNSHIP").length;
      const newPct = total > 0 ? Math.round((present / total) * 100) : 100;

      await prisma.studentProfile.update({
        where: { id: studentId },
        data: { attendancePercentage: newPct },
      });
    }

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "PERMANENT_DELETE_ATTENDANCE_SESSION",
        entityType: "AttendanceSession",
        entityId: sessionId,
        details: JSON.stringify({
          courseId: attSession.courseId,
          date: attSession.date,
          period: attSession.period,
          reason,
          notes,
          affectedStudentsCount: affectedStudentIds.length,
          deletedBy: session.email,
        }),
      },
    });

    logApiPerf("DELETE /api/attendance/sessions/[id]", startTime);
    return apiSuccess({ sessionId, affectedStudentsCount: affectedStudentIds.length }, "Attendance session permanently deleted and student percentages recalculated successfully.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to delete attendance session", 500);
  }
}

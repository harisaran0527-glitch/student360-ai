import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, logApiPerf } from "@/lib/apiResponse";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const { action, reason } = await req.json().catch(() => ({ action: "archive", reason: "Admin Archive" }));
    const courseId = params.id;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) return apiError("Course/Subject not found", 404);

    const isArchival = action !== "restore";

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        isArchived: isArchival,
        archivedAt: isArchival ? new Date() : null,
        archivedReason: isArchival ? reason : null,
        archivedBy: isArchival ? session.email : null,
        isActive: !isArchival,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: isArchival ? "ARCHIVE_SUBJECT" : "RESTORE_SUBJECT",
        entityType: "Course",
        entityId: courseId,
        details: JSON.stringify({ code: course.code, title: course.title, reason }),
      },
    });

    logApiPerf("PATCH /api/courses/[id]", startTime);
    return apiSuccess({ course: updatedCourse }, `Subject ${isArchival ? "archived" : "restored"} successfully.`);
  } catch (error: any) {
    return apiError(error.message || "Failed to update subject archive status", 500);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return apiError("Unauthorized", 403);
    }

    const courseId = params.id;
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        attendances: true,
        sessions: true,
      },
    });

    if (!course) return apiError("Subject record not found", 404);

    // Perform safe cascading permanent deletion of dependent records and course
    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { courseId } }),
      prisma.attendanceSession.deleteMany({ where: { courseId } }),
      prisma.academicRecord.deleteMany({ where: { courseId } }),
      prisma.course.delete({ where: { id: courseId } }),
      prisma.auditLog.create({
        data: {
          userId: session.id,
          userEmail: session.email,
          userRole: session.role,
          action: "PERMANENT_DELETE_SUBJECT",
          entityType: "Course",
          entityId: courseId,
          details: JSON.stringify({ code: course.code, title: course.title, deletedBy: session.email }),
        },
      }),
    ]);

    logApiPerf("DELETE /api/courses/[id]", startTime);
    return apiSuccess({ id: courseId }, "Subject permanently deleted.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to delete subject", 500);
  }
}

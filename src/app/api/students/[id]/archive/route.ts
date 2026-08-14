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
      return apiError("Unauthorized: Only Admin can archive student records", 401);
    }

    const { reason, notes } = await req.json();
    const studentId = params.id;

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return apiError("Student record not found", 404);
    }

    // Soft delete / archive student
    const updatedStudent = await prisma.studentProfile.update({
      where: { id: studentId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archiveReason: reason || "Admin Archived",
        archivedBy: session.email,
      },
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "ARCHIVE_STUDENT",
        entityType: "StudentProfile",
        entityId: studentId,
        details: JSON.stringify({
          registerNo: student.registerNo,
          fullName: student.fullName,
          reason,
          notes,
          archivedBy: session.email,
        }),
      },
    });

    logApiPerf("PATCH /api/students/[id]/archive", startTime);
    return apiSuccess({ student: updatedStudent }, "Student profile archived successfully.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to archive student profile", 500);
  }
}

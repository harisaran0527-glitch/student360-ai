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
      return apiError("Unauthorized: Only Admin can restore archived students", 401);
    }

    const studentId = params.id;

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return apiError("Student record not found", 404);
    }

    // Restore student record
    const updatedStudent = await prisma.studentProfile.update({
      where: { id: studentId },
      data: {
        isArchived: false,
        archivedAt: null,
        archiveReason: null,
        archivedBy: null,
      },
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "RESTORE_STUDENT",
        entityType: "StudentProfile",
        entityId: studentId,
        details: JSON.stringify({
          registerNo: student.registerNo,
          fullName: student.fullName,
          restoredBy: session.email,
        }),
      },
    });

    logApiPerf("PATCH /api/students/[id]/restore", startTime);
    return apiSuccess({ student: updatedStudent }, "Student profile restored successfully.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to restore student profile", 500);
  }
}

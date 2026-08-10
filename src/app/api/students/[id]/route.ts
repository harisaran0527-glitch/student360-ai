import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);

    if (session.role === "STUDENT" && params.id !== session.studentProfileId) {
      return apiError("Forbidden: You can only view your own student profile.", 403);
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        department: true,
        batch: true,
        section: true,
        academicRecords: { include: { course: true } },
        attendances: { include: { course: true } },
        internships: true,
        certificates: true,
        achievements: true,
        projects: true,
        skills: true,
        placementRecords: true,
        alumniRecord: true,
        busRecord: true,
      },
    });

    if (!student) {
      return apiError("Student profile not found", 404);
    }

    logApiPerf("GET /api/students/[id]", startTime);
    return apiSuccess({ student });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch student profile", 500);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const oldStudent = await prisma.studentProfile.findUnique({
      where: { id: params.id },
    });

    if (!oldStudent) {
      return apiError("Student profile not found", 404);
    }

    const updates = await req.json();

    // Normalize admissionQuota if present
    if (updates.admissionQuota !== undefined) {
      let q = updates.admissionQuota ? String(updates.admissionQuota).trim().toUpperCase() : "";
      if (q === "GOVERNMENT QUOTA" || q === "GOVERNMENT" || q === "GQ") {
        updates.admissionQuota = "GQ";
      } else if (q === "MANAGEMENT QUOTA" || q === "MANAGEMENT" || q === "MQ") {
        updates.admissionQuota = "MQ";
      } else if (q !== "") {
        return apiError("Please select Government Quota or Management Quota.", 400);
      }
    }

    // Check duplicate registerNo / email if changed
    if (updates.registerNo && updates.registerNo !== oldStudent.registerNo) {
      const dup = await prisma.studentProfile.findFirst({ where: { registerNo: updates.registerNo } });
      if (dup) return apiError("Register Number already in use.", 400);
    }
    if (updates.email && updates.email !== oldStudent.email) {
      const dup = await prisma.studentProfile.findFirst({ where: { email: updates.email } });
      if (dup) return apiError("Email address already in use.", 400);
    }

    const updatedStudent = await prisma.studentProfile.update({
      where: { id: params.id },
      data: updates,
    });

    // Also update User full name / email if changed
    if (updates.fullName || updates.email) {
      await prisma.user.update({
        where: { id: oldStudent.userId },
        data: {
          fullName: updates.fullName || oldStudent.fullName,
          email: updates.email || oldStudent.email,
        },
      });
    }

    // Write Field-Level Audit History Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "UPDATE_STUDENT_MASTER",
        entityType: "StudentProfile",
        entityId: params.id,
        details: JSON.stringify({
          oldValues: {
            fullName: oldStudent.fullName,
            email: oldStudent.email,
            admissionQuota: oldStudent.admissionQuota,
            currentSemester: oldStudent.currentSemester,
          },
          newValues: {
            fullName: updatedStudent.fullName,
            email: updatedStudent.email,
            admissionQuota: updatedStudent.admissionQuota,
            currentSemester: updatedStudent.currentSemester,
          },
          updatedBy: session.email,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    logApiPerf("PUT /api/students/[id]", startTime);
    return apiSuccess({ student: updatedStudent }, "Student profile updated successfully.");
  } catch (error: any) {
    return apiError(error.message || "Failed to update student profile", 500);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return apiError("Forbidden: Student deletion is restricted to ADMIN and SUPER_ADMIN.", 403);
    }

    const studentId = params.id;

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: true,
      },
    });

    if (!student) {
      return apiError("Student profile record not found", 404);
    }

    // Permanently delete student profile and linked user account.
    // All child records (Attendance, Internship, Certificate, Project, etc.)
    // use onDelete: Cascade in schema, so they auto-delete with StudentProfile.
    await prisma.$transaction(async (tx) => {
      const userId = student.userId;

      // Delete StudentProfile (cascades all child records automatically)
      await tx.studentProfile.delete({ where: { id: studentId } });

      // Delete linked User login account (StudentProfile no longer holds userId ref)
      if (userId) {
        await tx.user.delete({ where: { id: userId } }).catch(() => {});
      }

      await tx.auditLog.create({
        data: {
          userId: session.id,
          userEmail: session.email,
          userRole: session.role,
          action: "PERMANENT_DELETE_STUDENT",
          entityType: "StudentProfile",
          entityId: studentId,
          details: JSON.stringify({
            registerNo: student.registerNo,
            fullName: student.fullName,
            email: student.email,
            deletedBy: session.email,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    });

    logApiPerf("DELETE /api/students/[id]", startTime);
    return apiSuccess({ id: studentId }, "Student profile and user account permanently deleted successfully.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to permanently delete student profile", 500);
  }
}

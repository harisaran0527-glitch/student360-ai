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
    if (!session || session.role !== "SUPER_ADMIN") {
      return apiError("Forbidden: Permanent student deletion is reserved strictly for SUPER_ADMIN. Normal Admins can only archive records.", 403);
    }

    const studentId = params.id;
    const { confirmText, reason } = await req.json().catch(() => ({ confirmText: "", reason: "SUPER_ADMIN Erase" }));

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        attendances: true,
        certificates: true,
        internships: true,
        projects: true,
        placementRecords: true,
      },
    });

    if (!student) {
      return apiError("Student profile record not found", 404);
    }

    const requiredConfirmString = `PERMANENTLY_DELETE_${student.registerNo.toUpperCase()}`;
    if (confirmText !== requiredConfirmString) {
      return apiError(`Confirmation string mismatch. You must type exact string '${requiredConfirmString}' to proceed.`, 400);
    }

    const impact = {
      attendanceCount: student.attendances.length,
      certificateCount: student.certificates.length,
      internshipCount: student.internships.length,
      projectCount: student.projects.length,
      placementCount: student.placementRecords.length,
    };

    // Permanently delete student and linked user account
    await prisma.studentProfile.delete({ where: { id: studentId } });
    if (student.userId) {
      await prisma.user.delete({ where: { id: student.userId } }).catch(() => {});
    }

    // Write Audit Log
    await prisma.auditLog.create({
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
          reason,
          deletedBy: session.email,
          impact,
        }),
      },
    });

    logApiPerf("DELETE /api/students/[id]", startTime);
    return apiSuccess({ id: studentId, impact }, "Student profile permanently deleted by SUPER_ADMIN.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to permanently delete student profile", 500);
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";
import { invalidateServerMetadataCache } from "@/lib/serverCache";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
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
        attendances: { include: { course: true }, orderBy: { date: "desc" } },
        internships: true,
        certificates: true,
        achievements: true,
        projects: true,
        skills: true,
        placementRecords: true,
        alumniRecord: true,
        busRecord: true,
        fullDayAttendances: { orderBy: { date: "desc" } },
      },
    });

    if (!student) {
      return apiError("Student profile not found", 404);
    }

    logApiPerf("GET /api/students/[id]", startTime);
    return new NextResponse(
      JSON.stringify({
        success: true,
        data: { student },
        student,
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
    return apiError(error.message || "Failed to fetch student profile", 500);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
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

    // Handle institutional and personal email updates
    const targetInstEmail = (updates.institutionalEmail || updates.email || "").trim().toLowerCase();
    if (targetInstEmail && targetInstEmail !== (oldStudent.institutionalEmail || oldStudent.email || "").toLowerCase()) {
      const dupProfile = await prisma.studentProfile.findFirst({
        where: {
          id: { not: params.id },
          OR: [
            { email: targetInstEmail },
            { institutionalEmail: targetInstEmail },
          ],
        },
      });
      if (dupProfile) return apiError("Institutional Email ID is already in use by another student.", 400);

      const dupUser = await prisma.user.findFirst({
        where: {
          id: { not: oldStudent.userId },
          email: targetInstEmail,
        },
      });
      if (dupUser) return apiError("Institutional Email ID is already in use by another user.", 400);

      updates.institutionalEmail = targetInstEmail;
      updates.email = targetInstEmail;
    }

    if (updates.personalEmail !== undefined) {
      updates.personalEmail = updates.personalEmail ? String(updates.personalEmail).trim().toLowerCase() : null;
    }

    // Check duplicate registerNo if changed
    if (updates.registerNo && updates.registerNo !== oldStudent.registerNo) {
      const dup = await prisma.studentProfile.findFirst({ where: { registerNo: updates.registerNo } });
      if (dup) return apiError("Register Number already in use.", 400);
    }

    // Normalize and validate optional relations: sectionId, departmentId, batchId
    if (updates.sectionId !== undefined) {
      const secTrimmed = typeof updates.sectionId === "string" ? updates.sectionId.trim() : "";
      updates.sectionId = (secTrimmed === "" || secTrimmed === "null" || secTrimmed === "undefined") ? null : secTrimmed;
    }
    if (updates.sectionId) {
      const sectionExists = await prisma.section.findUnique({
        where: { id: updates.sectionId },
      });
      if (!sectionExists) {
        return apiError("Selected section no longer exists. Please select a valid section.", 400);
      }
    }

    if (updates.departmentId !== undefined) {
      const deptTrimmed = typeof updates.departmentId === "string" ? updates.departmentId.trim() : "";
      updates.departmentId = (deptTrimmed === "" || deptTrimmed === "null" || deptTrimmed === "undefined") ? null : deptTrimmed;
      if (!updates.departmentId) {
        return apiError("Department ID is required.", 400);
      }
    }
    if (updates.departmentId) {
      const deptExists = await prisma.department.findUnique({
        where: { id: updates.departmentId },
      });
      if (!deptExists) {
        return apiError("Selected department no longer exists. Please select a valid department.", 400);
      }
    }

    if (updates.batchId !== undefined) {
      const batchTrimmed = typeof updates.batchId === "string" ? updates.batchId.trim() : "";
      updates.batchId = (batchTrimmed === "" || batchTrimmed === "null" || batchTrimmed === "undefined") ? null : batchTrimmed;
      if (!updates.batchId) {
        return apiError("Batch ID is required.", 400);
      }
    }
    if (updates.batchId) {
      const batchExists = await prisma.batch.findUnique({
        where: { id: updates.batchId },
      });
      if (!batchExists) {
        return apiError("Selected batch no longer exists. Please select a valid batch.", 400);
      }
    }

    let updatedStudent;
    try {
      updatedStudent = await prisma.studentProfile.update({
        where: { id: params.id },
        data: updates,
      });
    } catch (err: any) {
      console.error("[STUDENT_UPDATE_DB_ERROR]", err);
      if (err.code === "P2003") {
        return apiError("Database constraint violation. Please verify that all selected relations (department, batch, section) are valid.", 400);
      }
      return apiError("Failed to update student profile in database.", 500);
    }

    // Also update User full name / email if changed
    const finalUserEmail = updatedStudent.institutionalEmail || updatedStudent.email;
    await prisma.user.update({
      where: { id: oldStudent.userId },
      data: {
        fullName: updates.fullName || oldStudent.fullName,
        email: finalUserEmail,
      },
    });

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

    invalidateServerMetadataCache();
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
    const session = await getSession(req);
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

    invalidateServerMetadataCache();
    logApiPerf("DELETE /api/students/[id]", startTime);
    return apiSuccess({ id: studentId }, "Student profile and user account permanently deleted successfully.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to permanently delete student profile", 500);
  }
}

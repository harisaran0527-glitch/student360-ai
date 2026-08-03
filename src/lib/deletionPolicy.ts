import { prisma } from "@/lib/prisma";
import { UserSession } from "@/lib/auth";

export type StudentLifecycleState = "ACTIVE" | "GRADUATED" | "ALUMNI" | "ARCHIVED";

export interface ImpactPreview {
  academicRecordsCount: number;
  attendanceRecordsCount: number;
  internshipsCount: number;
  certificatesCount: number;
  achievementsCount: number;
  projectsCount: number;
  skillsCount: number;
  placementRecordsCount: number;
}

export async function previewStudentDeletionImpact(studentId: string): Promise<ImpactPreview> {
  const academicRecordsCount = await prisma.academicRecord.count({ where: { studentId } });
  const attendanceRecordsCount = await prisma.attendance.count({ where: { studentId } });
  const internshipsCount = await prisma.internship.count({ where: { studentId } });
  const certificatesCount = await prisma.certificate.count({ where: { studentId } });
  const achievementsCount = await prisma.achievement.count({ where: { studentId } });
  const projectsCount = await prisma.project.count({ where: { studentId } });
  const skillsCount = await prisma.skill.count({ where: { studentId } });
  const placementRecordsCount = await prisma.placementRecord.count({ where: { studentId } });

  return {
    academicRecordsCount,
    attendanceRecordsCount,
    internshipsCount,
    certificatesCount,
    achievementsCount,
    projectsCount,
    skillsCount,
    placementRecordsCount,
  };
}

export async function archiveStudentProfile(
  studentId: string,
  reason: string,
  session: UserSession
): Promise<{ success: boolean; message: string }> {
  if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Only Admin or Super Admin can archive student records");
  }

  await prisma.studentProfile.update({
    where: { id: studentId },
    data: {
      isArchived: true,
      archivedAt: new Date(),
      archiveReason: reason,
      archivedBy: session.email,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      userEmail: session.email,
      userRole: session.role,
      action: "STUDENT_ARCHIVED",
      entityType: "StudentProfile",
      entityId: studentId,
      details: `Archived student profile. Reason: ${reason}`,
    },
  });

  return { success: true, message: "Student record archived successfully without data loss." };
}

export async function executeRestrictedPermanentDeletion(
  studentId: string,
  confirmationString: string,
  reason: string,
  session: UserSession
): Promise<{ success: boolean; message: string }> {
  // Restricted to SUPER_ADMIN only
  if (session.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: Permanent deletion requires SUPER_ADMIN authorization.");
  }

  const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
  if (!student) throw new Error("Student profile not found.");

  const expectedConfirmation = `PERMANENTLY_DELETE_STUDENT_${student.registerNo}`;
  if (confirmationString !== expectedConfirmation) {
    throw new Error(`Invalid confirmation string. Expected: ${expectedConfirmation}`);
  }

  // Transaction safety
  await prisma.$transaction(async (tx) => {
    // Audit Log before deletion
    await tx.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "RESTRICTED_PERMANENT_DELETION_EXECUTED",
        entityType: "StudentProfile",
        entityId: studentId,
        details: `EXECUTED PERMANENT DELETION for student ${student.fullName} (${student.registerNo}). Reason: ${reason}`,
      },
    });

    await tx.studentProfile.delete({ where: { id: studentId } });
  });

  return { success: true, message: `Student profile ${student.registerNo} permanently deleted under Super Admin authorization.` };
}

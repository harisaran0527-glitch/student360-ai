import { prisma } from "@/lib/prisma";
import { sendEmail, renderInternshipNonCompletionEmail, renderAttendanceShortageEmail } from "@/lib/email";

export interface CreateNotificationInput {
  userId: string;
  studentId?: string;
  type: string;
  title: string;
  message: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  relatedModule?: string;
  relatedRecordId?: string;
  emailRequired?: boolean;
  deduplicationKey?: string;
  emailPayload?: { to: string; subject: string; html: string };
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    // 1. Deduplication Check
    if (input.deduplicationKey) {
      const existing = await prisma.notification.findUnique({
        where: { deduplicationKey: input.deduplicationKey },
      });
      if (existing) {
        return { isDuplicate: true, notification: existing };
      }
    }

    // 2. Create Notification Row
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        studentId: input.studentId,
        type: input.type,
        title: input.title,
        message: input.message,
        priority: input.priority || "NORMAL",
        relatedModule: input.relatedModule,
        relatedRecordId: input.relatedRecordId,
        emailRequired: input.emailRequired || false,
        emailStatus: input.emailRequired ? "PENDING" : "NOT_REQUIRED",
        deduplicationKey: input.deduplicationKey,
      },
    });

    // 3. Handle Email Sending if Required
    if (input.emailRequired && input.emailPayload) {
      const result = await sendEmail({
        to: input.emailPayload.to,
        subject: input.emailPayload.subject,
        html: input.emailPayload.html,
        notificationId: notification.id,
      });

      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          emailStatus: result.mode,
          emailSentAt: result.success ? new Date() : undefined,
          emailFailureReason: result.error || undefined,
        },
      });
    }

    return { isDuplicate: false, notification };
  } catch (error: any) {
    console.error("Failed to create notification:", error);
    return { error: error.message };
  }
}

export async function generateInternshipNonCompletionReport(params: {
  studentId: string;
  userId: string;
  userEmail: string;
  studentName: string;
  registerNo: string;
  departmentCode: string;
  semester: number;
  academicYear: string;
  deadline: string;
  missingItems: string[];
}) {
  try {
    const dedupKey = `INTERNSHIP_INCOMPLETE:${params.studentId}:${params.semester}:${params.academicYear}`;

    // 1. Check existing report / notification
    const existingNotif = await prisma.notification.findUnique({
      where: { deduplicationKey: dedupKey },
    });
    if (existingNotif) return { isDuplicate: true };

    const summaryText = `Semester ${params.semester} internship requirement is incomplete. Deadline passed on ${params.deadline}.`;

    // 2. Create Notification & Email
    const htmlEmail = renderInternshipNonCompletionEmail({
      studentName: params.studentName,
      registerNo: params.registerNo,
      departmentCode: params.departmentCode,
      semester: params.semester,
      deadline: params.deadline,
      missingItems: params.missingItems,
    });

    const notifResult: any = await createNotification({
      userId: params.userId,
      studentId: params.studentId,
      type: "INTERNSHIP_NOT_SUBMITTED",
      title: `Action Required: Semester ${params.semester} Internship Incomplete`,
      message: summaryText,
      priority: "HIGH",
      relatedModule: "Internship",
      emailRequired: true,
      deduplicationKey: dedupKey,
      emailPayload: {
        to: params.userEmail,
        subject: `[Student360 AI] Action Required: Semester ${params.semester} Internship Pending`,
        html: htmlEmail,
      },
    });

    // 3. Create StudentComplianceReport Snapshot
    const report = await prisma.studentComplianceReport.create({
      data: {
        studentId: params.studentId,
        academicYear: params.academicYear,
        semester: params.semester,
        reportType: "INTERNSHIP_NON_COMPLETION",
        generatedDate: new Date().toISOString().split("T")[0],
        status: "OPEN",
        summary: summaryText,
        missingRequirements: JSON.stringify(params.missingItems),
        notificationId: notifResult.notification?.id,
        emailDeliveryStatus: notifResult.notification?.emailStatus || "PENDING",
      },
    });

    return { isDuplicate: false, report };
  } catch (err: any) {
    console.error("Error generating internship non-completion report:", err.message);
    return { error: err.message };
  }
}

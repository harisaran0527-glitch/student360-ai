import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export function renderInternshipStatusEmail(params: {
  studentName: string;
  registerNo: string;
  companyName: string;
  role: string;
  status: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #4f46e5; margin: 0;">Student360 AI</h2>
        <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Institutional Internship Status Notification</p>
      </div>

      <h3 style="color: #0f172a; margin-top: 0;">Internship Status Update</h3>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        Dear <strong>${params.studentName}</strong> (${params.registerNo}),
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        Your internship status for <strong>${params.companyName}</strong> (${params.role}) has been updated to:
      </p>

      <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 14px; margin: 16px 0; font-size: 14px; font-weight: bold; color: #1e1b4b;">
        Current Status: ${params.status}
      </div>

      <p style="color: #475569; font-size: 13px; line-height: 1.5;">
        Please check the Internship section in your <strong>Student360 AI Student Portal</strong> for details.
      </p>

      <div style="text-align: center; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; color: #94a3b8; font-size: 11px;">
        This is an automated institutional notification from Student360 AI. Please do not reply directly to this email.
      </div>
    </div>
  `;
}

export async function notifyStudentInternshipStatus(params: {
  internshipId: string;
  studentId: string;
  companyName: string;
  role: string;
  newStatus: string;
  oldStatus?: string;
}): Promise<{
  notified: boolean;
  emailSent: boolean;
  message: string;
  isDuplicate?: boolean;
}> {
  // 1. Duplicate check: if oldStatus === newStatus, skip creating duplicate notification
  if (params.oldStatus && params.oldStatus.toUpperCase() === params.newStatus.toUpperCase()) {
    return {
      notified: false,
      emailSent: false,
      isDuplicate: true,
      message: "Internship status updated. (Status unchanged - duplicate notification skipped.)",
    };
  }

  // 2. Fetch student profile and associated user account
  const student = await prisma.studentProfile.findUnique({
    where: { id: params.studentId },
    include: { user: true },
  });

  if (!student || !student.userId) {
    return {
      notified: false,
      emailSent: false,
      message: "Internship status updated. Student user account not found for notifications.",
    };
  }

  const recipientEmail = student.user?.email || student.email;
  const studentName = student.fullName || student.user?.fullName || "Student";
  const registerNo = student.registerNo || "N/A";

  const title = "Internship Status Update";
  const messageText = `Your internship status has been updated to "${params.newStatus}". Please check the Internship section for details.`;
  const deduplicationKey = `INTERNSHIP_STATUS:${params.internshipId}:${params.newStatus.toUpperCase()}`;

  // Check if deduplication key already exists in Notification table
  const existingNotification = await prisma.notification.findUnique({
    where: { deduplicationKey },
  });

  if (existingNotification) {
    return {
      notified: true,
      emailSent: existingNotification.emailStatus === "SENT",
      isDuplicate: true,
      message: "Internship status updated. (Duplicate notification skipped.)",
    };
  }

  // Render HTML email
  const htmlEmail = renderInternshipStatusEmail({
    studentName,
    registerNo,
    companyName: params.companyName,
    role: params.role,
    status: params.newStatus,
  });

  // 3. Create Notification & Attempt Email Delivery
  const notifResult: any = await createNotification({
    userId: student.userId,
    studentId: student.id,
    type: "INTERNSHIP_STATUS_UPDATE",
    title,
    message: messageText,
    priority: "NORMAL",
    relatedModule: "Internship",
    relatedRecordId: params.internshipId,
    emailRequired: true,
    deduplicationKey,
    emailPayload: {
      to: recipientEmail,
      subject: `Internship Status Update - Student360 AI`,
      html: htmlEmail,
    },
  });

  const emailStatus = notifResult?.notification?.emailStatus;
  const emailSent = emailStatus === "SENT";

  let responseMessage = "Internship status updated. Student notification sent.";
  if (!emailSent) {
    console.warn(`[SMTP NOTICE] Email delivery unavailable for ${recipientEmail}. In-app notification delivered successfully.`);
    responseMessage = "Internship status updated. In-app notification sent, but email delivery failed.";
  }

  return {
    notified: true,
    emailSent,
    message: responseMessage,
  };
}

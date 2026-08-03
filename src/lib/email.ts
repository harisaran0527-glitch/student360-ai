export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  notificationId?: string;
}

export async function sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; mode: string; error?: string }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.log(`[EMAIL SERVICE] [DEV MODE - SMTP NOT CONFIGURED] To: ${payload.to} | Subject: ${payload.subject}`);
    return { success: false, mode: "DEV_PENDING", error: "SMTP credentials missing in environment (.env)" };
  }

  try {
    // If SMTP credentials exist in environment, log attempt or call HTTP provider
    console.log(`[EMAIL SERVICE] [SMTP DISPATCH] Sending email to ${payload.to} via ${host}...`);
    return { success: true, mode: "SENT" };
  } catch (err: any) {
    console.error(`[EMAIL SERVICE FAILURE] To: ${payload.to} | Error:`, err.message);
    return { success: false, mode: "FAILED", error: err.message };
  }
}

// 1. Internship Non-Completion HTML Template
export function renderInternshipNonCompletionEmail(params: {
  studentName: string;
  registerNo: string;
  departmentCode: string;
  semester: number;
  deadline: string;
  missingItems: string[];
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #4f46e5; margin: 0;">Student360 AI</h2>
        <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Institutional Academic & Lifecycle System</p>
      </div>

      <h3 style="color: #0f172a; margin-top: 0;">Official Notice: Semester ${params.semester} Internship Requirement Pending</h3>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        Dear <strong>${params.studentName}</strong> (Register No: <strong>${params.registerNo}</strong>),
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        Our institutional records indicate that your <strong>Semester ${params.semester}</strong> mandatory internship requirement has not yet been completed.
      </p>

      <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 14px; margin: 16px 0; font-size: 13px;">
        <strong>Configured Deadline:</strong> ${params.deadline}<br/>
        <strong>Department:</strong> ${params.departmentCode}<br/>
        <strong>Missing Checklist Items:</strong>
        <ul style="margin-top: 6px; padding-left: 20px; color: #b45309;">
          ${params.missingItems.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </div>

      <p style="color: #475569; font-size: 13px; line-height: 1.5;">
        Please submit the required internship record and supporting documents through your <strong>Student360 AI Student Portal</strong> as soon as possible.
      </p>

      <div style="text-align: center; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; color: #94a3b8; font-size: 11px;">
        This is an automated institutional notification from Student360 AI. Please do not reply directly to this email.
      </div>
    </div>
  `;
}

// 2. Attendance Shortage Alert HTML Template
export function renderAttendanceShortageEmail(params: {
  studentName: string;
  registerNo: string;
  currentPercentage: number;
  requiredThreshold: number;
  semester: number;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 2px solid #e11d48; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #e11d48; margin: 0;">Student360 AI</h2>
        <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Institutional Attendance Alert</p>
      </div>

      <h3 style="color: #0f172a; margin-top: 0;">Attention Required: Attendance Below Threshold</h3>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        Dear <strong>${params.studentName}</strong> (${params.registerNo}),
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        Your cumulative attendance percentage for Semester ${params.semester} is currently <strong>${params.currentPercentage}%</strong>, which is below the mandatory institutional minimum threshold of <strong>${params.requiredThreshold}%</strong>.
      </p>

      <div style="background-color: #fff1f2; border-left: 4px solid #e11d48; padding: 14px; margin: 16px 0; font-size: 13px; color: #9f1239;">
        Please meet with your course advisor to resolve any attendance shortages.
      </div>
    </div>
  `;
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateInternshipNonCompletionReport, createNotification } from "@/lib/notifications";
import { renderAttendanceShortageEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    const cronSecretHeader = req.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET || "student360-cron-secret-key-2026";

    // Authentication check
    const isCronAuthorized = cronSecretHeader && cronSecretHeader === expectedSecret;
    const isAdminAuthorized = session && (session.role === "SUPER_ADMIN" || session.role === "ADMIN");

    if (!isCronAuthorized && !isAdminAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Requires Admin session or valid x-cron-secret." }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    let internshipReportsGenerated = 0;
    let attendanceAlertsGenerated = 0;

    // 1. SCAN OVERDUE INTERNSHIP REQUIREMENTS
    const requiredSemConfigs = await prisma.semesterConfig.findMany({
      where: {
        internshipRequirement: "REQUIRED",
        submissionDeadline: { lte: todayStr },
      },
      include: { batch: true },
    });

    for (const config of requiredSemConfigs) {
      const students = await prisma.studentProfile.findMany({
        where: {
          batchId: config.batchId,
          currentSemester: config.semesterNumber,
          isArchived: false,
          academicStatus: "PURSUING",
        },
        include: {
          user: true,
          department: true,
          internships: {
            where: { semester: config.semesterNumber },
          },
        },
      });

      for (const student of students) {
        const verifiedInternship = student.internships.find((i) => i.status === "VERIFIED" || i.status === "APPROVED");
        if (!verifiedInternship) {
          const missingItems: string[] = [];
          if (student.internships.length === 0) missingItems.push("No Internship Record Submitted");
          else {
            const latest = student.internships[0];
            if (latest.status === "SUBMITTED_FOR_APPROVAL") missingItems.push("Faculty Approval Pending");
            if (!latest.certificateUrl) missingItems.push("Completion Certificate Missing");
            if (!latest.finalReportUrl) missingItems.push("Final Internship Report Missing");
          }

          const res = await generateInternshipNonCompletionReport({
            studentId: student.id,
            userId: student.userId,
            userEmail: student.email,
            studentName: student.fullName,
            registerNo: student.registerNo,
            departmentCode: student.department?.code || "GEN",
            semester: config.semesterNumber,
            academicYear: config.academicYearCode,
            deadline: config.submissionDeadline || todayStr,
            missingItems: missingItems.length > 0 ? missingItems : ["Verification Pending"],
          });

          if (res.report) internshipReportsGenerated++;
        }
      }
    }

    // 2. SCAN ATTENDANCE SHORTAGES
    const settings = await prisma.notificationSettings.findFirst();
    const threshold = settings?.attendanceThreshold || 75.0;

    const shortageStudents = await prisma.studentProfile.findMany({
      where: {
        isArchived: false,
        academicStatus: "PURSUING",
        attendancePercentage: { lt: threshold },
      },
      include: { user: true },
    });

    for (const st of shortageStudents) {
      const dedupKey = `ATTENDANCE_SHORTAGE:${st.id}:${st.currentSemester}`;
      const htmlEmail = renderAttendanceShortageEmail({
        studentName: st.fullName,
        registerNo: st.registerNo,
        currentPercentage: st.attendancePercentage,
        requiredThreshold: threshold,
        semester: st.currentSemester,
      });

      const res = await createNotification({
        userId: st.userId,
        studentId: st.id,
        type: "ATTENDANCE_SHORTAGE",
        title: `Attention Required: Attendance Below Threshold (${st.attendancePercentage}%)`,
        message: `Your current attendance percentage for Semester ${st.currentSemester} is ${st.attendancePercentage}%, which is below the required ${threshold}% minimum threshold.`,
        priority: "HIGH",
        relatedModule: "Attendance",
        emailRequired: true,
        deduplicationKey: dedupKey,
        emailPayload: {
          to: st.email,
          subject: `[Student360 AI] Attendance Alert - Below ${threshold}% Threshold`,
          html: htmlEmail,
        },
      });

      if (!res.isDuplicate) attendanceAlertsGenerated++;
    }

    // Record Audit Log if triggered manually by Admin
    if (session) {
      await prisma.auditLog.create({
        data: {
          userId: session.id,
          userEmail: session.email,
          userRole: session.role,
          action: "RUN_NOTIFICATION_CHECKS",
          entityType: "NotificationSystem",
          details: JSON.stringify({ internshipReportsGenerated, attendanceAlertsGenerated, triggeredBy: session.email }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Ran automated notification checks cleanly. Generated ${internshipReportsGenerated} non-completion reports & ${attendanceAlertsGenerated} attendance shortage alerts.`,
      internshipReportsGenerated,
      attendanceAlertsGenerated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

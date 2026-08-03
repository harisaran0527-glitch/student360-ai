import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (session.role === "STUDENT") {
      where.userId = session.id;
    }
    if (status) where.status = status;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { ...(session.role === "STUDENT" ? { userId: session.id } : {}), status: "UNREAD" },
    });

    logApiPerf("GET /api/notifications", startTime);
    return apiSuccess({ notifications, unreadCount });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch notifications", 500);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);

    const data = await req.json();
    const { action, title, message, priority, academicYear, studentId, emailRequired } = data;

    if (action === "MARK_ALL_READ") {
      await prisma.notification.updateMany({
        where: { userId: session.id, status: "UNREAD" },
        data: { status: "READ", read: true, readAt: new Date() },
      });
      logApiPerf("POST /api/notifications (MARK_ALL_READ)", startTime);
      return apiSuccess({ success: true }, "Marked all notifications as read.");
    }

    // Admin Create Notification
    if (session.role === "SUPER_ADMIN" || session.role === "ADMIN") {
      if (!title || !message) {
        return apiError("Title and Message are required", 400);
      }

      // Target students
      const targetWhere: any = { isArchived: false };
      if (studentId) {
        targetWhere.id = studentId;
      } else if (academicYear && academicYear !== "ALL") {
        targetWhere.academicYear = academicYear;
      }

      const students = await prisma.studentProfile.findMany({
        where: targetWhere,
        select: { id: true, userId: true },
      });

      const notificationRecords = students.map((s) => ({
        userId: s.userId,
        studentId: s.id,
        type: "ADMIN_BROADCAST",
        title,
        message,
        priority: priority || "NORMAL",
        emailRequired: !!emailRequired,
        emailStatus: process.env.SMTP_HOST ? "PENDING" : "DEVELOPMENT_EMAIL_PENDING",
      }));

      if (notificationRecords.length > 0) {
        await prisma.notification.createMany({
          data: notificationRecords,
        });
      }

      // Write Audit Log
      await prisma.auditLog.create({
        data: {
          userId: session.id,
          userEmail: session.email,
          userRole: session.role,
          action: "CREATE_BROADCAST_NOTIFICATION",
          entityType: "Notification",
          entityId: session.id,
          details: JSON.stringify({ title, recipientsCount: notificationRecords.length }),
        },
      });

      logApiPerf("POST /api/notifications (CREATE_BROADCAST)", startTime);
      return apiSuccess({ recipientCount: notificationRecords.length }, "Notification broadcast sent successfully.", 201);
    }

    return apiError("Invalid notification action", 400);
  } catch (error: any) {
    return apiError(error.message || "Failed to process notification request", 500);
  }
}

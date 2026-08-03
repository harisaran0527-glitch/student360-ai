import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const announcements = await prisma.announcement.findMany({
      include: { user: { select: { fullName: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ announcements });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN" && session.role !== "FACULTY")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, message, audienceType, targetDepartmentId, targetBatchId, targetSectionId, priority } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ error: "title and message are required" }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        audienceType: audienceType || "ALL",
        targetDepartmentId,
        targetBatchId,
        targetSectionId,
        priority: priority || "NORMAL",
        postedBy: session.id,
      },
    });

    // Determine target users to create notifications
    const userWhere: any = { isActive: true };
    if (audienceType === "DEPARTMENT" && targetDepartmentId) {
      userWhere.studentProfile = { departmentId: targetDepartmentId };
    } else if (audienceType === "BATCH" && targetBatchId) {
      userWhere.studentProfile = { batchId: targetBatchId };
    }

    const targetUsers = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, email: true },
    });

    for (const u of targetUsers) {
      await createNotification({
        userId: u.id,
        type: "ANNOUNCEMENT",
        title: `Official Announcement: ${title}`,
        message,
        priority: priority || "NORMAL",
        relatedModule: "Announcement",
        relatedRecordId: announcement.id,
        deduplicationKey: `ANNOUNCEMENT:${announcement.id}:${u.id}`,
      });
    }

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "CREATE_ANNOUNCEMENT",
        entityType: "Announcement",
        entityId: announcement.id,
        details: JSON.stringify({ title, audienceType, postedBy: session.email }),
      },
    });

    return NextResponse.json({ announcement, recipientsCount: targetUsers.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

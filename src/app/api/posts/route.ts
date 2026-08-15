import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "PUBLISHED";
    const category = searchParams.get("category");

    const where: any = {};
    if (status !== "ALL") where.status = status;
    if (category) where.category = category;

    const posts = await prisma.studentPost.findMany({
      where,
      include: {
        user: { select: { fullName: true, role: true, avatarUrl: true } },
        student: { select: { registerNo: true, department: true, batch: true } },
        certificate: true,
        achievement: true,
        project: true,
        internship: true,
        comments: {
          include: { user: { select: { fullName: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ posts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title, content, category, mediaUrl, certificateId, achievementId, internshipId, projectId, skills } =
      await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: "title and content are required" }, { status: 400 });
    }

    const studentProfile = await prisma.studentProfile.findFirst({
      where: { userId: session.id },
    });

    const post = await prisma.studentPost.create({
      data: {
        userId: session.id,
        studentId: studentProfile?.id,
        title,
        content,
        category: category || "General",
        mediaUrl,
        certificateId,
        achievementId,
        internshipId,
        projectId,
        skills,
        status: "PENDING_REVIEW", // Submitted for faculty moderation
      },
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "SUBMIT_ACTIVITY_POST",
        entityType: "StudentPost",
        entityId: post.id,
        details: JSON.stringify({ title, category, submittedBy: session.email }),
      },
    });

    return NextResponse.json({ post });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

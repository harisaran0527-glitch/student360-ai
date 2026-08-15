import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN" && session.role !== "FACULTY")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId, action, moderationNotes } = await req.json();
    if (!postId || !action) {
      return NextResponse.json({ error: "postId and action are required" }, { status: 400 });
    }

    let status = "PUBLISHED";
    if (action === "REQUEST_CHANGES") status = "NEEDS_CHANGES";
    else if (action === "REJECT") status = "REJECTED";

    const post = await prisma.studentPost.update({
      where: { id: postId },
      data: {
        status,
        moderatedBy: session.email,
        moderatedAt: new Date(),
        moderationNotes: moderationNotes || undefined,
      },
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: `POST_MODERATED_${action}`,
        entityType: "StudentPost",
        entityId: postId,
        details: JSON.stringify({ action, moderatedBy: session.email, moderationNotes }),
      },
    });

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

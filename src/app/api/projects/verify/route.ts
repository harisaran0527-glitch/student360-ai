import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN" && session.role !== "FACULTY")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, action, reviewerNotes } = await req.json();

    if (!projectId || !action) {
      return NextResponse.json({ error: "projectId and action are required" }, { status: 400 });
    }

    let status = "VERIFIED";
    if (action === "REQUEST_CHANGES") status = "NEEDS_CHANGES";
    else if (action === "REJECT") status = "REJECTED";

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        status,
        verifiedBy: session.email,
        verifiedAt: status === "VERIFIED" ? new Date() : undefined,
        reviewerNotes: reviewerNotes || undefined,
      },
    });

    // Auto Link Skills when Verified
    if (status === "VERIFIED" && project.techStack) {
      const skillsList = project.techStack.split(",").map((s) => s.trim()).filter(Boolean);
      for (const skillName of skillsList) {
        await prisma.skill.create({
          data: {
            studentId: project.studentId,
            name: skillName,
            category: project.category || "Programming",
            level: "Intermediate",
            proficiency: "Intermediate",
            evidenceType: "PROJECT",
            evidenceRecordId: project.id,
            verified: true,
          },
        });
      }
    }

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: `PROJECT_VERIFY_${action}`,
        entityType: "Project",
        entityId: projectId,
        details: JSON.stringify({ action, verifiedBy: session.email, reviewerNotes }),
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

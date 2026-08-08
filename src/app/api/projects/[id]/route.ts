import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, logApiPerf } from "@/lib/apiResponse";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const { action, reason } = await req.json().catch(() => ({ action: "archive", reason: "Admin Archive" }));
    const projectId = params.id;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) return apiError("Project record not found", 404);

    const isArchival = action !== "restore";

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        isArchived: isArchival,
        archivedAt: isArchival ? new Date() : null,
        archivedReason: isArchival ? reason : null,
        archivedBy: isArchival ? session.email : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: isArchival ? "ARCHIVE_PROJECT" : "RESTORE_PROJECT",
        entityType: "Project",
        entityId: projectId,
        details: JSON.stringify({ title: project.title, reason }),
      },
    });

    logApiPerf("PATCH /api/projects/[id]", startTime);
    return apiSuccess({ project: updated }, `Project ${isArchival ? "archived" : "restored"} successfully.`);
  } catch (error: any) {
    return apiError(error.message || "Failed to update project archive status", 500);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return apiError("Forbidden: Unauthorized to delete project", 403);
    }

    const projectId = params.id;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) return apiError("Project record not found", 404);

    await prisma.project.delete({ where: { id: projectId } });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "PERMANENT_DELETE_PROJECT",
        entityType: "Project",
        entityId: projectId,
        details: JSON.stringify({ title: project.title, deletedBy: session.email }),
      },
    });

    logApiPerf("DELETE /api/projects/[id]", startTime);
    return apiSuccess({ id: projectId }, "Project permanently deleted.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to delete project", 500);
  }
}

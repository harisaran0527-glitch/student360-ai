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
    const noteId = params.id;

    const note = await prisma.notification.findUnique({
      where: { id: noteId },
    });

    if (!note) return apiError("Notification not found", 404);

    const isArchival = action !== "restore";

    const updated = await prisma.notification.update({
      where: { id: noteId },
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
        action: isArchival ? "ARCHIVE_NOTIFICATION" : "RESTORE_NOTIFICATION",
        entityType: "Notification",
        entityId: noteId,
        details: JSON.stringify({ title: note.title, emailSent: note.emailStatus === "SENT", reason }),
      },
    });

    logApiPerf("PATCH /api/notifications/[id]", startTime);
    return apiSuccess({ notification: updated }, `Notification ${isArchival ? "archived" : "restored"} successfully.`);
  } catch (error: any) {
    return apiError(error.message || "Failed to update notification archive status", 500);
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
      return apiError("Unauthorized", 401);
    }

    const noteId = params.id;
    const note = await prisma.notification.findUnique({
      where: { id: noteId },
    });

    if (!note) return apiError("Notification not found", 404);

    await prisma.notification.delete({ where: { id: noteId } });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "DELETE_NOTIFICATION",
        entityType: "Notification",
        entityId: noteId,
        details: JSON.stringify({ title: note.title, deletedBy: session.email }),
      },
    });

    logApiPerf("DELETE /api/notifications/[id]", startTime);
    return apiSuccess({ id: noteId, emailWasSent: note.emailStatus === "SENT" }, "Notification deleted from history.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to delete notification", 500);
  }
}

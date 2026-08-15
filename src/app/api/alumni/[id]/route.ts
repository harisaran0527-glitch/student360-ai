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
    const session = await getSession(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const { action, reason } = await req.json().catch(() => ({ action: "archive", reason: "Admin Archive" }));
    const recordId = params.id;

    const record = await prisma.alumniRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) return apiError("Alumni record not found", 404);

    const isArchival = action !== "restore";

    const updated = await prisma.alumniRecord.update({
      where: { id: recordId },
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
        action: isArchival ? "ARCHIVE_ALUMNI_RECORD" : "RESTORE_ALUMNI_RECORD",
        entityType: "AlumniRecord",
        entityId: recordId,
        details: JSON.stringify({ graduationYear: record.graduationYear, company: record.currentCompany, reason }),
      },
    });

    logApiPerf("PATCH /api/alumni/[id]", startTime);
    return apiSuccess({ alumniRecord: updated }, `Alumni record ${isArchival ? "archived" : "restored"} successfully.`);
  } catch (error: any) {
    return apiError(error.message || "Failed to update alumni record archive status", 500);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return apiError("Forbidden: Unauthorized to delete alumni record", 403);
    }

    const recordId = params.id;
    const record = await prisma.alumniRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) return apiError("Alumni record not found", 404);

    await prisma.alumniRecord.delete({ where: { id: recordId } });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "PERMANENT_DELETE_ALUMNI_RECORD",
        entityType: "AlumniRecord",
        entityId: recordId,
        details: JSON.stringify({ graduationYear: record.graduationYear, company: record.currentCompany, deletedBy: session.email }),
      },
    });

    logApiPerf("DELETE /api/alumni/[id]", startTime);
    return apiSuccess({ id: recordId }, "Alumni record permanently deleted.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to delete alumni record", 500);
  }
}

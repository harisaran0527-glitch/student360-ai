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
    const recordId = params.id;

    const record = await prisma.placementRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) return apiError("Placement record not found", 404);

    const isArchival = action !== "restore";

    const updated = await prisma.placementRecord.update({
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
        action: isArchival ? "ARCHIVE_PLACEMENT_RECORD" : "RESTORE_PLACEMENT_RECORD",
        entityType: "PlacementRecord",
        entityId: recordId,
        details: JSON.stringify({ companyName: record.companyName, jobTitle: record.jobTitle, status: record.status, reason }),
      },
    });

    logApiPerf("PATCH /api/placement/records/[id]", startTime);
    return apiSuccess({ placementRecord: updated }, `Placement record ${isArchival ? "archived" : "restored"} successfully.`);
  } catch (error: any) {
    return apiError(error.message || "Failed to update placement record archive status", 500);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return apiError("Forbidden: Permanent delete reserved for SUPER_ADMIN", 403);
    }

    const recordId = params.id;
    const record = await prisma.placementRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) return apiError("Placement record not found", 404);

    await prisma.placementRecord.delete({ where: { id: recordId } });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "PERMANENT_DELETE_PLACEMENT_RECORD",
        entityType: "PlacementRecord",
        entityId: recordId,
        details: JSON.stringify({ companyName: record.companyName, jobTitle: record.jobTitle, deletedBy: session.email }),
      },
    });

    logApiPerf("DELETE /api/placement/records/[id]", startTime);
    return apiSuccess({ id: recordId }, "Placement record permanently deleted.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to delete placement record", 500);
  }
}

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
    if (!session) return apiError("Unauthorized", 401);

    const { action, reason } = await req.json().catch(() => ({ action: "archive", reason: "Admin Archive" }));
    const internshipId = params.id;

    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
    });

    if (!internship) return apiError("Internship record not found", 404);

    const isArchival = action !== "restore";

    const updated = await prisma.internship.update({
      where: { id: internshipId },
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
        action: isArchival ? "ARCHIVE_INTERNSHIP" : "RESTORE_INTERNSHIP",
        entityType: "Internship",
        entityId: internshipId,
        details: JSON.stringify({ companyName: internship.companyName, role: internship.role, reason }),
      },
    });

    logApiPerf("PATCH /api/internships/[id]", startTime);
    return apiSuccess({ internship: updated }, `Internship record ${isArchival ? "archived" : "restored"} successfully.`);
  } catch (error: any) {
    return apiError(error.message || "Failed to update internship archive status", 500);
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

    const internshipId = params.id;
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
    });

    if (!internship) return apiError("Internship record not found", 404);

    await prisma.internship.delete({ where: { id: internshipId } });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "PERMANENT_DELETE_INTERNSHIP",
        entityType: "Internship",
        entityId: internshipId,
        details: JSON.stringify({ companyName: internship.companyName, role: internship.role, deletedBy: session.email }),
      },
    });

    logApiPerf("DELETE /api/internships/[id]", startTime);
    return apiSuccess({ id: internshipId }, "Internship permanently deleted.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to delete internship", 500);
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, logApiPerf } from "@/lib/apiResponse";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return apiError("Unauthorized: Only Admin can delete batches", 401);
    }

    const batchId = params.id;
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        _count: { select: { students: true } },
      },
    });

    if (!batch) return apiError("Batch record not found", 404);

    if (batch._count.students > 0) {
      return apiError(`Cannot delete Batch '${batch.name}': ${batch._count.students} students belong to this batch. Delete or reassign students first.`, 400);
    }

    await prisma.$transaction([
      prisma.semesterConfig.deleteMany({ where: { batchId } }),
      prisma.batch.delete({ where: { id: batchId } }),
      prisma.auditLog.create({
        data: {
          userId: session.id,
          userEmail: session.email,
          userRole: session.role,
          action: "PERMANENT_DELETE_BATCH",
          entityType: "Batch",
          entityId: batchId,
          details: JSON.stringify({ name: batch.name, deletedBy: session.email }),
        },
      }),
    ]);

    logApiPerf("DELETE /api/batches/[id]", startTime);
    return apiSuccess({ id: batchId }, `Batch '${batch.name}' permanently deleted.`, 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to delete batch record", 500);
  }
}

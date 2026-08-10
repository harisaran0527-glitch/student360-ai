import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized: Only Admin can update bus records.", 403);
    }

    const recordId = params.id;
    const existing = await prisma.busRecord.findUnique({
      where: { id: recordId },
    });

    if (!existing) {
      return apiError("Bus record not found.", 404);
    }

    const data = await req.json();
    const { resident, busNo, route, boardingPoint } = data;

    const updated = await prisma.busRecord.update({
      where: { id: recordId },
      data: {
        resident: resident !== undefined ? String(resident).trim() : existing.resident,
        busNo: busNo !== undefined ? String(busNo).trim() : existing.busNo,
        route: route !== undefined ? String(route).trim() : existing.route,
        boardingPoint: boardingPoint !== undefined ? String(boardingPoint).trim() : existing.boardingPoint,
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            registerNo: true,
            rollNo: true,
            residenceType: true,
          },
        },
      },
    });

    logApiPerf("PUT /api/bus/[id]", startTime);
    return apiSuccess({ busRecord: updated }, "Bus record updated successfully.");
  } catch (error: any) {
    return apiError(error.message || "Failed to update bus record", 500);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized: Only Admin can delete bus records.", 403);
    }

    const recordId = params.id;
    const existing = await prisma.busRecord.findUnique({
      where: { id: recordId },
    });

    if (!existing) {
      return apiError("Bus record not found.", 404);
    }

    // Permanent delete as required by prompt (Do NOT move to archive)
    await prisma.busRecord.delete({
      where: { id: recordId },
    });

    logApiPerf("DELETE /api/bus/[id]", startTime);
    return apiSuccess({}, "Bus record permanently deleted successfully.");
  } catch (error: any) {
    return apiError(error.message || "Failed to delete bus record", 500);
  }
}

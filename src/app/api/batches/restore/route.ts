import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { batchId } = await req.json();
    if (!batchId) return NextResponse.json({ error: "batchId is required" }, { status: 400 });

    const batch = await prisma.batch.update({
      where: { id: batchId },
      data: {
        isArchived: false,
        status: "ACTIVE",
        archivedAt: null,
        archivedReason: null,
        archivedBy: null,
      },
    });

    // Also restore students in batch
    await prisma.studentProfile.updateMany({
      where: { batchId },
      data: {
        isArchived: false,
        archivedAt: null,
        archiveReason: null,
        archivedBy: null,
        restoredAt: new Date(),
        restoredBy: session.email,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "RESTORE_BATCH",
        entityType: "Batch",
        entityId: batchId,
        details: JSON.stringify({ batchName: batch.name, restoredBy: session.email }),
      },
    });

    return NextResponse.json({ success: true, message: `Batch ${batch.name} restored.`, batch });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

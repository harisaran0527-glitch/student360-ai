import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { batchId, reason } = await req.json();
    if (!batchId) return NextResponse.json({ error: "batchId is required" }, { status: 400 });

    const batch = await prisma.batch.update({
      where: { id: batchId },
      data: {
        isArchived: true,
        status: "ARCHIVED",
        archivedAt: new Date(),
        archivedReason: reason || "Batch Archival",
        archivedBy: session.email,
      },
    });

    // Also soft archive all students in batch
    await prisma.studentProfile.updateMany({
      where: { batchId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archiveReason: reason || "Batch Archival",
        archivedBy: session.email,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "ARCHIVE_BATCH",
        entityType: "Batch",
        entityId: batchId,
        details: JSON.stringify({ batchName: batch.name, reason, archivedBy: session.email }),
      },
    });

    return NextResponse.json({ success: true, message: `Batch ${batch.name} archived.`, batch });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

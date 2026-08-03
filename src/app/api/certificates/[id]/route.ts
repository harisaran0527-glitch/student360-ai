import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, logApiPerf } from "@/lib/apiResponse";
import fs from "fs/promises";
import path from "path";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);

    const updates = await req.json();

    const existing = await prisma.certificate.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return apiError("Certificate not found", 404);
    }

    // Clean up old file if replacing file
    if (updates.documentUrl && updates.documentUrl !== existing.documentUrl && existing.documentUrl.startsWith("/uploads/")) {
      try {
        const oldPath = path.join(process.cwd(), "public", existing.documentUrl.slice(1));
        await fs.unlink(oldPath);
      } catch {
        // Ignore file cleanup errors if old file was already deleted
      }
    }

    const certificate = await prisma.certificate.update({
      where: { id: params.id },
      data: {
        ...updates,
        verificationStatus: session.role === "ADMIN" || session.role === "SUPER_ADMIN" ? "APPROVED" : "PENDING",
        reviewerNotes: null,
        rejectionReason: null,
      },
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "EDIT_CERTIFICATE_SUBMISSION",
        entityType: "Certificate",
        entityId: params.id,
        details: JSON.stringify({ title: certificate.title, editedBy: session.email }),
      },
    });

    logApiPerf("PUT /api/certificates/[id]", startTime);
    return apiSuccess({ certificate }, "Certificate updated successfully.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to update certificate", 500);
  }
}

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
    const certId = params.id;

    const cert = await prisma.certificate.findUnique({
      where: { id: certId },
    });

    if (!cert) return apiError("Certificate record not found", 404);

    const isArchival = action !== "restore";

    const updated = await prisma.certificate.update({
      where: { id: certId },
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
        action: isArchival ? "ARCHIVE_CERTIFICATE" : "RESTORE_CERTIFICATE",
        entityType: "Certificate",
        entityId: certId,
        details: JSON.stringify({ title: cert.title, issuingBody: cert.issuingBody, reason }),
      },
    });

    logApiPerf("PATCH /api/certificates/[id]", startTime);
    return apiSuccess({ certificate: updated }, `Certificate ${isArchival ? "archived" : "restored"} successfully.`);
  } catch (error: any) {
    return apiError(error.message || "Failed to update certificate archive status", 500);
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

    const cert = await prisma.certificate.findUnique({
      where: { id: params.id },
    });

    if (!cert) return apiError("Certificate record not found", 404);

    // Delete database record
    await prisma.certificate.delete({
      where: { id: params.id },
    });

    // Clean up file from disk
    if (cert.documentUrl && cert.documentUrl.startsWith("/uploads/")) {
      try {
        const filePath = path.join(process.cwd(), "public", cert.documentUrl.slice(1));
        await fs.unlink(filePath);
      } catch {
        // Ignore file cleanup error if already removed
      }
    }

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "PERMANENT_DELETE_CERTIFICATE",
        entityType: "Certificate",
        entityId: params.id,
        details: JSON.stringify({ title: cert.title, deletedBy: session.email }),
      },
    });

    logApiPerf("DELETE /api/certificates/[id]", startTime);
    return apiSuccess({ id: params.id }, "Certificate record permanently deleted.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to delete certificate", 500);
  }
}

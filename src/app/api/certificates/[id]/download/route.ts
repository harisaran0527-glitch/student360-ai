import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiError } from "@/lib/apiResponse";
import fs from "fs/promises";
import path from "path";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(req);
    if (!session) return apiError("Unauthorized", 401);

    const certificateId = params.id;
    const cert = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: { student: true },
    });

    if (!cert) return apiError("Certificate record not found", 404);

    // Access Control Authorization Check
    const isAdmin = session.role === "ADMIN" || session.role === "SUPER_ADMIN";
    const isOwnerStudent = session.role === "STUDENT" && (session.studentId === cert.studentId || cert.student?.userId === session.id);

    if (!isAdmin && !isOwnerStudent) {
      return apiError("Forbidden: You do not have permission to view or download this certificate.", 403);
    }

    const { searchParams } = new URL(req.url);
    const isDownloadMode = searchParams.get("download") === "true";

    // Clean relative file path
    const relativeUrl = cert.documentUrl.startsWith("/") ? cert.documentUrl.slice(1) : cert.documentUrl;
    const filePath = path.join(process.cwd(), "public", relativeUrl);

    try {
      const fileBuffer = await fs.readFile(filePath);
      const mimeType = cert.mimeType || (cert.documentUrl.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
      const safeName = cert.fileName || `certificate_${cert.id}${path.extname(cert.documentUrl)}`;

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `${isDownloadMode ? "attachment" : "inline"}; filename="${encodeURIComponent(safeName)}"`,
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      });
    } catch {
      // Fallback if local file not found on disk
      if (cert.documentUrl.startsWith("http")) {
        return NextResponse.redirect(cert.documentUrl);
      }
      return apiError("Certificate file not found on server storage.", 404);
    }
  } catch (error: any) {
    return apiError(error.message || "Failed to serve certificate file", 500);
  }
}

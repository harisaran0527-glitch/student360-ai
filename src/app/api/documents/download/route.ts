import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const documentPath = searchParams.get("path");
    const studentIdParam = searchParams.get("studentId");

    if (!documentPath) {
      return NextResponse.json({ error: "Document path required" }, { status: 400 });
    }

    // Security: Student Self-Scope Authorization
    if (session.role === "STUDENT" && studentIdParam && session.studentId !== studentIdParam) {
      return NextResponse.json({ error: "Forbidden: Cannot access other student documents" }, { status: 403 });
    }

    // Path Traversal Defense
    const sanitizedFilename = path.basename(documentPath);
    const fullPath = path.join(process.cwd(), "public", "uploads", sanitizedFilename);

    try {
      await fs.access(fullPath);
    } catch (err) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(fullPath);

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "DOCUMENT_ACCESSED",
        entityType: "Document",
        entityId: sanitizedFilename,
        details: `Downloaded document: ${sanitizedFilename}`,
      },
    });

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${sanitizedFilename}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

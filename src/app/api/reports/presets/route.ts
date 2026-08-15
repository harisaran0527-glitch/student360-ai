import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const presets = await prisma.savedReportPreset.findMany({
      where: { createdBy: session.id },
      orderBy: { lastUsedAt: "desc" },
    });

    return NextResponse.json({ presets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, description, reportCategory, reportType, filters } = body;

    if (!name || !reportCategory || !reportType) {
      return NextResponse.json({ error: "Name, category, and report type are required" }, { status: 400 });
    }

    const preset = await prisma.savedReportPreset.create({
      data: {
        name,
        description: description || null,
        reportCategory,
        reportType,
        filters: JSON.stringify(filters || {}),
        createdBy: session.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "SAVED_REPORT_CREATED",
        entityType: "SavedReportPreset",
        entityId: preset.id,
        details: `Saved report preset: ${name}`,
      },
    });

    return NextResponse.json({ preset, message: "Report preset saved successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Preset ID required" }, { status: 400 });

    await prisma.savedReportPreset.deleteMany({
      where: { id, createdBy: session.id },
    });

    return NextResponse.json({ message: "Report preset deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

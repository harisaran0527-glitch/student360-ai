import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const configs = await prisma.scheduledReportConfig.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ configs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { reportType, frequency, recipients, filters, enabled } = body;

    if (!reportType || !frequency || !recipients) {
      return NextResponse.json({ error: "Report type, frequency, and recipients required" }, { status: 400 });
    }

    const config = await prisma.scheduledReportConfig.create({
      data: {
        reportType,
        frequency: frequency || "WEEKLY",
        recipients: Array.isArray(recipients) ? JSON.stringify(recipients) : recipients,
        filters: JSON.stringify(filters || {}),
        enabled: enabled !== undefined ? enabled : true,
        createdBy: session.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "SCHEDULED_REPORT_CONFIGURED",
        entityType: "ScheduledReportConfig",
        entityId: config.id,
        details: `Configured scheduled report: ${reportType} (${frequency})`,
      },
    });

    return NextResponse.json({ config, message: "Scheduled report configuration created" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

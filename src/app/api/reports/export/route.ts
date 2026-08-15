import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { executeReportQuery } from "@/lib/reports/reportEngine";
import { generateCSVReport, generateExcelReportBuffer } from "@/lib/reports/exportUtils";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { reportId, format = "csv", filters = {} } = body;

    if (!reportId) return NextResponse.json({ error: "Report ID required" }, { status: 400 });

    let userDepartmentId;
    if (session.role === "FACULTY") {
      const facultyDept = await prisma.department.findFirst();
      if (facultyDept) userDepartmentId = facultyDept.id;
    }

    const reportResult = await executeReportQuery(reportId, filters, session.role, userDepartmentId);

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "REPORT_EXPORTED",
        entityType: "Report",
        entityId: reportId,
        details: `Exported report ${reportId} in ${format.toUpperCase()} format (${reportResult.totalRows} rows)`,
      },
    });

    const filename = `${reportId.toLowerCase()}_${Date.now()}`;

    if (format === "xlsx" || format === "excel") {
      const excelBuffer = generateExcelReportBuffer(reportResult);
      return new NextResponse(new Uint8Array(excelBuffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      });
    }

    // Default CSV Export
    const csvContent = generateCSVReport(reportResult);
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

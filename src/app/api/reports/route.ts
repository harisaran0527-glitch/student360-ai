import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { executeReportQuery } from "@/lib/reports/reportEngine";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get("reportId") || "STUDENT_MASTER_FULL";

    const filters = {
      academicYear: searchParams.get("academicYear") || undefined,
      batchId: searchParams.get("batchId") || undefined,
      departmentId: searchParams.get("departmentId") || undefined,
      sectionId: searchParams.get("sectionId") || undefined,
      semester: searchParams.get("semester") ? parseInt(searchParams.get("semester")!, 10) : undefined,
      academicStatus: searchParams.get("academicStatus") || undefined,
      verificationStatus: searchParams.get("verificationStatus") || undefined,
      internshipStatus: searchParams.get("internshipStatus") || undefined,
      placementStatus: searchParams.get("placementStatus") || undefined,
      projectType: searchParams.get("projectType") || undefined,
      certificateCategory: searchParams.get("certificateCategory") || undefined,
      achievementCategory: searchParams.get("achievementCategory") || undefined,
      targetRoleId: searchParams.get("targetRoleId") || undefined,
      includeSensitiveData: searchParams.get("includeSensitiveData") === "true",
    };

    // Role Scope Access Control
    let userDepartmentId;
    if (session.role === "FACULTY") {
      // Find faculty user department if available
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
        action: "REPORT_GENERATED",
        entityType: "Report",
        entityId: reportId,
        details: `Generated report: ${reportResult.reportName} (${reportResult.totalRows} rows)`,
      },
    });

    return NextResponse.json({ reportResult });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

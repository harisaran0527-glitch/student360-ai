import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const academicYearParam = searchParams.get("academicYear") || "";

    const studentWhere: any = {};
    if (academicYearParam && academicYearParam !== "ALL") {
      studentWhere.academicYear = academicYearParam;
    }

    const [
      currentAcademicYearObj,
      totalStudents,
      activeStudents,
      graduatingStudents,
      graduatedCount,
      alumniCount,
      archivedCount,
      activeBatchesCount,
      upcomingBatchesCount,
      totalDepartments,
      allStudents,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.academicYear.findFirst({ where: { isCurrent: true } }),
      prisma.studentProfile.count({ where: studentWhere }),
      prisma.studentProfile.count({ where: { ...studentWhere, academicStatus: "PURSUING", isArchived: false } }),
      prisma.studentProfile.count({ where: { ...studentWhere, currentSemester: 8, academicStatus: "PURSUING", isArchived: false } }),
      prisma.studentProfile.count({ where: { ...studentWhere, academicStatus: "GRADUATED", isArchived: false } }),
      prisma.studentProfile.count({ where: { ...studentWhere, academicStatus: "ALUMNI", isArchived: false } }),
      prisma.studentProfile.count({ where: { ...studentWhere, isArchived: true } }),
      prisma.batch.count({ where: { status: "ACTIVE", isArchived: false } }),
      prisma.batch.count({ where: { status: "UPCOMING", isArchived: false } }),
      prisma.department.count(),
      prisma.studentProfile.findMany({
        where: { ...studentWhere, isArchived: false },
        select: { cgpa: true, attendancePercentage: true },
      }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const avgAttendance =
      allStudents.length > 0
        ? Number(
            (
              allStudents.reduce((sum, s) => sum + s.attendancePercentage, 0) /
              allStudents.length
            ).toFixed(1)
          )
        : 0;

    return NextResponse.json({
      stats: {
        currentAcademicYear: currentAcademicYearObj?.yearCode || "2025-2026",
        totalStudents,
        activeStudents,
        graduatingStudents,
        graduatedCount,
        alumniCount,
        archivedCount,
        activeBatchesCount,
        upcomingBatchesCount,
        totalDepartments,
        avgAttendance,
      },
      recentAuditLogs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

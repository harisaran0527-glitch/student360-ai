import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
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
      avgAttendanceRes,
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
      prisma.studentProfile.aggregate({
        where: { ...studentWhere, isArchived: false },
        _avg: { attendancePercentage: true },
      }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const avgAttendance = Number((avgAttendanceRes._avg.attendancePercentage || 0).toFixed(1));

    return NextResponse.json(
      {
        stats: {
          currentAcademicYear: currentAcademicYearObj?.yearCode || DEFAULT_ACADEMIC_YEAR,
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
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=10, s-maxage=30, stale-while-revalidate=30",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


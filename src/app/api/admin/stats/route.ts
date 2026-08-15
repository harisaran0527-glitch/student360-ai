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

    const currentAcademicYearObj = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
    const statusGroups = await prisma.studentProfile.groupBy({
      by: ["academicStatus", "isArchived", "currentSemester"],
      where: studentWhere,
      _count: { _all: true },
      _avg: { attendancePercentage: true },
    });
    const batchGroups = await prisma.batch.groupBy({
      by: ["status", "isArchived"],
      _count: { _all: true },
    });
    const totalDepartments = await prisma.department.count();
    const recentAuditLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    let totalStudents = 0;
    let activeStudents = 0;
    let graduatingStudents = 0;
    let graduatedCount = 0;
    let alumniCount = 0;
    let archivedCount = 0;
    let totalAttendanceSum = 0;
    let attendanceCount = 0;

    for (const group of statusGroups) {
      const count = group._count._all || 0;
      totalStudents += count;

      if (group.isArchived) {
        archivedCount += count;
      } else {
        const avgAtt = group._avg.attendancePercentage || 0;
        totalAttendanceSum += avgAtt * count;
        attendanceCount += count;

        if (group.academicStatus === "PURSUING") {
          activeStudents += count;
          if (group.currentSemester === 8) {
            graduatingStudents += count;
          }
        } else if (group.academicStatus === "GRADUATED") {
          graduatedCount += count;
        } else if (group.academicStatus === "ALUMNI") {
          alumniCount += count;
        }
      }
    }

    const avgAttendance = attendanceCount > 0 ? Number((totalAttendanceSum / attendanceCount).toFixed(1)) : 0;

    let activeBatchesCount = 0;
    let upcomingBatchesCount = 0;

    for (const group of batchGroups) {
      if (!group.isArchived) {
        if (group.status === "ACTIVE") {
          activeBatchesCount += group._count._all || 0;
        } else if (group.status === "UPCOMING") {
          upcomingBatchesCount += group._count._all || 0;
        }
      }
    }

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


import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) {
      console.warn("[ACADEMIC_OPTIONS_API] Route: GET /api/academic-options | Role: UNAUTHENTICATED | Status: 401");
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // 1. Fetch non-archived Academic Years ordered by current active first, then descending year code
    const rawAcademicYears = await prisma.academicYear.findMany({
      orderBy: [{ isCurrent: "desc" }, { yearCode: "desc" }],
    });

    // Normalize dash format in yearCode (e.g. 2025–2026 en-dash to hyphen 2025-2026)
    const academicYears = rawAcademicYears.map((ay) => {
      const normalizedCode = (ay.yearCode || "").replace(/[\u2013\u2014]/g, "-").trim();
      return {
        id: ay.id,
        yearCode: normalizedCode,
        name: ay.name || `Academic Year ${normalizedCode}`,
        status: ay.status || "ACTIVE",
        isCurrent: Boolean(ay.isCurrent),
      };
    });

    // Identify current active year or fallback to first available
    const currentActiveYear = academicYears.find((y) => y.isCurrent) || academicYears[0];

    // 2. Fetch non-archived Batches
    const rawBatches = await prisma.batch.findMany({
      where: { isArchived: false },
      include: {
        department: true,
        _count: { select: { students: true } },
      },
      orderBy: [{ admissionYear: "desc" }, { name: "desc" }],
    });

    const batches = rawBatches.map((b) => ({
      id: b.id,
      name: b.name,
      admissionYear: b.admissionYear,
      graduationYear: b.expectedGraduationYear,
      expectedGraduationYear: b.expectedGraduationYear,
      admissionAcademicYear: `${b.admissionYear}-${b.admissionYear + 1}`,
      departmentId: b.departmentId,
      departmentCode: b.department?.code || "AIML",
      currentSemester: b.currentSemester,
      status: b.status,
      studentCount: b._count?.students || 0,
      _count: { students: b._count?.students || 0 },
    }));

    return NextResponse.json(
      {
        success: true,
        academicYears,
        batches,
        currentYearCode: currentActiveYear?.yearCode || "2025-2026",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: any) {
    console.error("[ACADEMIC_OPTIONS_API_ERROR]", {
      message: error?.message,
      code: error?.code,
    });
    return NextResponse.json(
      { success: false, error: "Failed to load academic options from database." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}

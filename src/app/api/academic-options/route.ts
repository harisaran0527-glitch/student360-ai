import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  ACADEMIC_YEAR_OPTIONS,
  BATCH_OPTIONS,
  DEFAULT_ACADEMIC_YEAR,
  isSelectableAcademicYear,
  isSelectableBatch,
} from "@/lib/academicYearConstants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      );
    }

    // Parallel execution of all 3 metadata queries with minimal SELECT payloads
    const [rawYears, rawBatches, rawDepts] = await Promise.all([
      prisma.academicYear.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          yearCode: true,
          name: true,
          isCurrent: true,
          status: true,
        },
        orderBy: [{ isCurrent: "desc" }, { yearCode: "asc" }],
      }),
      prisma.batch.findMany({
        where: {
          isArchived: false,
          admissionYear: { gte: 2025 },
        },
        select: {
          id: true,
          name: true,
          admissionYear: true,
          expectedGraduationYear: true,
          departmentId: true,
          _count: { select: { students: true } },
        },
        orderBy: [{ admissionYear: "asc" }, { name: "asc" }],
      }),
      prisma.department.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          hodName: true,
        },
        orderBy: { code: "asc" },
      }),
    ]);

    const academicYears = rawYears
      .map((ay) => ({
        id: ay.id,
        yearCode: (ay.yearCode || "").replace(/[\u2013\u2014]/g, "-").trim(),
        name: ay.name || `Academic Year ${ay.yearCode}`,
        isCurrent: Boolean(ay.isCurrent),
        status: ay.status || "ACTIVE",
      }))
      .filter((ay) => isSelectableAcademicYear(ay.yearCode));

    const batches = rawBatches
      .filter((b) => isSelectableBatch(b.name))
      .map((b) => ({
        id: b.id,
        name: b.name,
        admissionYear: b.admissionYear,
        expectedGraduationYear: b.expectedGraduationYear,
        graduationYear: b.expectedGraduationYear,
        studentCount: b._count?.students || 0,
        departmentId: b.departmentId,
      }));

    const departments = rawDepts;

    const currentYear = academicYears.find((y) => y.isCurrent) || academicYears[0];

    return NextResponse.json(
      {
        academicYears,
        batches,
        departments,
        currentYearCode: currentYear?.yearCode || DEFAULT_ACADEMIC_YEAR,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: any) {
    console.error("[ACADEMIC_OPTIONS_API_ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to load academic options" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getOrCreateDefaultDepartment } from "@/lib/departmentEngine";
import { BATCH_OPTIONS, isSelectableBatch } from "@/lib/academicYearConstants";

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

    // Fast Single-Query Fetch with explicit SELECT payload
    let batches = await prisma.batch.findMany({
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
    });

    // Auto-populate initial 10 batch options ONLY if table is empty
    if (batches.length === 0) {
      try {
        const dept = await getOrCreateDefaultDepartment();
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const activeAdmissionYear = currentMonth < 6 ? currentYear - 1 : currentYear;

        await prisma.batch.createMany({
          data: BATCH_OPTIONS.map((batchOpt) => {
            const yr = parseInt(batchOpt.split("-")[0], 10);
            return {
              name: `${yr}-${yr + 1}`,
              admissionYear: yr,
              expectedGraduationYear: yr + 1,
              departmentId: dept.id,
              totalSemesters: 8,
              currentSemester: Math.min(Math.max((activeAdmissionYear - yr) * 2 + 1, 1), 8),
              status: "ACTIVE",
            };
          }),
          skipDuplicates: true,
        });

        batches = await prisma.batch.findMany({
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
        });
      } catch (e) {
        console.warn("Batch initial populate warning:", e);
      }
    }

    const enrichedBatches = batches
      .filter((b) => isSelectableBatch(b.name))
      .map((b) => ({
        id: b.id,
        name: b.name,
        admissionYear: b.admissionYear,
        expectedGraduationYear: b.expectedGraduationYear,
        graduationYear: b.expectedGraduationYear,
        admissionAcademicYear: `${b.admissionYear}-${b.admissionYear + 4}`,
        studentCount: b._count?.students || 0,
        departmentId: b.departmentId,
      }));

    return NextResponse.json(
      { batches: enrichedBatches },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: any) {
    console.error("[BATCHES_API_ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to load batches" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { admissionYear } = await req.json();

    const startYr = Math.max(parseInt(admissionYear, 10) || 2025, 2025);
    const name = `${startYr}-${startYr + 1}`;

    const existing = await prisma.batch.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: `Batch ${name} already exists` }, { status: 400 });
    }

    const dept = await getOrCreateDefaultDepartment();

    const batch = await prisma.batch.create({
      data: {
        name,
        admissionYear: startYr,
        expectedGraduationYear: startYr + 1,
        departmentId: dept.id,
        courseTitle: "B.E. Artificial Intelligence & Machine Learning",
        totalSemesters: 8,
        currentSemester: 1,
        status: "ACTIVE",
      },
    });

    for (let sem = 1; sem <= 8; sem++) {
      const ayStart = startYr + Math.floor((sem - 1) / 2);
      await prisma.semesterConfig.create({
        data: {
          batchId: batch.id,
          semesterNumber: sem,
          academicYearCode: `${ayStart}-${ayStart + 4}`,
          status: sem === 1 ? "CURRENT" : "UPCOMING",
          internshipRequired: sem === 5 || sem === 6,
        },
      });
    }

    return NextResponse.json({ batch, message: "Batch created successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getOrCreateDefaultDepartment } from "@/lib/departmentEngine";

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

    try {
      const dept = await getOrCreateDefaultDepartment();
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const activeAdmissionYear = currentMonth < 6 ? currentYear - 1 : currentYear;

      const baseAdmissionYear = 2025;
      const targetMaxYear = Math.max(activeAdmissionYear + 1, 2026);

      for (let yr = baseAdmissionYear; yr <= targetMaxYear; yr++) {
        const batchName = `${yr}-${yr + 1}`;
        const existing = await prisma.batch.findUnique({ where: { name: batchName } });
        if (!existing) {
          await prisma.batch.create({
            data: {
              name: batchName,
              admissionYear: yr,
              expectedGraduationYear: yr + 1,
              departmentId: dept.id,
              totalSemesters: 8,
              currentSemester: Math.min(Math.max((activeAdmissionYear - yr) * 2 + 1, 1), 8),
              status: "ACTIVE",
            },
          });
        }
      }
    } catch (e) {
      console.warn("Batch auto-init non-fatal warning:", e);
    }

    const batches = await prisma.batch.findMany({
      where: { isArchived: false },
      include: {
        department: true,
        _count: { select: { students: true } },
      },
      orderBy: [{ admissionYear: "desc" }, { name: "desc" }],
    });

    const enrichedBatches = batches.map((b) => ({
      ...b,
      graduationYear: b.expectedGraduationYear,
      admissionAcademicYear: `${b.admissionYear}-${b.admissionYear + 4}`,
      studentCount: b._count?.students || 0,
    }));

    return NextResponse.json(
      { batches: enrichedBatches },
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

    const startYr = parseInt(admissionYear, 10) || 2025;
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

    // Create 8 default SemesterConfigs
    for (let sem = 1; sem <= 8; sem++) {
      await prisma.semesterConfig.create({
        data: {
          batchId: batch.id,
          semesterNumber: sem,
          academicYearCode: `${startYr + Math.floor((sem - 1) / 2)}-${
            startYr + Math.floor((sem - 1) / 2) + 1
          }`,
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

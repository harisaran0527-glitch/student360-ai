import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getOrCreateDefaultDepartment } from "@/lib/departmentEngine";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dept = await getOrCreateDefaultDepartment();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    // Current admission year (if before June, admission year was previous calendar year)
    const activeAdmissionYear = currentMonth < 6 ? currentYear - 1 : currentYear;

    // Idempotently create batches for admission years starting 2025 up to activeAdmissionYear + 1
    const baseAdmissionYear = 2025;
    const targetMaxYear = Math.max(activeAdmissionYear + 1, 2026);

    for (let yr = baseAdmissionYear; yr <= targetMaxYear; yr++) {
      const batchName = `${yr}-${yr + 4}`;
      const existing = await prisma.batch.findUnique({ where: { name: batchName } });
      if (!existing) {
        await prisma.batch.create({
          data: {
            name: batchName,
            admissionYear: yr,
            expectedGraduationYear: yr + 4,
            departmentId: dept.id,
            totalSemesters: 8,
            currentSemester: Math.min(Math.max((activeAdmissionYear - yr) * 2 + 1, 1), 8),
            status: "ACTIVE",
          },
        });
      }
    }

    const batches = await prisma.batch.findMany({
      where: {
        departmentId: dept.id,
      },
      include: {
        department: true,
        _count: { select: { students: true } },
      },
      orderBy: { admissionYear: "desc" },
    });

    const enrichedBatches = batches.map((b) => ({
      ...b,
      admissionAcademicYear: `${b.admissionYear}-${b.admissionYear + 1}`,
    }));

    return NextResponse.json({ batches: enrichedBatches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    const name = `${startYr}-${startYr + 4}`;

    const existing = await prisma.batch.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: `Batch ${name} already exists` }, { status: 400 });
    }

    const dept = await getOrCreateDefaultDepartment();

    const batch = await prisma.batch.create({
      data: {
        name,
        admissionYear: startYr,
        expectedGraduationYear: startYr + 4,
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

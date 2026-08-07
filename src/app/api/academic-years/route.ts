import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ACADEMIC_YEAR_OPTIONS, isSelectableAcademicYear, DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";

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

    // Fast Single-Query Fetch with minimal field selection
    let rawYears = await prisma.academicYear.findMany({
      select: {
        id: true,
        yearCode: true,
        name: true,
        isCurrent: true,
        status: true,
      },
      orderBy: [{ isCurrent: "desc" }, { yearCode: "asc" }],
    });

    // Auto-populate initial 10 academic years ONLY if table is empty
    if (rawYears.length === 0) {
      try {
        await prisma.academicYear.createMany({
          data: ACADEMIC_YEAR_OPTIONS.map((yearCode) => {
            const startYr = parseInt(yearCode.split("-")[0], 10);
            const endYr = parseInt(yearCode.split("-")[1], 10);
            return {
              yearCode,
              name: `Academic Year ${yearCode}`,
              startDate: `${startYr}-06-01`,
              endDate: `${endYr}-05-31`,
              status: "ACTIVE",
              isCurrent: yearCode === DEFAULT_ACADEMIC_YEAR,
            };
          }),
          skipDuplicates: true,
        });

        rawYears = await prisma.academicYear.findMany({
          select: {
            id: true,
            yearCode: true,
            name: true,
            isCurrent: true,
            status: true,
          },
          orderBy: [{ isCurrent: "desc" }, { yearCode: "asc" }],
        });
      } catch (e) {
        console.warn("AcademicYear initial populate warning:", e);
      }
    }

    const academicYears = rawYears
      .map((ay) => {
        const normalizedCode = (ay.yearCode || "").replace(/[\u2013\u2014]/g, "-").trim();
        return {
          id: ay.id,
          yearCode: normalizedCode,
          name: ay.name || `Academic Year ${normalizedCode}`,
          status: ay.status || "ACTIVE",
          isCurrent: Boolean(ay.isCurrent),
        };
      })
      .filter((ay) => isSelectableAcademicYear(ay.yearCode));

    const currentYear = academicYears.find((y) => y.isCurrent) || academicYears[0];

    return NextResponse.json(
      {
        academicYears,
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
    console.error("[ACADEMIC_YEARS_API_ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to load academic years" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { yearCode, name, startDate, endDate, notes, isCurrent } = body;

    if (!yearCode) {
      return NextResponse.json({ error: "Academic Year code (e.g. 2026-2030) required" }, { status: 400 });
    }

    const existing = await prisma.academicYear.findUnique({ where: { yearCode } });
    if (existing) {
      return NextResponse.json({ error: `Academic Year ${yearCode} already exists` }, { status: 400 });
    }

    let newYear;
    await prisma.$transaction(async (tx) => {
      if (isCurrent) {
        await tx.academicYear.updateMany({ data: { isCurrent: false } });
      }

      newYear = await tx.academicYear.create({
        data: {
          yearCode,
          name: name || `Academic Year ${yearCode}`,
          startDate: startDate || null,
          endDate: endDate || null,
          status: "ACTIVE",
          isCurrent: Boolean(isCurrent),
          notes: notes || null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.id,
          userEmail: session.email,
          userRole: session.role,
          action: "ACADEMIC_YEAR_CREATED",
          entityType: "AcademicYear",
          entityId: newYear.id,
          details: `Created Academic Year ${yearCode}`,
        },
      });
    });

    return NextResponse.json({ academicYear: newYear, message: "Academic Year created successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, isCurrent, status } = body;

    if (!id) return NextResponse.json({ error: "Academic Year ID required" }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      if (isCurrent) {
        await tx.academicYear.updateMany({ data: { isCurrent: false } });
      }

      await tx.academicYear.update({
        where: { id },
        data: {
          ...(isCurrent !== undefined ? { isCurrent: Boolean(isCurrent) } : {}),
          ...(status ? { status } : {}),
        },
      });
    });

    return NextResponse.json({ message: "Academic Year updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Academic Year ID required" }, { status: 400 });

    const acadYear = await prisma.academicYear.findUnique({ where: { id } });
    if (!acadYear) return NextResponse.json({ error: "Academic Year not found" }, { status: 404 });

    const studentCount = await prisma.studentProfile.count({
      where: {
        OR: [{ academicYear: acadYear.yearCode }, { admissionAcademicYearId: acadYear.id }],
      },
    });

    if (studentCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete Academic Year ${acadYear.yearCode}: ${studentCount} student records are permanently linked to it. Close or archive the year instead.`,
        },
        { status: 400 }
      );
    }

    await prisma.academicYear.delete({ where: { id } });

    return NextResponse.json({ message: "Academic Year deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureCurrentAcademicYear } from "@/lib/academicYearEngine";

export async function GET() {
  try {
    // Ensure current academic year is initialized
    await ensureCurrentAcademicYear();

    const academicYears = await prisma.academicYear.findMany({
      orderBy: { yearCode: "desc" },
    });

    const currentYear = academicYears.find((y) => y.isCurrent) || academicYears[0];

    return NextResponse.json({
      academicYears,
      currentYearCode: currentYear?.yearCode || "2025-2026",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
      return NextResponse.json({ error: "Academic Year code (e.g. 2026-2027) required" }, { status: 400 });
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

    // Block deletion if related student records exist!
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

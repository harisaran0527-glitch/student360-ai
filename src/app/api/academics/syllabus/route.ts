import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getOrCreateDefaultDepartment } from "@/lib/departmentEngine";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get("academicYear") || "";
    const semester = searchParams.get("semester");

    const dept = await getOrCreateDefaultDepartment();

    const where: any = {
      departmentId: dept.id,
      isActive: true,
    };

    if (academicYear && academicYear !== "ALL") {
      where.academicYearCode = academicYear;
    }

    if (semester) {
      where.semester = parseInt(semester, 10);
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: [{ semester: "asc" }, { code: "asc" }],
    });

    logApiPerf("GET /api/academics/syllabus", startTime);
    return apiSuccess({ courses });
  } catch (error: any) {
    return apiError(error.message || "Failed to load syllabus", 500);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const { code, title, semester, academicYearCode, credits, subjectType } = await req.json();

    if (!code || !title || !semester) {
      return apiError("Subject Code, Subject Name, and Semester are required.", 400);
    }

    const dept = await getOrCreateDefaultDepartment();

    const existing = await prisma.course.findUnique({ where: { code } });
    if (existing) {
      return apiError(`Subject with code ${code} already exists.`, 400);
    }

    const course = await prisma.course.create({
      data: {
        code,
        title,
        semester: parseInt(semester, 10),
        academicYearCode: academicYearCode || "2025-2026",
        credits: parseInt(credits, 10) || 3,
        subjectType: subjectType || "CORE",
        departmentId: dept.id,
      },
    });

    logApiPerf("POST /api/academics/syllabus", startTime);
    return apiSuccess({ course }, "Subject & Syllabus record added successfully.", 201);
  } catch (error: any) {
    return apiError(error.message || "Failed to add subject record", 500);
  }
}

export async function DELETE(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return apiError("Course ID required", 400);

    await prisma.course.update({
      where: { id },
      data: { isActive: false },
    });

    logApiPerf("DELETE /api/academics/syllabus", startTime);
    return apiSuccess({ id }, "Syllabus record removed successfully.");
  } catch (error: any) {
    return apiError(error.message || "Failed to delete syllabus record", 500);
  }
}

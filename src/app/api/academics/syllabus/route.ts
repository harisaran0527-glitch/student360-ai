import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getOrCreateDefaultDepartment } from "@/lib/departmentEngine";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/academics/syllabus
 * Returns active syllabus/courses filtered by academicYear and semester.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get("academicYear") || "";
    const semester = searchParams.get("semester");
    const courseId = searchParams.get("courseId");

    // Single course active syllabus query
    if (courseId) {
      const version = await prisma.syllabusVersion.findFirst({
        where: { courseId, status: "ACTIVE" },
        include: { course: true },
        orderBy: { createdAt: "desc" },
      });
      logApiPerf("GET /api/academics/syllabus (single)", startTime);
      return apiSuccess(version);
    }

    const dept = await getOrCreateDefaultDepartment();

    const where: any = {
      departmentId: dept.id,
      isArchived: false,
    };

    if (academicYear && academicYear !== "ALL") {
      where.academicYearCode = academicYear;
    }

    if (semester) {
      where.semester = parseInt(semester, 10);
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        faculty: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: [{ semester: "asc" }, { code: "asc" }],
    });

    logApiPerf("GET /api/academics/syllabus", startTime);
    return apiSuccess({ courses });
  } catch (error: any) {
    console.error("[GET /api/academics/syllabus Error]", error);
    return apiError(error.message || "Failed to load syllabus", 500);
  }
}

/**
 * POST /api/academics/syllabus
 * Adds a new subject & syllabus record.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const { code, title, semester, academicYearCode, credits, subjectType, facultyId, description } = await req.json();

    if (!code || !title || !semester) {
      return apiError("Subject Code, Subject Name, and Semester are required.", 400);
    }

    const dept = await getOrCreateDefaultDepartment();

    const existing = await prisma.course.findFirst({
      where: {
        code: { equals: code.trim(), mode: "insensitive" },
        academicYearCode: academicYearCode || DEFAULT_ACADEMIC_YEAR,
        isArchived: false,
      },
    });

    if (existing) {
      return apiError(`Subject with code "${code.trim()}" already exists.`, 400);
    }

    const course = await prisma.course.create({
      data: {
        code: code.trim().toUpperCase(),
        title: title.trim(),
        semester: parseInt(semester, 10),
        academicYearCode: academicYearCode || DEFAULT_ACADEMIC_YEAR,
        credits: parseInt(credits, 10) || 3,
        subjectType: subjectType || "CORE",
        departmentId: dept.id,
        facultyId: facultyId || null,
        description: description || null,
        isActive: true,
        isArchived: false,
      },
      include: {
        faculty: { select: { id: true, fullName: true, email: true } },
      },
    });

    logApiPerf("POST /api/academics/syllabus", startTime);
    return apiSuccess({ course }, "Subject & Syllabus record added successfully.", 201);
  } catch (error: any) {
    console.error("[POST /api/academics/syllabus Error]", error);
    return apiError(error.message || "Failed to add subject record", 500);
  }
}

/**
 * PUT /api/academics/syllabus
 * Edits an individual subject's details (Code, Name, Type, Credits, Semester, Faculty, Description)
 * while preserving internal Course ID and rejecting duplicate subject codes.
 */
export async function PUT(req: NextRequest) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const { id, code, title, semester, academicYearCode, credits, subjectType, facultyId, description, syllabusUrl, isActive } = await req.json();

    if (!id) {
      return apiError("Subject ID is required for editing", 400);
    }

    const existing = await prisma.course.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiError("Target subject record not found", 404);
    }

    // Check duplicate code if code is changed
    if (code && code.trim().toUpperCase() !== existing.code.toUpperCase()) {
      const duplicate = await prisma.course.findFirst({
        where: {
          code: { equals: code.trim(), mode: "insensitive" },
          academicYearCode: academicYearCode || existing.academicYearCode,
          id: { not: id },
          isArchived: false,
        },
      });

      if (duplicate) {
        return apiError(`Another active subject with code "${code.trim()}" already exists`, 400);
      }
    }

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: {
        code: code ? code.trim().toUpperCase() : existing.code,
        title: title ? title.trim() : existing.title,
        semester: semester ? parseInt(semester, 10) : existing.semester,
        academicYearCode: academicYearCode || existing.academicYearCode,
        credits: credits !== undefined ? parseInt(credits, 10) : existing.credits,
        subjectType: subjectType || existing.subjectType,
        facultyId: facultyId !== undefined ? facultyId : existing.facultyId,
        description: description !== undefined ? description : existing.description,
        syllabusUrl: syllabusUrl !== undefined ? syllabusUrl : existing.syllabusUrl,
        isActive: typeof isActive === "boolean" ? isActive : existing.isActive,
      },
      include: {
        faculty: { select: { id: true, fullName: true, email: true } },
      },
    });

    logApiPerf("PUT /api/academics/syllabus", startTime);
    return apiSuccess({ course: updatedCourse }, "Subject details updated successfully.");
  } catch (error: any) {
    console.error("[PUT /api/academics/syllabus Error]", error);
    return apiError(error.message || "Failed to update subject record", 500);
  }
}

/**
 * DELETE /api/academics/syllabus
 * Soft-archives/deactivates a subject record.
 */
export async function DELETE(req: NextRequest) {
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
    console.error("[DELETE /api/academics/syllabus Error]", error);
    return apiError(error.message || "Failed to delete syllabus record", 500);
  }
}

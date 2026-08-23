import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getOrCreateDefaultDepartment } from "@/lib/departmentEngine";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

/**
 * Helper to resolve a faculty name or ID to a User record ID.
 * Matches existing FACULTY users case-insensitively, or auto-creates a FACULTY record if new.
 */
async function resolveFacultyId(facultyNameOrId: string | null | undefined): Promise<string | null> {
  if (!facultyNameOrId || !facultyNameOrId.trim()) return null;
  const trimmed = facultyNameOrId.trim();

  // Check if existing user matches ID or fullName case-insensitively
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { id: trimmed },
        { fullName: { equals: trimmed, mode: "insensitive" } },
      ],
    },
  });

  if (existing) {
    return existing.id;
  }

  // Create a new FACULTY user record for new staff name
  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
  const email = `faculty_${slug}_${Date.now()}@student360.ai`;
  const newUser = await prisma.user.create({
    data: {
      fullName: trimmed,
      email,
      passwordHash: "N/A",
      role: "FACULTY",
      isActive: true,
    },
  });
  return newUser.id;
}

/**
 * GET /api/academics/syllabus
 * Returns active syllabus/courses filtered by academicYear and semester,
 * plus a deduplicated list of saved faculty names from real DB assignments.
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

    // Collect deduplicated list of saved faculty names from existing DB courses (NO fake/demo data)
    const allCoursesWithFaculty = await prisma.course.findMany({
      where: { isArchived: false, facultyId: { not: null } },
      include: { faculty: { select: { fullName: true } } },
    });

    const savedFacultiesSet = new Set<string>();
    allCoursesWithFaculty.forEach((c) => {
      if (c.faculty?.fullName) {
        const trimmedName = c.faculty.fullName.trim();
        if (trimmedName) {
          const alreadyExists = Array.from(savedFacultiesSet).some(
            (f) => f.toLowerCase() === trimmedName.toLowerCase()
          );
          if (!alreadyExists) {
            savedFacultiesSet.add(trimmedName);
          }
        }
      }
    });

    const savedFaculties = Array.from(savedFacultiesSet);

    logApiPerf("GET /api/academics/syllabus", startTime);
    return apiSuccess({ courses, savedFaculties });
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

    const { code, title, semester, academicYearCode, credits, subjectType, facultyId, facultyName, description, syllabusUrl } = await req.json();

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

    const targetFacultyId = await resolveFacultyId(facultyName || facultyId);

    const course = await prisma.course.create({
      data: {
        code: code.trim().toUpperCase(),
        title: title.trim(),
        semester: parseInt(semester, 10),
        academicYearCode: academicYearCode || DEFAULT_ACADEMIC_YEAR,
        credits: parseInt(credits, 10) || 3,
        subjectType: subjectType || "CORE",
        departmentId: dept.id,
        facultyId: targetFacultyId,
        description: description || null,
        syllabusUrl: syllabusUrl || null,
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
 * Edits an individual subject's details (Code, Name, Type, Credits, Semester, Faculty, Syllabus URL)
 * while preserving internal Course ID and rejecting duplicate subject codes.
 */
export async function PUT(req: NextRequest) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const { id, code, title, semester, academicYearCode, credits, subjectType, facultyId, facultyName, description, syllabusUrl, isActive } = await req.json();

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

    // Resolve faculty ID from input name/ID (supports manual typing + suggestions)
    let targetFacultyId = existing.facultyId;
    if (facultyName !== undefined || facultyId !== undefined) {
      targetFacultyId = await resolveFacultyId(facultyName !== undefined ? facultyName : facultyId);
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
        facultyId: targetFacultyId,
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

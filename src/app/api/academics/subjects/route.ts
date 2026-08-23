import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/academics/subjects
 * Retrieves subjects filtered by academic year, semester, department, regulation, and archived status.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get("academicYear") || "2025-2029";
    const semester = searchParams.get("semester");
    const dept = searchParams.get("department") || "AI & ML";
    const includeArchived = searchParams.get("includeArchived") === "true";

    let departmentRecord = await prisma.department.findFirst({
      where: { code: { equals: dept, mode: "insensitive" } },
    });
    if (!departmentRecord) {
      departmentRecord = await prisma.department.findFirst();
    }

    const whereClause: any = {
      ...(departmentRecord ? { departmentId: departmentRecord.id } : {}),
      ...(academicYear ? { academicYearCode: academicYear } : {}),
      ...(semester ? { semester: Number(semester) } : {}),
      ...(!includeArchived ? { isArchived: false } : {}),
    };

    const subjects = await prisma.course.findMany({
      where: whereClause,
      include: {
        faculty: {
          select: { id: true, fullName: true, email: true },
        },
        syllabusVersions: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ semester: "asc" }, { code: "asc" }],
    });

    logApiPerf("GET /api/academics/subjects", startTime);
    return apiSuccess(subjects);
  } catch (err: any) {
    console.error("[GET /api/academics/subjects Error]", err);
    return apiError(err.message || "Failed to fetch subjects", 500);
  }
}

/**
 * POST /api/academics/subjects
 * Adds a new subject to a semester. Checks for code uniqueness.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const {
      code,
      title,
      semester,
      academicYearCode = "2025-2029",
      credits = 4,
      subjectType = "CORE",
      facultyId,
      department = "AI & ML",
      description,
    } = body;

    if (!code || !title || !semester) {
      return apiError("Subject code, title, and semester are required", 400);
    }

    let departmentRecord = await prisma.department.findFirst({
      where: { code: { equals: department, mode: "insensitive" } },
    });
    if (!departmentRecord) {
      departmentRecord = await prisma.department.findFirst();
    }
    if (!departmentRecord) {
      return apiError("Department record not found", 404);
    }

    // Check duplicate code
    const existing = await prisma.course.findFirst({
      where: {
        code: { equals: code.trim(), mode: "insensitive" },
        academicYearCode,
        isArchived: false,
      },
    });

    if (existing) {
      return apiError(`Subject with code "${code.trim()}" already exists in ${academicYearCode}`, 400);
    }

    const newSubject = await prisma.course.create({
      data: {
        code: code.trim().toUpperCase(),
        title: title.trim(),
        semester: Number(semester),
        academicYearCode,
        credits: Number(credits),
        subjectType,
        departmentId: departmentRecord.id,
        facultyId: facultyId || null,
        description: description || null,
        isActive: true,
        isArchived: false,
      },
      include: {
        faculty: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Record AuditLog
    await prisma.auditLog.create({
      data: {
        userId: "admin-system",
        userEmail: "admin@student360.ai",
        userRole: "ADMIN",
        action: "SUBJECT_ADDED",
        entityType: "Course",
        entityId: newSubject.id,
        details: JSON.stringify({
          code: newSubject.code,
          title: newSubject.title,
          semester: newSubject.semester,
          academicYearCode,
        }),
      },
    });

    logApiPerf("POST /api/academics/subjects", startTime);
    return apiSuccess(newSubject, "Subject added successfully", 201);
  } catch (err: any) {
    console.error("[POST /api/academics/subjects Error]", err);
    return apiError(err.message || "Failed to add subject", 500);
  }
}

/**
 * PUT /api/academics/subjects
 * Updates an individual subject's details or toggles archive/restore.
 * Ensures Subject Code safety (checks duplicates while preserving internal Course ID).
 */
export async function PUT(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const {
      id,
      code,
      title,
      semester,
      academicYearCode,
      credits,
      subjectType,
      facultyId,
      description,
      isActive,
      isArchived,
      archivedReason,
    } = body;

    if (!id) {
      return apiError("Subject ID is required", 400);
    }

    const existing = await prisma.course.findUnique({
      where: { id },
      include: { faculty: true },
    });

    if (!existing) {
      return apiError("Subject not found", 404);
    }

    // Handle Archive / Restore toggle explicitly
    if (typeof isArchived === "boolean" && isArchived !== existing.isArchived) {
      const updated = await prisma.course.update({
        where: { id },
        data: {
          isArchived,
          archivedAt: isArchived ? new Date() : null,
          archivedReason: isArchived ? (archivedReason || "Archived by Admin") : null,
          archivedBy: isArchived ? "Admin User" : null,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: "admin-system",
          userEmail: "admin@student360.ai",
          userRole: "ADMIN",
          action: isArchived ? "SUBJECT_ARCHIVED" : "SUBJECT_RESTORED",
          entityType: "Course",
          entityId: id,
          details: JSON.stringify({
            code: existing.code,
            title: existing.title,
            reason: archivedReason || "Admin action",
          }),
        },
      });

      return apiSuccess(updated, `Subject ${isArchived ? "archived" : "restored"} successfully`);
    }

    // Individual Subject Editing
    if (code && code.trim().toUpperCase() !== existing.code.toUpperCase()) {
      // Check duplicate code
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

    const oldValues = {
      code: existing.code,
      title: existing.title,
      semester: existing.semester,
      credits: existing.credits,
      subjectType: existing.subjectType,
      facultyId: existing.facultyId,
      description: existing.description,
      isActive: existing.isActive,
    };

    const updatedSubject = await prisma.course.update({
      where: { id },
      data: {
        code: code ? code.trim().toUpperCase() : existing.code,
        title: title ? title.trim() : existing.title,
        semester: semester ? Number(semester) : existing.semester,
        academicYearCode: academicYearCode || existing.academicYearCode,
        credits: credits !== undefined ? Number(credits) : existing.credits,
        subjectType: subjectType || existing.subjectType,
        facultyId: facultyId !== undefined ? facultyId : existing.facultyId,
        description: description !== undefined ? description : existing.description,
        isActive: typeof isActive === "boolean" ? isActive : existing.isActive,
      },
      include: {
        faculty: { select: { id: true, fullName: true, email: true } },
      },
    });

    const newValues = {
      code: updatedSubject.code,
      title: updatedSubject.title,
      semester: updatedSubject.semester,
      credits: updatedSubject.credits,
      subjectType: updatedSubject.subjectType,
      facultyId: updatedSubject.facultyId,
      description: updatedSubject.description,
      isActive: updatedSubject.isActive,
    };

    // Record AuditLog with Old -> New diff
    await prisma.auditLog.create({
      data: {
        userId: "admin-system",
        userEmail: "admin@student360.ai",
        userRole: "ADMIN",
        action: "SUBJECT_EDITED",
        entityType: "Course",
        entityId: id,
        details: JSON.stringify({
          subjectId: id,
          oldValues,
          newValues,
        }),
      },
    });

    logApiPerf("PUT /api/academics/subjects", startTime);
    return apiSuccess(updatedSubject, "Subject updated successfully");
  } catch (err: any) {
    console.error("[PUT /api/academics/subjects Error]", err);
    return apiError(err.message || "Failed to update subject", 500);
  }
}

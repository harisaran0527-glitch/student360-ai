import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/academics/semesters
 * Returns semester configurations (Semesters 1 - 8) with subject counts, active versions, and status.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get("academicYear") || "2025-2029";
    const dept = searchParams.get("department") || "AI & ML";

    let departmentRecord = await prisma.department.findFirst({
      where: { code: { equals: dept, mode: "insensitive" } },
    });
    if (!departmentRecord) {
      departmentRecord = await prisma.department.findFirst();
    }

    const batchRecord = await prisma.batch.findFirst({
      where: {
        ...(departmentRecord ? { departmentId: departmentRecord.id } : {}),
      },
    });

    const configs = batchRecord
      ? await prisma.semesterConfig.findMany({
          where: {
            batchId: batchRecord.id,
            academicYearCode: academicYear,
          },
          orderBy: { semesterNumber: "asc" },
        })
      : [];

    const courses = await prisma.course.findMany({
      where: {
        academicYearCode: academicYear,
        ...(departmentRecord ? { departmentId: departmentRecord.id } : {}),
        isArchived: false,
      },
      include: {
        syllabusVersions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const semesterMap: Record<number, any> = {};
    for (let sem = 1; sem <= 8; sem++) {
      const cfg = configs.find((c) => c.semesterNumber === sem);
      const semCourses = courses.filter((c) => c.semester === sem);
      const activeVersion = semCourses[0]?.syllabusVersions?.[0]?.versionNumber || "v1.0";
      const effectiveFrom = semCourses[0]?.syllabusVersions?.[0]?.effectiveFrom || "2025-08-01";

      semesterMap[sem] = {
        semesterNumber: sem,
        semesterName: cfg?.semesterName || `Semester ${sem}`,
        academicYearCode: academicYear,
        startDate: cfg?.startDate || "",
        endDate: cfg?.endDate || "",
        status: cfg?.status || (sem <= 4 ? "ACTIVE" : "UPCOMING"),
        notes: cfg?.notes || "",
        subjectsCount: semCourses.length,
        activeSyllabusVersion: activeVersion,
        effectiveFrom,
        configId: cfg?.id || null,
      };
    }

    logApiPerf("GET /api/academics/semesters", startTime);
    return apiSuccess(Object.values(semesterMap));
  } catch (err: any) {
    console.error("[GET /api/academics/semesters Error]", err);
    return apiError(err.message || "Failed to fetch semester configurations", 500);
  }
}

/**
 * PUT /api/academics/semesters
 * Edits semester configuration metadata with change summary and AuditLog recording.
 */
export async function PUT(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const {
      semesterNumber,
      semesterName,
      academicYearCode = "2025-2029",
      department = "AI & ML",
      startDate,
      endDate,
      status = "ACTIVE",
      notes,
    } = body;

    if (!semesterNumber || semesterNumber < 1 || semesterNumber > 8) {
      return apiError("Valid semester number (1-8) is required", 400);
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

    let batchRecord = await prisma.batch.findFirst({
      where: { departmentId: departmentRecord.id },
    });

    if (!batchRecord) {
      batchRecord = await prisma.batch.create({
        data: {
          name: `Batch ${academicYearCode} (${departmentRecord.code})`,
          departmentId: departmentRecord.id,
          admissionYear: 2025,
          expectedGraduationYear: 2029,
        },
      });
    }

    const existingConfig = await prisma.semesterConfig.findFirst({
      where: {
        semesterNumber: Number(semesterNumber),
        batchId: batchRecord.id,
        academicYearCode,
      },
    });

    const oldValues = existingConfig
      ? {
          semesterName: existingConfig.semesterName || `Semester ${semesterNumber}`,
          startDate: existingConfig.startDate || "",
          endDate: existingConfig.endDate || "",
          status: existingConfig.status || "ACTIVE",
          notes: existingConfig.notes || "",
        }
      : {
          semesterName: `Semester ${semesterNumber}`,
          startDate: "",
          endDate: "",
          status: "ACTIVE",
          notes: "",
        };

    const newValues = {
      semesterName: semesterName || `Semester ${semesterNumber}`,
      startDate: startDate || "",
      endDate: endDate || "",
      status,
      notes: notes || "",
    };

    let updated;
    if (existingConfig) {
      updated = await prisma.semesterConfig.update({
        where: { id: existingConfig.id },
        data: {
          semesterName: newValues.semesterName,
          startDate: newValues.startDate,
          endDate: newValues.endDate,
          status: newValues.status,
          notes: newValues.notes,
        },
      });
    } else {
      updated = await prisma.semesterConfig.create({
        data: {
          batchId: batchRecord.id,
          academicYearCode,
          semesterNumber: Number(semesterNumber),
          semesterName: newValues.semesterName,
          startDate: newValues.startDate,
          endDate: newValues.endDate,
          status: newValues.status,
          notes: newValues.notes,
        },
      });
    }

    // Record AuditLog
    await prisma.auditLog.create({
      data: {
        userId: "admin-system",
        userEmail: "admin@student360.ai",
        userRole: "ADMIN",
        action: "SEMESTER_EDITED",
        entityType: "SemesterConfig",
        entityId: updated.id,
        details: JSON.stringify({
          semesterNumber,
          oldValues,
          newValues,
        }),
      },
    });

    logApiPerf("PUT /api/academics/semesters", startTime);
    return apiSuccess(updated, "Semester configuration updated successfully");
  } catch (err: any) {
    console.error("[PUT /api/academics/semesters Error]", err);
    return apiError(err.message || "Failed to update semester configuration", 500);
  }
}

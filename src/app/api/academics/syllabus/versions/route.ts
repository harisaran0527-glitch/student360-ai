import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/academics/syllabus/versions
 * Retrieves version history for a course or a single version with comparison data.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const versionId = searchParams.get("versionId");
    const compareVersionId = searchParams.get("compareVersionId");

    if (versionId) {
      const version = await prisma.syllabusVersion.findUnique({
        where: { id: versionId },
        include: { course: true },
      });

      if (!version) return apiError("Syllabus version not found", 404);

      let compareVersion = null;
      if (compareVersionId) {
        compareVersion = await prisma.syllabusVersion.findUnique({
          where: { id: compareVersionId },
        });
      }

      logApiPerf("GET /api/academics/syllabus/versions (single)", startTime);
      return apiSuccess({ version, compareVersion });
    }

    if (!courseId) {
      return apiError("Course ID or Version ID is required", 400);
    }

    const versions = await prisma.syllabusVersion.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
    });

    logApiPerf("GET /api/academics/syllabus/versions (list)", startTime);
    return apiSuccess(versions);
  } catch (err: any) {
    console.error("[GET /api/academics/syllabus/versions Error]", err);
    return apiError(err.message || "Failed to fetch syllabus versions", 500);
  }
}

/**
 * POST /api/academics/syllabus/versions
 * Creates a NEW immutable syllabus version (e.g., v1.0 -> v2.0).
 * Does NOT overwrite existing versions. Auto-archives previous version.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const {
      courseId,
      syllabusTitle,
      regulation = "Regulation 2026",
      academicYearCode = "2025-2029",
      semester,
      effectiveFrom,
      changeSummary,
      units,
      courseObjectives,
      courseOutcomes,
      textBooks,
      referenceBooks,
      practicalDetails,
      assessmentInfo,
      additionalNotes,
    } = body;

    if (!courseId || !syllabusTitle || !units || !Array.isArray(units)) {
      return apiError("Course ID, Syllabus Title, and Units array are required", 400);
    }

    if (!changeSummary || !changeSummary.trim()) {
      return apiError("A change summary is mandatory when creating or revising a syllabus version", 400);
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        syllabusVersions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!course) {
      return apiError("Target course not found", 404);
    }

    // Auto-calculate next version number
    const existingVersions = course.syllabusVersions;
    let nextVerNum = "1.0";
    let previousVersionId = null;

    if (existingVersions.length > 0) {
      const latestVer = existingVersions[0];
      previousVersionId = latestVer.id;
      const parts = latestVer.versionNumber.split(".");
      const major = parseInt(parts[0] || "1", 10);
      nextVerNum = `${major + 1}.0`;

      // Archive previous active versions
      await prisma.syllabusVersion.updateMany({
        where: { courseId, status: "ACTIVE" },
        data: { status: "ARCHIVED" },
      });
    }

    const newVersion = await prisma.syllabusVersion.create({
      data: {
        courseId,
        versionNumber: nextVerNum,
        syllabusTitle: syllabusTitle.trim(),
        regulation: regulation.trim(),
        academicYearCode,
        semester: semester ? Number(semester) : course.semester,
        effectiveFrom: effectiveFrom || new Date().toISOString().split("T")[0],
        status: "ACTIVE",
        changeSummary: changeSummary.trim(),
        previousVersionId,
        createdBy: "Admin User",
        units,
        courseObjectives: courseObjectives || [],
        courseOutcomes: courseOutcomes || [],
        textBooks: textBooks || [],
        referenceBooks: referenceBooks || [],
        practicalDetails: practicalDetails || null,
        assessmentInfo: assessmentInfo || null,
        additionalNotes: additionalNotes || null,
      },
    });

    // Update active version on Course
    await prisma.course.update({
      where: { id: courseId },
      data: { activeSyllabusVersionId: newVersion.id },
    });

    // Record AuditLog
    await prisma.auditLog.create({
      data: {
        userId: "admin-system",
        userEmail: "admin@student360.ai",
        userRole: "ADMIN",
        action: existingVersions.length > 0 ? "SYLLABUS_REVISED" : "SYLLABUS_CREATED",
        entityType: "SyllabusVersion",
        entityId: newVersion.id,
        details: JSON.stringify({
          courseId,
          courseCode: course.code,
          versionNumber: nextVerNum,
          changeSummary,
        }),
      },
    });

    logApiPerf("POST /api/academics/syllabus/versions", startTime);
    return apiSuccess(newVersion, `Syllabus version v${nextVerNum} created successfully`, 201);
  } catch (err: any) {
    console.error("[POST /api/academics/syllabus/versions Error]", err);
    return apiError(err.message || "Failed to create syllabus version", 500);
  }
}

/**
 * PATCH /api/academics/syllabus/versions
 * Activates a historical version or restores a past version as a new revision without mutating past records.
 */
export async function PATCH(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { versionId, action, changeSummary } = body;

    if (!versionId || !action) {
      return apiError("Version ID and action ('ACTIVATE' | 'RESTORE_AS_NEW') are required", 400);
    }

    const targetVersion = await prisma.syllabusVersion.findUnique({
      where: { id: versionId },
      include: { course: true },
    });

    if (!targetVersion) {
      return apiError("Target syllabus version not found", 404);
    }

    if (action === "RESTORE_AS_NEW") {
      if (!changeSummary || !changeSummary.trim()) {
        return apiError("Change summary is required when restoring a historical version as a new revision", 400);
      }

      const existingVersions = await prisma.syllabusVersion.findMany({
        where: { courseId: targetVersion.courseId },
        orderBy: { createdAt: "desc" },
      });

      const parts = existingVersions[0]?.versionNumber.split(".") || ["1", "0"];
      const major = parseInt(parts[0], 10) + 1;
      const newVerNum = `${major}.0`;

      await prisma.syllabusVersion.updateMany({
        where: { courseId: targetVersion.courseId, status: "ACTIVE" },
        data: { status: "ARCHIVED" },
      });

      const restoredVersion = await prisma.syllabusVersion.create({
        data: {
          courseId: targetVersion.courseId,
          versionNumber: newVerNum,
          syllabusTitle: targetVersion.syllabusTitle,
          regulation: targetVersion.regulation,
          academicYearCode: targetVersion.academicYearCode,
          semester: targetVersion.semester,
          effectiveFrom: new Date().toISOString().split("T")[0],
          status: "ACTIVE",
          changeSummary: `[Restored from v${targetVersion.versionNumber}] ${changeSummary.trim()}`,
          previousVersionId: targetVersion.id,
          createdBy: "Admin User",
          units: targetVersion.units as any,
          courseObjectives: targetVersion.courseObjectives as any,
          courseOutcomes: targetVersion.courseOutcomes as any,
          textBooks: targetVersion.textBooks as any,
          referenceBooks: targetVersion.referenceBooks as any,
          practicalDetails: targetVersion.practicalDetails,
          assessmentInfo: targetVersion.assessmentInfo,
          additionalNotes: targetVersion.additionalNotes,
        },
      });

      await prisma.course.update({
        where: { id: targetVersion.courseId },
        data: { activeSyllabusVersionId: restoredVersion.id },
      });

      await prisma.auditLog.create({
        data: {
          userId: "admin-system",
          userEmail: "admin@student360.ai",
          userRole: "ADMIN",
          action: "HISTORICAL_SYLLABUS_RESTORED",
          entityType: "SyllabusVersion",
          entityId: restoredVersion.id,
          details: JSON.stringify({
            courseCode: targetVersion.course.code,
            restoredFromVersion: targetVersion.versionNumber,
            newVersion: newVerNum,
            changeSummary,
          }),
        },
      });

      return apiSuccess(restoredVersion, `Restored v${targetVersion.versionNumber} as new version v${newVerNum}`);
    }

    if (action === "ACTIVATE") {
      await prisma.syllabusVersion.updateMany({
        where: { courseId: targetVersion.courseId, status: "ACTIVE" },
        data: { status: "ARCHIVED" },
      });

      const activated = await prisma.syllabusVersion.update({
        where: { id: versionId },
        data: { status: "ACTIVE" },
      });

      await prisma.course.update({
        where: { id: targetVersion.courseId },
        data: { activeSyllabusVersionId: versionId },
      });

      await prisma.auditLog.create({
        data: {
          userId: "admin-system",
          userEmail: "admin@student360.ai",
          userRole: "ADMIN",
          action: "SYLLABUS_VERSION_ACTIVATED",
          entityType: "SyllabusVersion",
          entityId: versionId,
          details: JSON.stringify({
            courseCode: targetVersion.course.code,
            activatedVersion: targetVersion.versionNumber,
          }),
        },
      });

      return apiSuccess(activated, `Version v${targetVersion.versionNumber} activated`);
    }

    return apiError("Invalid action requested", 400);
  } catch (err: any) {
    console.error("[PATCH /api/academics/syllabus/versions Error]", err);
    return apiError(err.message || "Failed to update version status", 500);
  }
}

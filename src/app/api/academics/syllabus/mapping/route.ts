import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/academics/syllabus/mapping
 * Returns batch-to-syllabus version mappings.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get("batchId");
    const courseId = searchParams.get("courseId");
    const semester = searchParams.get("semester");

    const mappings = await prisma.batchSemesterSyllabus.findMany({
      where: {
        ...(batchId ? { batchId } : {}),
        ...(courseId ? { courseId } : {}),
        ...(semester ? { semesterNumber: Number(semester) } : {}),
      },
      include: {
        batch: { select: { id: true, name: true, admissionYear: true, expectedGraduationYear: true } },
        course: { select: { id: true, code: true, title: true } },
        syllabusVersion: true,
      },
    });

    logApiPerf("GET /api/academics/syllabus/mapping", startTime);
    return apiSuccess(mappings);
  } catch (err: any) {
    console.error("[GET /api/academics/syllabus/mapping Error]", err);
    return apiError(err.message || "Failed to fetch batch syllabus mappings", 500);
  }
}

/**
 * POST /api/academics/syllabus/mapping
 * Pins a batch to a specific syllabus version for a given semester & course.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { batchId, semesterNumber, courseId, syllabusVersionId } = body;

    if (!batchId || !semesterNumber || !courseId || !syllabusVersionId) {
      return apiError("batchId, semesterNumber, courseId, and syllabusVersionId are required", 400);
    }

    const mapping = await prisma.batchSemesterSyllabus.upsert({
      where: {
        batchId_semesterNumber_courseId: {
          batchId,
          semesterNumber: Number(semesterNumber),
          courseId,
        },
      },
      update: {
        syllabusVersionId,
      },
      create: {
        batchId,
        semesterNumber: Number(semesterNumber),
        courseId,
        syllabusVersionId,
      },
      include: {
        batch: { select: { name: true } },
        course: { select: { code: true, title: true } },
        syllabusVersion: { select: { versionNumber: true } },
      },
    });

    logApiPerf("POST /api/academics/syllabus/mapping", startTime);
    return apiSuccess(mapping, "Batch pinned to syllabus version successfully");
  } catch (err: any) {
    console.error("[POST /api/academics/syllabus/mapping Error]", err);
    return apiError(err.message || "Failed to save batch syllabus mapping", 500);
  }
}

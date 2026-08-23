import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

/**
 * GET /api/academics/syllabus
 * Returns active syllabus details for a course.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return apiError("Course ID is required", 400);
    }

    const version = await prisma.syllabusVersion.findFirst({
      where: { courseId, status: "ACTIVE" },
      include: { course: true },
      orderBy: { createdAt: "desc" },
    });

    logApiPerf("GET /api/academics/syllabus", startTime);
    return apiSuccess(version);
  } catch (err: any) {
    console.error("[GET /api/academics/syllabus Error]", err);
    return apiError(err.message || "Failed to fetch active syllabus", 500);
  }
}

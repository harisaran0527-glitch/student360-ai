import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiError, logApiPerf } from "@/lib/apiResponse";
import { getCachedStudentOptions, setCachedStudentOptions } from "@/lib/serverCache";

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const academicYearParam = searchParams.get("academicYear") || "";
    const batchId = searchParams.get("batchId") || "";

    const cacheKey = `student-options:${academicYearParam}:${batchId}`;
    const cached = getCachedStudentOptions(cacheKey);
    if (cached) {
      logApiPerf("GET /api/students/options (cached)", startTime);
      return new NextResponse(
        JSON.stringify(cached),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=10, s-maxage=30, stale-while-revalidate=30",
          },
        }
      );
    }

    const where: any = {
      isArchived: false,
    };

    if (batchId) {
      where.batchId = batchId;
    }

    if (academicYearParam && academicYearParam !== "ALL") {
      const normalizedAY = academicYearParam.replace("–", "-").trim();
      const altAY = normalizedAY.replace("-", "–");

      // Match student academicYear or batch relation
      if (!batchId) {
        where.OR = [
          { academicYear: normalizedAY },
          { academicYear: altAY },
          { batch: { name: { startsWith: normalizedAY.split("-")[0] } } },
        ];
      }
    }

    const students = await prisma.studentProfile.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        registerNo: true,
        rollNo: true,
        batchId: true,
        academicYear: true,
        attendancePercentage: true,
      },
      orderBy: { registerNo: "asc" },
    });

    logApiPerf("GET /api/students/options", startTime);

    const payload = {
      success: true,
      data: students,
      students,
    };

    setCachedStudentOptions(cacheKey, payload);

    return new NextResponse(
      JSON.stringify(payload),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=10, s-maxage=30, stale-while-revalidate=30",
        },
      }
    );
  } catch (error: any) {
    return apiError(error.message || "Failed to load student options", 500);
  }
}


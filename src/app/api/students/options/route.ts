import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiError, logApiPerf } from "@/lib/apiResponse";

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const academicYearParam = searchParams.get("academicYear") || "";
    const batchId = searchParams.get("batchId") || "";

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

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: students,
        students,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    return apiError(error.message || "Failed to load student options", 500);
  }
}

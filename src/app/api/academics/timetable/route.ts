import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");

    if (!academicYear || !semester) {
      return apiError("academicYear and semester are required parameters.", 400);
    }

    const timetable = await prisma.timetable.findFirst({
      where: {
        academicYearCode: academicYear,
        semester: parseInt(semester, 10),
      },
    });

    logApiPerf("GET /api/academics/timetable", startTime);
    return apiSuccess({ timetable });
  } catch (error: any) {
    return apiError(error.message || "Failed to load timetable", 500);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const { academicYearCode, semester, documentUrl, fileName } = await req.json();

    if (!academicYearCode || !semester || !documentUrl) {
      return apiError("academicYearCode, semester, and documentUrl are required.", 400);
    }

    const semInt = parseInt(semester, 10);

    const timetable = await prisma.timetable.upsert({
      where: {
        academicYearCode_semester: {
          academicYearCode,
          semester: semInt,
        },
      },
      update: {
        documentUrl,
        fileName: fileName || null,
      },
      create: {
        academicYearCode,
        semester: semInt,
        documentUrl,
        fileName: fileName || null,
      },
    });

    logApiPerf("POST /api/academics/timetable", startTime);
    return apiSuccess({ timetable }, "Timetable uploaded successfully.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to save timetable", 500);
  }
}

export async function DELETE(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return apiError("Timetable ID required", 400);

    await prisma.timetable.delete({
      where: { id },
    });

    logApiPerf("DELETE /api/academics/timetable", startTime);
    return apiSuccess(null, "Timetable record deleted successfully.", 200);
  } catch (error: any) {
    return apiError(error.message || "Failed to delete timetable record", 500);
  }
}

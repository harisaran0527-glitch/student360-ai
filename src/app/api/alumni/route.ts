import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAcademicYearFromRequest } from "@/lib/academicYearEngine";
import { getOrCreateDefaultDepartment } from "@/lib/departmentEngine";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const batchId = searchParams.get("batchId") || "";
    const graduationYear = searchParams.get("graduationYear") || "";
    const academicYear = getAcademicYearFromRequest(req);

    const dept = await getOrCreateDefaultDepartment();

    const where: any = {
      departmentId: dept.id,
      academicStatus: { in: ["GRADUATED", "ALUMNI"] },
      isArchived: false,
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { registerNo: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (batchId) where.batchId = batchId;
    if (academicYear) {
      where.OR = [
        { academicYear },
        { graduationAcademicYear: academicYear },
      ];
    }
    if (graduationYear) {
      where.alumniRecord = { graduationYear: parseInt(graduationYear, 10) };
    }

    const alumni = await prisma.studentProfile.findMany({
      where,
      include: {
        department: true,
        batch: true,
        alumniRecord: true,
        placementRecords: true,
      },
      orderBy: { registerNo: "asc" },
    });

    logApiPerf("GET /api/alumni", startTime);
    return apiSuccess({ alumni, total: alumni.length });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch alumni directory", 500);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const { studentId, graduationYear, currentCompany, currentRole, higherStudiesInst, linkedinUrl } =
      await req.json();

    if (!studentId) {
      return apiError("studentId is required", 400);
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return apiError("Student not found", 404);
    }

    const gradYr = parseInt(graduationYear, 10) || new Date().getFullYear();

    // 1. Update StudentProfile status to ALUMNI
    await prisma.studentProfile.update({
      where: { id: studentId },
      data: {
        academicStatus: "ALUMNI",
        graduationAcademicYear: `${gradYr - 1}-${gradYr}`,
      },
    });

    // 2. Create or Update AlumniRecord
    const alumniRecord = await prisma.alumniRecord.upsert({
      where: { studentId },
      create: {
        studentId,
        graduationYear: gradYr,
        currentCompany: currentCompany || null,
        currentRole: currentRole || null,
        higherStudiesInst: higherStudiesInst || null,
        linkedinUrl: linkedinUrl || null,
      },
      update: {
        graduationYear: gradYr,
        currentCompany: currentCompany || null,
        currentRole: currentRole || null,
        higherStudiesInst: higherStudiesInst || null,
        linkedinUrl: linkedinUrl || null,
      },
    });

    logApiPerf("POST /api/alumni", startTime);
    return apiSuccess({ alumniRecord }, "Student successfully moved to Alumni directory.", 201);
  } catch (error: any) {
    return apiError(error.message || "Failed to convert student to alumni", 500);
  }
}

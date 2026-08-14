import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAcademicYearFromRequest } from "@/lib/academicYearEngine";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");
    const academicYear = getAcademicYearFromRequest(req);

    const where: any = {};
    if (session.role === "STUDENT") {
      where.studentId = session.studentProfileId;
    } else if (studentId) {
      where.studentId = studentId;
    }

    if (status) where.status = status;
    if (academicYear && session.role !== "STUDENT") {
      where.student = { academicYear };
    }

    const records = await prisma.placementRecord.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            registerNo: true,
            department: true,
            batch: true,
            cgpa: true,
          },
        },
        drive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    logApiPerf("GET /api/placement", startTime);
    return apiSuccess({ records });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch placement records", 500);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session) return apiError("Unauthorized", 401);

    if (session.role === "STUDENT") {
      return apiError("Forbidden: Student Portal is strict READ-ONLY. Only Admins can manage placement records.", 403);
    }

    const data = await req.json();
    const { studentId, placementDriveId, companyName, jobTitle, packageLpa, status, offerDate, offerLetterUrl } = data;

    if (!studentId || !companyName || !jobTitle) {
      return apiError("studentId, companyName, and jobTitle are required", 400);
    }

    const isAdmin = session.role === "SUPER_ADMIN" || session.role === "ADMIN";

    if (!isAdmin && (status === "SELECTED" || status === "OFFER_RECEIVED" || status === "JOINED")) {
      return apiError("Unauthorized. Status 'SELECTED', 'OFFER_RECEIVED', or 'JOINED' can only be updated by Admin.", 403);
    }

    const record = await prisma.placementRecord.create({
      data: {
        studentId,
        placementDriveId,
        companyName,
        jobTitle,
        packageLpa: packageLpa ? parseFloat(packageLpa) : 6.0,
        offerDate: offerDate || new Date().toISOString().split("T")[0],
        status: status || "SELECTED",
        offerLetterUrl,
        updatedBy: session.email,
      },
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "UPDATE_PLACEMENT_PIPELINE",
        entityType: "PlacementRecord",
        entityId: record.id,
        details: JSON.stringify({ companyName, jobTitle, status, updatedBy: session.email }),
      },
    });

    logApiPerf("POST /api/placement", startTime);
    return apiSuccess({ record }, "Placement offer recorded successfully.", 201);
  } catch (error: any) {
    return apiError(error.message || "Failed to record placement offer", 500);
  }
}

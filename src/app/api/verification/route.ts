import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";
import { getOrCreateDefaultDepartment } from "@/lib/departmentEngine";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get("academicYear") || DEFAULT_ACADEMIC_YEAR;
    const status = searchParams.get("status") || "PENDING";

    const dept = await getOrCreateDefaultDepartment();

    // 1. Certificates pending/reviewed
    const certificates = await prisma.certificate.findMany({
      where: {
        academicYearCode: academicYear,
        ...(status !== "ALL" ? { verificationStatus: status } : {}),
        student: { departmentId: dept.id },
      },
      include: {
        student: {
          select: { id: true, registerNo: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Internships pending/reviewed
    const internships = await prisma.internship.findMany({
      where: {
        academicYearCode: academicYear,
        ...(status !== "ALL" ? { status } : {}),
        student: { departmentId: dept.id },
      },
      include: {
        student: {
          select: { id: true, registerNo: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Projects pending/reviewed
    const projects = await prisma.project.findMany({
      where: {
        academicYearCode: academicYear,
        ...(status !== "ALL" ? { status } : {}),
        student: { departmentId: dept.id },
      },
      include: {
        student: {
          select: { id: true, registerNo: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    logApiPerf("GET /api/verification", startTime);
    return apiSuccess({
      certificates,
      internships,
      projects,
      counts: {
        certificates: certificates.length,
        internships: internships.length,
        projects: projects.length,
      },
    });
  } catch (error: any) {
    return apiError(error.message || "Failed to load verification queue", 500);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const { targetType, recordId, status, notes } = await req.json();

    if (!targetType || !recordId || !status) {
      return apiError("targetType (CERTIFICATE | INTERNSHIP | PROJECT), recordId, and status are required.", 400);
    }

    const now = new Date();

    if (targetType === "CERTIFICATE") {
      await prisma.certificate.update({
        where: { id: recordId },
        data: {
          verificationStatus: status,
          verifiedBy: session.email,
          verifiedAt: now,
          reviewerNotes: notes || null,
        },
      });
    } else if (targetType === "INTERNSHIP") {
      await prisma.internship.update({
        where: { id: recordId },
        data: {
          status,
          workSummary: notes || undefined,
        },
      });
    } else if (targetType === "PROJECT") {
      await prisma.project.update({
        where: { id: recordId },
        data: {
          status,
          verifiedBy: session.email,
          verifiedAt: now,
          reviewerNotes: notes || null,
        },
      });
    } else {
      return apiError("Invalid verification targetType.", 400);
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "ADMIN_VERIFICATION_DECISION",
        entityType: targetType,
        entityId: recordId,
        details: JSON.stringify({ status, notes, admin: session.email }),
      },
    });

    logApiPerf("POST /api/verification", startTime);
    return apiSuccess({ recordId, status }, "Verification status updated successfully.");
  } catch (error: any) {
    return apiError(error.message || "Failed to process verification decision", 500);
  }
}

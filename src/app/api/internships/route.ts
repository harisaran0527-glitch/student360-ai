import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAcademicYearFromRequest } from "@/lib/academicYearEngine";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";

import { notifyStudentInternshipStatus } from "@/lib/internshipNotifications";

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const semester = searchParams.get("semester");
    const status = searchParams.get("status");
    const academicYear = getAcademicYearFromRequest(req);

    const where: any = {};
    if (session.role === "STUDENT") {
      where.studentId = session.studentProfileId;
    } else if (studentId) {
      where.studentId = studentId;
    }

    if (semester) where.semester = parseInt(semester, 10);
    if (status) where.status = status;
    if (academicYear && session.role !== "STUDENT") {
      where.student = { academicYear };
    }

    const internships = await prisma.internship.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            registerNo: true,
            department: true,
            batch: true,
          },
        },
        certificates: true,
      },
      orderBy: { createdAt: "desc" },
    });

    logApiPerf("GET /api/internships", startTime);
    return apiSuccess({ internships });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch internships", 500);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);

    if (session.role === "STUDENT") {
      return apiError("Forbidden: Student Portal is strict READ-ONLY. Only Admins can manage internships.", 403);
    }

    const data = await req.json();
    const {
      studentId,
      academicYearCode,
      semester,
      companyName,
      companyWebsite,
      industry,
      domain,
      role,
      mode,
      location,
      startDate,
      endDate,
      durationWeeks,
      mentorName,
      mentorDesignation,
      mentorEmail,
      mentorContact,
      stipendType,
      stipendAmount,
      offerLetterUrl,
      joiningLetterUrl,
      finalReportUrl,
      certificateUrl,
      notes,
      status,
    } = data;

    if (!studentId || !companyName || !role || !startDate || !endDate) {
      return apiError("studentId, companyName, role, startDate, and endDate are required", 400);
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: studentId },
    });

    if (!studentProfile) {
      return apiError("Selected student profile not found.", 404);
    }

    const initialStatus = status || "APPROVED";

    const internship = await prisma.internship.create({
      data: {
        studentId,
        academicYearCode: academicYearCode || studentProfile.academicYear || DEFAULT_ACADEMIC_YEAR,
        batchId: studentProfile.batchId,
        departmentId: studentProfile.departmentId,
        semester: semester || studentProfile.currentSemester || 1,
        companyName,
        companyWebsite,
        industry: industry || "Software & IT",
        domain: domain || "Software Engineering",
        role,
        mode: mode || "ONLINE",
        location: location || "Remote / Campus",
        startDate,
        endDate,
        durationWeeks: durationWeeks || 8,
        mentorName,
        mentorDesignation,
        mentorEmail,
        mentorContact,
        stipendType: stipendType || "PAID",
        stipendAmount,
        offerLetterUrl,
        joiningLetterUrl,
        finalReportUrl,
        certificateUrl,
        workSummary: notes || undefined,
        status: initialStatus,
      },
    });

    // Notify Student automatically
    const notifRes = await notifyStudentInternshipStatus({
      internshipId: internship.id,
      studentId,
      companyName,
      role,
      newStatus: initialStatus,
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "SUBMIT_INTERNSHIP",
        entityType: "Internship",
        entityId: internship.id,
        details: JSON.stringify({ companyName, role, status: initialStatus, submittedBy: session.email }),
      },
    });

    logApiPerf("POST /api/internships", startTime);
    return apiSuccess({ internship, notification: notifRes }, notifRes.message, 201);
  } catch (error: any) {
    return apiError(error.message || "Failed to add internship record", 500);
  }
}

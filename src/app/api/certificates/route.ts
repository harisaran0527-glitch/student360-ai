import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAcademicYearFromRequest } from "@/lib/academicYearEngine";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const semester = searchParams.get("semester");
    const academicYear = getAcademicYearFromRequest(req);

    const where: any = {};
    if (session.role === "STUDENT") {
      where.studentId = session.studentProfileId;
    } else if (studentId) {
      where.studentId = studentId;
    }

    if (status) where.verificationStatus = status;
    if (category) where.category = category;
    if (semester) where.semester = parseInt(semester, 10);
    if (academicYear && session.role !== "STUDENT") {
      where.student = { academicYear };
    }

    const certificates = await prisma.certificate.findMany({
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
        project: true,
        internship: true,
      },
      orderBy: { createdAt: "desc" },
    });

    logApiPerf("GET /api/certificates", startTime);
    return apiSuccess({ certificates });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch certificates", 500);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);

    if (session.role === "STUDENT") {
      return apiError("Forbidden: Student Portal is strict READ-ONLY. Only Admins can manage certificates.", 403);
    }

    const data = await req.json();
    const {
      studentId,
      title,
      category,
      issuingBody,
      issueDate,
      startDate,
      endDate,
      academicYearCode,
      semester,
      mode,
      location,
      certificateNo,
      documentUrl,
      externalLink,
      skillsGained,
      projectId,
      internshipId,
      allowDuplicate,
    } = data;

    if (!studentId || !title || !issuingBody) {
      return apiError("studentId, title, and issuingBody are required", 400);
    }

    // Duplicate Detection Check
    if (!allowDuplicate) {
      const duplicate = await prisma.certificate.findFirst({
        where: {
          studentId,
          title: { equals: title },
          issuingBody: { equals: issuingBody },
          issueDate: issueDate || undefined,
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            isDuplicate: true,
            message: `Likely Duplicate Detected: A certificate titled '${title}' issued by '${issuingBody}' on '${issueDate}' already exists.`,
            existingCertificate: duplicate,
          },
          { status: 409 }
        );
      }
    }

    const certificate = await prisma.certificate.create({
      data: {
        studentId,
        title,
        category: category || "Certification",
        issuingBody,
        issueDate: issueDate || new Date().toISOString().split("T")[0],
        startDate,
        endDate,
        academicYearCode: academicYearCode || "2025-2026",
        semester: semester || 1,
        mode: mode || "ONLINE",
        location,
        certificateNo,
        documentUrl: documentUrl || "https://example.com/certificate.pdf",
        externalLink,
        skillsGained,
        projectId,
        internshipId,
        verificationStatus: "APPROVED",
      },
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "SUBMIT_CERTIFICATE",
        entityType: "Certificate",
        entityId: certificate.id,
        details: JSON.stringify({ title, category, issuingBody, submittedBy: session.email }),
      },
    });

    logApiPerf("POST /api/certificates", startTime);
    return apiSuccess({ certificate }, "Certificate record added successfully.", 201);
  } catch (error: any) {
    return apiError(error.message || "Failed to add certificate record", 500);
  }
}

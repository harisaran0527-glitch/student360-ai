import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notifyStudentInternshipStatus } from "@/lib/internshipNotifications";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN" && session.role !== "FACULTY")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { internshipId, action, reviewerNotes, certificateUrl, finalReportUrl } = await req.json();

    if (!internshipId || !action) {
      return NextResponse.json({ error: "internshipId and action are required" }, { status: 400 });
    }

    const existing = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: { student: { include: { department: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Internship not found" }, { status: 404 });
    }

    let newStatus = "APPROVED";
    if (action === "REQUEST_CHANGES") newStatus = "NEEDS_CHANGES";
    else if (action === "REJECT") newStatus = "REJECTED";
    else if (action === "VERIFY_COMPLETION") newStatus = "VERIFIED";

    // Auto NOC Generation if APPROVED
    let nocNumber = existing.nocNumber;
    let nocGeneratedAt = existing.nocGeneratedAt;
    let nocGeneratedBy = existing.nocGeneratedBy;

    if (action === "APPROVE" && !nocNumber) {
      const year = new Date().getFullYear();
      const deptCode = existing.student?.department?.code || "GEN";
      const regNo = existing.student?.registerNo || "STUDENT";
      nocNumber = `NOC-${year}-${deptCode}-${regNo}`;
      nocGeneratedAt = new Date();
      nocGeneratedBy = session.email;
    }

    const updatedInternship = await prisma.internship.update({
      where: { id: internshipId },
      data: {
        status: newStatus,
        nocNumber,
        nocGeneratedAt,
        nocGeneratedBy,
        certificateUrl: certificateUrl || existing.certificateUrl,
        finalReportUrl: finalReportUrl || existing.finalReportUrl,
      },
    });

    // Auto Certificate Linking if VERIFIED
    if (action === "VERIFY_COMPLETION" && (certificateUrl || existing.certificateUrl)) {
      const doc = certificateUrl || existing.certificateUrl || "";
      await prisma.certificate.create({
        data: {
          studentId: existing.studentId,
          title: `Completion Certificate - ${existing.companyName} (${existing.role})`,
          category: "Internship",
          issuingBody: existing.companyName,
          issueDate: existing.endDate,
          startDate: existing.startDate,
          endDate: existing.endDate,
          academicYearCode: existing.academicYearCode,
          semester: existing.semester,
          mode: existing.mode,
          location: existing.location,
          documentUrl: doc,
          internshipId: existing.id,
          verificationStatus: "APPROVED",
          verifiedBy: session.email,
          verifiedAt: new Date(),
          reviewerNotes: reviewerNotes || "Auto-linked from verified internship completion.",
        },
      });
    }

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: `INTERNSHIP_VERIFY_${action}`,
        entityType: "Internship",
        entityId: internshipId,
        details: JSON.stringify({ action, verifiedBy: session.email, reviewerNotes, nocNumber }),
      },
    });

    // Notify Student automatically
    const notifRes = await notifyStudentInternshipStatus({
      internshipId,
      studentId: existing.studentId,
      companyName: existing.companyName,
      role: existing.role,
      newStatus,
      oldStatus: existing.status,
    });

    return NextResponse.json({
      success: true,
      internship: updatedInternship,
      message: notifRes.message,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { invalidateServerMetadataCache } from "@/lib/serverCache";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, batchId, departmentId, sectionId, nextSemester, nextAcademicYear } = await req.json();

    if (!batchId || !nextSemester || !nextAcademicYear) {
      return NextResponse.json(
        { error: "batchId, nextSemester, and nextAcademicYear are required" },
        { status: 400 }
      );
    }

    const where: any = {
      batchId,
      academicStatus: "PURSUING",
      isArchived: false,
    };
    if (departmentId) where.departmentId = departmentId;
    if (sectionId) where.sectionId = sectionId;

    const targetStudents = await prisma.studentProfile.findMany({
      where,
      include: { department: true, batch: true },
      orderBy: { registerNo: "asc" },
    });

    if (action === "preview") {
      const previewList = targetStudents.map((st) => ({
        studentId: st.id,
        registerNo: st.registerNo,
        fullName: st.fullName,
        departmentCode: st.department?.code,
        batchName: st.batch?.name,
        currentSemester: st.currentSemester,
        nextSemester,
        currentAcademicYear: st.academicYear,
        nextAcademicYear,
        willGraduate: nextSemester > 8,
      }));

      return NextResponse.json({
        totalEligible: previewList.length,
        previewList,
      });
    }

    if (action === "execute") {
      let promotedCount = 0;

      for (const st of targetStudents) {
        // 1. Preserve historical semester snapshot in StudentSemesterHistory
        await prisma.studentSemesterHistory.upsert({
          where: {
            studentId_semester: {
              studentId: st.id,
              semester: st.currentSemester,
            },
          },
          update: {
            academicYearCode: st.academicYear,
            cgpa: st.cgpa,
            attendancePercentage: st.attendancePercentage,
            completedAt: new Date(),
          },
          create: {
            studentId: st.id,
            semester: st.currentSemester,
            academicYearCode: st.academicYear,
            cgpa: st.cgpa,
            attendancePercentage: st.attendancePercentage,
            completedAt: new Date(),
          },
        });

        // 2. Promote student to next semester & academic year
        const isGraduation = nextSemester > 8;
        await prisma.studentProfile.update({
          where: { id: st.id },
          data: {
            currentSemester: isGraduation ? 8 : nextSemester,
            academicYear: nextAcademicYear,
            academicStatus: isGraduation ? "GRADUATED" : "PURSUING",
            graduationDate: isGraduation ? new Date().toISOString().split("T")[0] : undefined,
            graduationAcademicYear: isGraduation ? nextAcademicYear : undefined,
            finalCgpa: isGraduation ? st.cgpa : undefined,
          },
        });

        promotedCount++;
      }

      // Update Batch current semester
      await prisma.batch.update({
        where: { id: batchId },
        data: {
          currentSemester: nextSemester > 8 ? 8 : nextSemester,
          status: nextSemester > 8 ? "GRADUATED" : "ACTIVE",
        },
      });

      // 3. Record Audit Log for Bulk Promotion
      await prisma.auditLog.create({
        data: {
          userId: session.id,
          userEmail: session.email,
          userRole: session.role,
          action: "BULK_PROMOTED_STUDENTS",
          entityType: "Batch",
          entityId: batchId,
          details: JSON.stringify({
            batchId,
            promotedCount,
            nextSemester,
            nextAcademicYear,
            promotedBy: session.email,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      invalidateServerMetadataCache();
      return NextResponse.json({
        success: true,
        message: `Successfully promoted ${promotedCount} students to Semester ${nextSemester} (${nextAcademicYear}).`,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use 'preview' or 'execute'" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

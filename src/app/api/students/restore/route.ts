import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentId } = await req.json();
    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const student = await prisma.studentProfile.update({
      where: { id: studentId },
      data: {
        isArchived: false,
        archivedAt: null,
        archiveReason: null,
        academicStatus: "PURSUING",
      },
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "RESTORE_STUDENT_MASTER",
        entityType: "StudentProfile",
        entityId: studentId,
        details: JSON.stringify({
          studentId,
          registerNo: student.registerNo,
          restoredBy: session.email,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Student ${student.fullName} (${student.registerNo}) successfully restored to active pursuing status.`,
      student,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

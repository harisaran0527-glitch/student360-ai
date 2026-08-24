import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { calculateAcademicGrade, recalculateStudentCgpa } from "@/lib/academic-grading";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const semester = searchParams.get("semester");

    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (semester) where.semester = Number(semester);

    if (session.role === "STUDENT") {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: session.id } });
      if (profile) where.studentId = profile.id;
    }

    const records = await prisma.academicRecord.findMany({
      where,
      include: {
        course: true,
        student: { select: { fullName: true, registerNo: true } },
      },
      orderBy: [{ semester: "asc" }],
    });

    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN" && session.role !== "FACULTY")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, courseId, semester, internalMarks, externalMarks, credits } = body;

    const gradeCalc = calculateAcademicGrade(internalMarks, externalMarks);
    const semNumber = Number(semester) || 1;

    const record = await prisma.academicRecord.create({
      data: {
        studentId,
        courseId,
        semester: semNumber,
        internalMarks: gradeCalc.internalMarks,
        externalMarks: gradeCalc.externalMarks,
        totalMarks: gradeCalc.totalMarks,
        grade: gradeCalc.grade,
        credits: Number(credits) || 3,
        result: gradeCalc.result,
      },
    });

    // Recalculate CGPA
    const newCgpa = await recalculateStudentCgpa(studentId, semNumber);

    await logAuditEvent({
      userId: session.id,
      userEmail: session.email,
      userRole: session.role,
      action: "UPDATE_ACADEMIC_MARKS",
      entityType: "AcademicRecord",
      entityId: record.id,
      details: { studentId, courseId, total: gradeCalc.totalMarks, grade: gradeCalc.grade },
    });

    return NextResponse.json({ success: true, record, updatedCgpa: newCgpa });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

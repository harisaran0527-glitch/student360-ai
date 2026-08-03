import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await getSession();
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
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN" && session.role !== "FACULTY")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, courseId, semester, internalMarks, externalMarks, credits } = body;

    const internal = Number(internalMarks) || 0;
    const external = Number(externalMarks) || 0;
    const total = internal + external;

    let grade = "F";
    let result = "FAIL";
    if (total >= 90) grade = "O";
    else if (total >= 80) grade = "A+";
    else if (total >= 70) grade = "A";
    else if (total >= 60) grade = "B+";
    else if (total >= 50) grade = "B";

    if (total >= 50 && external >= 25) {
      result = "PASS";
    }

    const record = await prisma.academicRecord.create({
      data: {
        studentId,
        courseId,
        semester: Number(semester) || 1,
        internalMarks: internal,
        externalMarks: external,
        totalMarks: total,
        grade,
        credits: Number(credits) || 3,
        result,
      },
    });

    // Recalculate CGPA
    const allRecords = await prisma.academicRecord.findMany({ where: { studentId } });
    let totalGradePoints = 0;
    let totalCredits = 0;
    const gradePointMap: Record<string, number> = { "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "F": 0 };

    for (const r of allRecords) {
      const gp = gradePointMap[r.grade] || 0;
      totalGradePoints += gp * r.credits;
      totalCredits += r.credits;
    }

    const newCgpa = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0.0;

    await prisma.studentProfile.update({
      where: { id: studentId },
      data: { cgpa: newCgpa },
    });

    await logAuditEvent({
      userId: session.id,
      userEmail: session.email,
      userRole: session.role,
      action: "UPDATE_ACADEMIC_MARKS",
      entityType: "AcademicRecord",
      entityId: record.id,
      details: { studentId, courseId, total, grade },
    });

    return NextResponse.json({ success: true, record, updatedCgpa: newCgpa });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

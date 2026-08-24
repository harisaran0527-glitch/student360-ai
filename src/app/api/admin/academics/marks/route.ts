import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { calculateAcademicGrade, recalculateStudentCgpa } from "@/lib/academic-grading";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId");
    const semesterParam = searchParams.get("semester");
    const academicYear = searchParams.get("academicYear") || "2025-2029";
    const sectionId = searchParams.get("sectionId");
    const studentId = searchParams.get("studentId");
    const search = searchParams.get("search");

    const semester = semesterParam ? parseInt(semesterParam, 10) : undefined;

    // 1. Fetch Students list for filter selection
    const studentWhere: any = { isArchived: false };
    if (departmentId) studentWhere.departmentId = departmentId;
    if (sectionId) studentWhere.sectionId = sectionId;
    if (search) {
      studentWhere.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { registerNo: { contains: search, mode: "insensitive" } },
        { rollNo: { contains: search, mode: "insensitive" } },
      ];
    }

    const students = await prisma.studentProfile.findMany({
      where: studentWhere,
      select: {
        id: true,
        fullName: true,
        registerNo: true,
        rollNo: true,
        currentSemester: true,
        departmentId: true,
        sectionId: true,
        academicYear: true,
        department: { select: { id: true, code: true, name: true } },
        section: { select: { id: true, name: true } },
      },
      orderBy: { registerNo: "asc" },
      take: 100,
    });

    let selectedStudent: any = null;
    let targetStudentId = studentId;

    if (!targetStudentId && students.length > 0) {
      targetStudentId = students[0].id;
    }

    if (targetStudentId) {
      selectedStudent = await prisma.studentProfile.findUnique({
        where: { id: targetStudentId },
        include: {
          department: true,
          section: true,
          batch: true,
        },
      });
    }

    const targetDeptId = selectedStudent?.departmentId || departmentId;
    const targetSem = semester || selectedStudent?.currentSemester || 3;

    // 2. Fetch Applicable Active Courses from Course table
    let courses: any[] = [];
    if (targetDeptId) {
      courses = await prisma.course.findMany({
        where: {
          departmentId: targetDeptId,
          semester: targetSem,
          isActive: true,
          isArchived: false,
        },
        orderBy: { code: "asc" },
      });
    }

    // 3. Fetch Existing Academic Records for this student & semester
    let records: any[] = [];
    if (selectedStudent) {
      records = await prisma.academicRecord.findMany({
        where: {
          studentId: selectedStudent.id,
          semester: targetSem,
          academicYear,
        },
        include: { course: true },
      });
    }

    return NextResponse.json({
      success: true,
      students,
      selectedStudent,
      targetSemester: targetSem,
      academicYear,
      courses,
      records,
    });
  } catch (error: any) {
    console.error("[GET /api/admin/academics/marks Error]", error);
    return NextResponse.json({ error: error.message || "Failed to fetch marks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, semester, academicYear, marks } = body;

    if (!studentId || !semester || !Array.isArray(marks) || marks.length === 0) {
      return NextResponse.json({ error: "Invalid payload. studentId, semester and marks array are required." }, { status: 400 });
    }

    const targetYear = academicYear || "2025-2029";
    const semNumber = parseInt(semester, 10);

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const savedRecords: any[] = [];

    for (const entry of marks) {
      const { courseId, internalMarks, externalMarks, credits } = entry;
      if (!courseId) continue;

      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) continue;

      const gradeCalc = calculateAcademicGrade(internalMarks, externalMarks);

      // Check existing record for audit logging
      const existingRecord = await prisma.academicRecord.findUnique({
        where: {
          studentId_courseId_semester_academicYear: {
            studentId,
            courseId,
            semester: semNumber,
            academicYear: targetYear,
          },
        },
      });

      const updatedRecord = await prisma.academicRecord.upsert({
        where: {
          studentId_courseId_semester_academicYear: {
            studentId,
            courseId,
            semester: semNumber,
            academicYear: targetYear,
          },
        },
        create: {
          studentId,
          courseId,
          semester: semNumber,
          academicYear: targetYear,
          internalMarks: gradeCalc.internalMarks,
          externalMarks: gradeCalc.externalMarks,
          totalMarks: gradeCalc.totalMarks,
          grade: gradeCalc.grade,
          result: gradeCalc.result,
          credits: Number(credits) || course.credits || 3,
        },
        update: {
          internalMarks: gradeCalc.internalMarks,
          externalMarks: gradeCalc.externalMarks,
          totalMarks: gradeCalc.totalMarks,
          grade: gradeCalc.grade,
          result: gradeCalc.result,
          credits: Number(credits) || course.credits || 3,
        },
      });

      savedRecords.push(updatedRecord);

      // Audit Log Entry
      const isCreate = !existingRecord;
      await logAuditEvent({
        action: isCreate ? "MARKS_CREATED" : "MARKS_UPDATED",
        entityType: "ACADEMIC_RECORD",
        entityId: updatedRecord.id,
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        details: {
          studentName: student.fullName,
          registerNo: student.registerNo,
          courseCode: course.code,
          courseTitle: course.title,
          semester: semNumber,
          academicYear: targetYear,
          oldInternal: existingRecord?.internalMarks ?? null,
          newInternal: gradeCalc.internalMarks,
          oldExternal: existingRecord?.externalMarks ?? null,
          newExternal: gradeCalc.externalMarks,
          oldGrade: existingRecord?.grade ?? null,
          newGrade: gradeCalc.grade,
          oldResult: existingRecord?.result ?? null,
          newResult: gradeCalc.result,
          updatedBy: session.fullName || session.email,
          updatedById: session.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Recalculate CGPA and update StudentSemesterHistory
    const newCgpa = await recalculateStudentCgpa(studentId, semNumber);

    return NextResponse.json({
      success: true,
      message: `Successfully saved marks for ${savedRecords.length} subject(s).`,
      recordsCount: savedRecords.length,
      cgpa: newCgpa,
    });
  } catch (error: any) {
    console.error("[POST /api/admin/academics/marks Error]", error);
    return NextResponse.json({ error: error.message || "Failed to save academic marks" }, { status: 500 });
  }
}

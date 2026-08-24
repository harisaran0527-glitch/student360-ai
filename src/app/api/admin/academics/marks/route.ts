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
    const courseId = searchParams.get("courseId");
    const search = searchParams.get("search");

    const semester = semesterParam ? parseInt(semesterParam, 10) : undefined;
    const targetSem = semester || 3;

    // 1. Fetch available subjects/courses for filter dropdown
    let courses: any[] = [];
    if (departmentId) {
      courses = await prisma.course.findMany({
        where: {
          departmentId,
          semester: targetSem,
          isActive: true,
          isArchived: false,
        },
        orderBy: { code: "asc" },
      });
    }

    // 2. Fetch student roster matching Department, Semester, and optional Section
    const studentWhere: any = { isArchived: false };
    if (departmentId) studentWhere.departmentId = departmentId;
    if (targetSem) studentWhere.currentSemester = targetSem;
    if (sectionId && sectionId !== "all" && sectionId !== "undefined") {
      studentWhere.sectionId = sectionId;
    }
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
        cgpa: true,
        department: { select: { id: true, code: true, name: true } },
        section: { select: { id: true, name: true } },
      },
      orderBy: { registerNo: "asc" },
    });

    // 3. Fetch existing AcademicRecords for the selected subject/course
    let records: any[] = [];
    const activeCourseId = courseId || (courses.length > 0 ? courses[0].id : null);
    if (activeCourseId && students.length > 0) {
      const studentIds = students.map((s) => s.id);
      records = await prisma.academicRecord.findMany({
        where: {
          courseId: activeCourseId,
          semester: targetSem,
          academicYear,
          studentId: { in: studentIds },
        },
      });
    }

    return NextResponse.json({
      success: true,
      students,
      courses,
      records,
      targetSemester: targetSem,
      academicYear,
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
    const { courseId, semester, academicYear, marks } = body;

    if (!semester || !Array.isArray(marks) || marks.length === 0) {
      return NextResponse.json({ error: "Invalid payload. semester and marks array are required." }, { status: 400 });
    }

    const targetYear = academicYear || "2025-2029";
    const semNumber = parseInt(semester, 10);
    const savedRecords: any[] = [];
    const affectedStudentIds = new Set<string>();

    // Case 1: Class-wise marks entry (single course, multiple students)
    if (courseId) {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) {
        return NextResponse.json({ error: "Selected subject not found" }, { status: 404 });
      }

      for (const entry of marks) {
        const { studentId, internalMarks, externalMarks } = entry;
        if (!studentId) continue;

        const isInternalBlank = internalMarks === "" || internalMarks === undefined || internalMarks === null;
        const isExternalBlank = externalMarks === "" || externalMarks === undefined || externalMarks === null;

        // If either mark is blank/empty, remove the record if it exists so it remains unmarked
        if (isInternalBlank || isExternalBlank) {
          const existing = await prisma.academicRecord.findUnique({
            where: {
              studentId_courseId_semester_academicYear: {
                studentId,
                courseId,
                semester: semNumber,
                academicYear: targetYear,
              },
            },
          });

          if (existing) {
            await prisma.academicRecord.delete({
              where: { id: existing.id },
            });

            await logAuditEvent({
              action: "MARKS_DELETED",
              entityType: "ACADEMIC_RECORD",
              entityId: existing.id,
              userId: session.id,
              userEmail: session.email,
              userRole: session.role,
              details: {
                studentId,
                courseId,
                semester: semNumber,
                academicYear: targetYear,
                message: "Marks cleared to blank",
              },
            });
          }

          affectedStudentIds.add(studentId);
          continue;
        }

        // Otherwise calculate grade and upsert
        const gradeCalc = calculateAcademicGrade(internalMarks, externalMarks);

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
            credits: course.credits || 3,
          },
          update: {
            internalMarks: gradeCalc.internalMarks,
            externalMarks: gradeCalc.externalMarks,
            totalMarks: gradeCalc.totalMarks,
            grade: gradeCalc.grade,
            result: gradeCalc.result,
            credits: course.credits || 3,
          },
        });

        savedRecords.push(updatedRecord);
        affectedStudentIds.add(studentId);

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
            studentId,
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
    } else {
      // Backward compatibility Case 2: Student-wise marks entry
      const { studentId } = body;
      if (!studentId) {
        return NextResponse.json({ error: "studentId or courseId is required" }, { status: 400 });
      }

      for (const entry of marks) {
        const { courseId: entryCourseId, internalMarks, externalMarks, credits } = entry;
        if (!entryCourseId) continue;

        const course = await prisma.course.findUnique({ where: { id: entryCourseId } });
        if (!course) continue;

        const gradeCalc = calculateAcademicGrade(internalMarks, externalMarks);

        const existingRecord = await prisma.academicRecord.findUnique({
          where: {
            studentId_courseId_semester_academicYear: {
              studentId,
              courseId: entryCourseId,
              semester: semNumber,
              academicYear: targetYear,
            },
          },
        });

        const updatedRecord = await prisma.academicRecord.upsert({
          where: {
            studentId_courseId_semester_academicYear: {
              studentId,
              courseId: entryCourseId,
              semester: semNumber,
              academicYear: targetYear,
            },
          },
          create: {
            studentId,
            courseId: entryCourseId,
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
        affectedStudentIds.add(studentId);
      }
    }

    // Recalculate CGPA for all affected students
    for (const studentId of Array.from(affectedStudentIds)) {
      await recalculateStudentCgpa(studentId, semNumber);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed marks for ${affectedStudentIds.size} student(s).`,
      recordsCount: savedRecords.length,
    });
  } catch (error: any) {
    console.error("[POST /api/admin/academics/marks Error]", error);
    return NextResponse.json({ error: error.message || "Failed to save academic marks" }, { status: 500 });
  }
}

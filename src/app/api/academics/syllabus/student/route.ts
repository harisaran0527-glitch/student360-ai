import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

/**
 * GET /api/academics/syllabus/student
 * Resolves the student's applicable syllabus based on their enrolled batch and semester.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const semesterParam = searchParams.get("semester");
    const studentId = searchParams.get("studentId");

    // Fetch demo or active student
    let student;
    if (studentId) {
      student = await prisma.studentProfile.findUnique({
        where: { id: studentId },
        include: { batch: true, department: true, user: true },
      });
    }

    if (!student) {
      student = await prisma.studentProfile.findFirst({
        where: { user: { role: "STUDENT" } },
        include: { batch: true, department: true, user: true },
      });
    }

    const currentSem = semesterParam ? Number(semesterParam) : (student?.currentSemester || 1);
    const deptId = student?.departmentId;

    let departmentRecord;
    if (deptId) {
      departmentRecord = await prisma.department.findUnique({ where: { id: deptId } });
    }
    if (!departmentRecord) {
      departmentRecord = await prisma.department.findFirst();
    }

    const courses = await prisma.course.findMany({
      where: {
        semester: currentSem,
        isArchived: false,
        ...(departmentRecord ? { departmentId: departmentRecord.id } : {}),
      },
      include: {
        faculty: { select: { id: true, fullName: true, email: true } },
        syllabusVersions: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { code: "asc" },
    });

    let mappings: any[] = [];
    if (student?.batchId) {
      mappings = await prisma.batchSemesterSyllabus.findMany({
        where: {
          batchId: student.batchId,
          semesterNumber: currentSem,
        },
        include: { syllabusVersion: true },
      });
    }

    const resolvedSubjects = courses.map((c) => {
      const pinnedMapping = mappings.find((m) => m.courseId === c.id);
      let applicableVersion = null;

      if (pinnedMapping) {
        applicableVersion = pinnedMapping.syllabusVersion;
      } else {
        applicableVersion = c.syllabusVersions.find((v) => v.status === "ACTIVE") || c.syllabusVersions[0] || null;
      }

      return {
        id: c.id,
        code: c.code,
        title: c.title,
        credits: c.credits,
        subjectType: c.subjectType,
        semester: c.semester,
        faculty: c.faculty,
        applicableSyllabusVersion: applicableVersion,
      };
    });

    logApiPerf("GET /api/academics/syllabus/student", startTime);
    return apiSuccess({
      student: student ? {
        id: student.id,
        fullName: student.fullName || student.user?.fullName || "Student",
        registerNumber: student.registerNo || student.rollNo || "2025001",
        currentSemester: student.currentSemester,
        batchName: student.batch?.name || "Standard Batch",
        departmentName: departmentRecord?.name || "Artificial Intelligence and Machine Learning",
      } : null,
      semester: currentSem,
      subjectsCount: resolvedSubjects.length,
      subjects: resolvedSubjects,
    });
  } catch (err: any) {
    console.error("[GET /api/academics/syllabus/student Error]", err);
    return apiError(err.message || "Failed to resolve student syllabus", 500);
  }
}

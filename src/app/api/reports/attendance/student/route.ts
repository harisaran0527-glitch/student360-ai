import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";
import { getAttendancePolicy } from "@/lib/attendance";
import { getDepartmentDisplayCode, getDepartmentDisplayName } from "@/lib/departmentEngine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/reports/attendance/student
 * Student Academic Attendance & Subject Breakdown API
 * Source of truth: Course DB records for Student Department + Semester
 */
export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const paramStudentId = searchParams.get("studentId");
    const semesterParam = searchParams.get("semester");

    let targetStudentId = paramStudentId;
    if (session.role === "STUDENT") {
      if (paramStudentId && paramStudentId !== session.studentProfileId) {
        return apiError("Forbidden: You can only view your own attendance.", 403);
      }
      targetStudentId = session.studentProfileId || paramStudentId;
    }

    if (!targetStudentId) {
      // Fallback for session student
      const user = await prisma.user.findUnique({
        where: { id: session.id },
        include: { studentProfile: true },
      });
      targetStudentId = user?.studentProfile?.id || null;
    }

    if (!targetStudentId) {
      const fallbackStudent = await prisma.studentProfile.findFirst();
      targetStudentId = fallbackStudent?.id || null;
    }

    if (!targetStudentId) {
      return apiError("Student Profile ID is required", 400);
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: targetStudentId },
      include: {
        department: true,
        batch: true,
        section: true,
        user: { select: { id: true, email: true, fullName: true, avatarUrl: true } },
      },
    });

    if (!student) {
      return apiError("Student profile not found", 404);
    }

    const targetSemester = semesterParam ? parseInt(semesterParam, 10) : student.currentSemester;
    const policy = await getAttendancePolicy();

    // 1. Fetch ALL active non-archived courses for student's department + selected semester (Source of Truth)
    let applicableCourses = await prisma.course.findMany({
      where: {
        departmentId: student.departmentId,
        semester: targetSemester,
        isActive: true,
        isArchived: false,
      },
      include: {
        faculty: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        syllabusVersions: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { code: "asc" },
    });

    // Fallback: If no courses exist for targetSemester in this department, fetch all active courses for the department
    if (applicableCourses.length === 0) {
      applicableCourses = await prisma.course.findMany({
        where: {
          departmentId: student.departmentId,
          isActive: true,
          isArchived: false,
        },
        include: {
          faculty: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
          syllabusVersions: {
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { code: "asc" },
      });
    }

    // 2. Fetch all saved subject attendance records for this student and these courses
    const courseIds = applicableCourses.map((c) => c.id);
    const studentAttendances = await prisma.attendance.findMany({
      where: {
        studentId: student.id,
        courseId: { in: courseIds },
      },
      include: {
        course: {
          select: { id: true, code: true, title: true, semester: true },
        },
      },
      orderBy: { date: "desc" },
    });

    // 3. Fetch Full-Day attendance records for this student
    const fullDayRecords = await prisma.fullDayAttendance.findMany({
      where: { studentId: student.id },
      orderBy: { date: "desc" },
    });

    // Build subject breakdown summaries for EVERY applicable course
    const subjects = applicableCourses.map((course) => {
      const courseAtts = studentAttendances.filter((a) => a.courseId === course.id);
      const classesConducted = courseAtts.length;

      let presentCount = 0;
      let absentCount = 0;
      let odCount = 0;
      let mlCount = 0;
      let longAbsentCount = 0;
      let internshipCount = 0;
      let lateCount = 0;
      let effectivePresent = 0;

      courseAtts.forEach((a) => {
        const s = (a.status || "").toUpperCase();
        if (s === "PRESENT") {
          presentCount++;
          effectivePresent += 1;
        } else if (s === "ABSENT") {
          absentCount++;
        } else if (s === "OD") {
          odCount++;
          if (policy.countOdAsPresent) effectivePresent += 1;
        } else if (s === "MEDICAL_LEAVE" || s === "ML") {
          mlCount++;
          if (policy.countMedicalAsPresent) effectivePresent += 1;
        } else if (s === "LONG_ABSENT") {
          longAbsentCount++;
        } else if (s === "INTERNSHIP") {
          internshipCount++;
          if (policy.countInternshipAsPresent) effectivePresent += 1;
        } else if (s === "LATE") {
          lateCount++;
          if (policy.allowLateCount) effectivePresent += 1;
        }
      });

      const attendancePercentage = classesConducted > 0
        ? Math.round((effectivePresent / classesConducted) * 100 * 100) / 100
        : 0.0;

      return {
        courseId: course.id,
        code: course.code,
        name: course.title,
        title: course.title,
        credits: course.credits,
        semester: course.semester,
        subjectType: course.subjectType,
        assignedFaculty: course.faculty ? {
          id: course.faculty.id,
          fullName: course.faculty.fullName,
          email: course.faculty.email,
        } : null,
        attendanceSummary: {
          classesConducted,
          present: presentCount,
          absent: absentCount,
          od: odCount,
          medicalLeave: mlCount,
          longAbsent: longAbsentCount,
          internship: internshipCount,
          late: lateCount,
          effectivePresent,
          attendancePercentage,
          hasAttendance: classesConducted > 0,
          statusLabel: classesConducted === 0 ? "Not Marked" : (attendancePercentage >= policy.minAttendancePercentage ? "Good Standing" : "Shortage Warning"),
        },
        attendanceRecords: courseAtts.map((a) => ({
          id: a.id,
          date: a.date,
          session: a.session,
          status: a.status,
          remarks: a.remarks,
        })),
      };
    });

    // Full-Day Attendance Summary Calculations
    const validFullDay = fullDayRecords.filter((r) => r.status && r.status.toUpperCase() !== "UNMARKED" && r.status.toUpperCase() !== "NOT_MARKED");
    const totalWorkingDays = validFullDay.length;
    const presentOnly = validFullDay.filter((r) => r.status.toUpperCase() === "PRESENT").length;
    const absentOnly = validFullDay.filter((r) => r.status.toUpperCase() === "ABSENT").length;
    const odDays = validFullDay.filter((r) => r.status.toUpperCase() === "OD").length;
    const mlDays = validFullDay.filter((r) => {
      const s = r.status.toUpperCase();
      return s === "MEDICAL_LEAVE" || s === "ML";
    }).length;
    const longAbsentDays = validFullDay.filter((r) => r.status.toUpperCase() === "LONG_ABSENT").length;
    const internshipDays = validFullDay.filter((r) => r.status.toUpperCase() === "INTERNSHIP").length;
    const lateDays = validFullDay.filter((r) => r.status.toUpperCase() === "LATE").length;

    let fullDayEffectivePresent = presentOnly;
    if (policy.countOdAsPresent) fullDayEffectivePresent += odDays;
    if (policy.countMedicalAsPresent) fullDayEffectivePresent += mlDays;
    if (policy.countInternshipAsPresent) fullDayEffectivePresent += internshipDays;
    if (policy.allowLateCount) fullDayEffectivePresent += lateDays;

    const fullDayPercentage = totalWorkingDays > 0
      ? Math.round((fullDayEffectivePresent / totalWorkingDays) * 100 * 100) / 100
      : 0.0;

    logApiPerf("GET /api/reports/attendance/student", startTime);

    return new NextResponse(
      JSON.stringify({
        success: true,
        student: {
          id: student.id,
          fullName: student.fullName,
          registerNo: student.registerNo,
          rollNo: student.rollNo,
          admissionNo: student.admissionNo,
          currentSemester: student.currentSemester,
          selectedSemester: targetSemester,
          academicYear: student.academicYear,
          overallAttendancePercentage: student.attendancePercentage,
          department: {
            id: student.department?.id,
            code: getDepartmentDisplayCode(student.department?.code),
            name: getDepartmentDisplayName(student.department),
          },
          batch: student.batch ? {
            id: student.batch.id,
            name: student.batch.name,
          } : null,
          section: student.section ? {
            id: student.section.id,
            name: student.section.name,
          } : null,
        },
        subjects,
        allAttendances: studentAttendances,
        fullDayAttendanceSummary: {
          totalWorkingDays,
          present: presentOnly,
          absent: absentOnly,
          od: odDays,
          medicalLeave: mlDays,
          longAbsent: longAbsentDays,
          internship: internshipDays,
          late: lateDays,
          effectivePresent: fullDayEffectivePresent,
          fullDayPercentage,
        },
        fullDayRecords,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("[GET /api/reports/attendance/student Error]", error);
    return apiError(error.message || "Failed to fetch student attendance data", 500);
  }
}

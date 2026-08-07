import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { computeAttendanceStats, getAttendancePolicy } from "@/lib/attendance";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const sectionId = searchParams.get("sectionId");
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const period = parseInt(searchParams.get("period") || "1", 10);
    const departmentId = searchParams.get("departmentId");
    const batchId = searchParams.get("batchId");

    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    // 1. Check if AttendanceSession already exists
    const existingSession = await prisma.attendanceSession.findFirst({
      where: {
        courseId,
        sectionId: sectionId || undefined,
        date,
        period,
      },
      include: {
        attendances: true,
      },
    });

    // 2. Fetch Enrolled Students matching department/batch/section
    const studentWhere: any = { isArchived: false, academicStatus: "PURSUING" };
    if (departmentId) studentWhere.departmentId = departmentId;
    if (batchId) studentWhere.batchId = batchId;
    if (sectionId) studentWhere.sectionId = sectionId;

    const students = await prisma.studentProfile.findMany({
      where: studentWhere,
      select: {
        id: true,
        registerNo: true,
        rollNo: true,
        fullName: true,
        email: true,
      },
      orderBy: { registerNo: "asc" },
    });

    // 3. Fetch Active Approved ODs & Internships covering this date
    const [approvedOds, approvedInternships] = await Promise.all([
      prisma.oDRecord.findMany({
        where: {
          status: "APPROVED",
          fromDate: { lte: date },
          toDate: { gte: date },
        },
      }),
      prisma.internship.findMany({
        where: {
          status: "NOC_ISSUED",
          startDate: { lte: date },
          endDate: { gte: date },
        },
      }),
    ]);

    const activeOdStudentIds = new Set(approvedOds.map((o) => o.studentId));
    const activeInternshipStudentIds = new Set(approvedInternships.map((i) => i.studentId));

    // Map existing attendance statuses if session exists
    const attendanceMap = new Map(existingSession?.attendances.map((a) => [a.studentId, a.status]) || []);

    const studentRows = students.map((st) => ({
      studentId: st.id,
      registerNo: st.registerNo,
      rollNo: st.rollNo,
      fullName: st.fullName,
      email: st.email,
      currentStatus: attendanceMap.get(st.id) || (activeOdStudentIds.has(st.id) ? "OD" : activeInternshipStudentIds.has(st.id) ? "INTERNSHIP" : "PRESENT"),
      hasApprovedOd: activeOdStudentIds.has(st.id),
      hasApprovedInternship: activeInternshipStudentIds.has(st.id),
    }));

    return NextResponse.json({
      sessionExists: Boolean(existingSession),
      session: existingSession,
      students: studentRows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN" && session.role !== "FACULTY")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      courseId,
      sectionId,
      academicYearCode,
      semester,
      date,
      period,
      attendances, // Array of { studentId, status, remarks }
      reasonForUpdate,
    } = await req.json();

    if (!courseId || !date || !attendances || !Array.isArray(attendances)) {
      return NextResponse.json({ error: "courseId, date, and attendances array are required" }, { status: 400 });
    }

    let presentCount = 0;
    let absentCount = 0;
    let odCount = 0;
    let internshipCount = 0;

    attendances.forEach((a: any) => {
      if (a.status === "PRESENT" || a.status === "LATE") presentCount++;
      else if (a.status === "ABSENT" || a.status === "LONG_ABSENT") absentCount++;
      else if (a.status === "OD") odCount++;
      else if (a.status === "INTERNSHIP") internshipCount++;
    });

    // 1. Create or Update AttendanceSession
    let attSession = await prisma.attendanceSession.findFirst({
      where: {
        courseId,
        sectionId: sectionId || undefined,
        date,
        period: period || 1,
      },
    });

    if (attSession) {
      attSession = await prisma.attendanceSession.update({
        where: { id: attSession.id },
        data: {
          totalPresent: presentCount,
          totalAbsent: absentCount,
          totalOd: odCount,
          totalInternship: internshipCount,
          facultyId: session.id,
        },
      });
    } else {
      attSession = await prisma.attendanceSession.create({
        data: {
          courseId,
          sectionId,
          academicYearCode: academicYearCode || DEFAULT_ACADEMIC_YEAR,
          semester: semester || 1,
          date,
          period: period || 1,
          facultyId: session.id,
          totalPresent: presentCount,
          totalAbsent: absentCount,
          totalOd: odCount,
          totalInternship: internshipCount,
        },
      });
    }

    const policy = await getAttendancePolicy();

    // 2. Save / Update individual Student Attendance rows & record Corrections
    for (const item of attendances) {
      const existingRecord = await prisma.attendance.findFirst({
        where: {
          studentId: item.studentId,
          courseId,
          date,
          session: `Period_${period || 1}`,
        },
      });

      if (existingRecord) {
        if (existingRecord.status !== item.status) {
          // Record Attendance Correction Audit Entry
          await prisma.attendanceCorrection.create({
            data: {
              attendanceId: existingRecord.id,
              sessionId: attSession.id,
              studentId: item.studentId,
              oldStatus: existingRecord.status,
              newStatus: item.status,
              reason: reasonForUpdate || "Faculty Correction",
              changedBy: session.email,
            },
          });
        }

        await prisma.attendance.update({
          where: { id: existingRecord.id },
          data: {
            status: item.status,
            remarks: item.remarks,
            facultyId: session.id,
            sessionId: attSession.id,
          },
        });
      } else {
        await prisma.attendance.create({
          data: {
            studentId: item.studentId,
            courseId,
            sessionId: attSession.id,
            academicYearCode: academicYearCode || DEFAULT_ACADEMIC_YEAR,
            semester: semester || 1,
            date,
            session: `Period_${period || 1}`,
            status: item.status,
            remarks: item.remarks,
            facultyId: session.id,
          },
        });
      }

      // Recompute student's overall attendance % dynamically
      const studentAllRecords = await prisma.attendance.findMany({
        where: { studentId: item.studentId },
        select: { status: true },
      });
      const stats = computeAttendanceStats(studentAllRecords, policy);

      await prisma.studentProfile.update({
        where: { id: item.studentId },
        data: { attendancePercentage: stats.percentage },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully saved attendance session for ${date} (Period ${period || 1}).`,
      session: attSession,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

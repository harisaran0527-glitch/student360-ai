import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { computeAttendanceStats, getAttendancePolicy } from "@/lib/attendance";
import * as XLSX from "xlsx";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type") || "shortage"; // shortage, subject, monthly, daily, student
    const departmentId = searchParams.get("departmentId") || "";
    const batchId = searchParams.get("batchId") || "";
    const courseId = searchParams.get("courseId") || "";
    const studentId = searchParams.get("studentId") || "";
    const format = searchParams.get("format"); // excel

    const policy = await getAttendancePolicy();

    if (reportType === "shortage") {
      const students = await prisma.studentProfile.findMany({
        where: {
          isArchived: false,
          academicStatus: "PURSUING",
          departmentId: departmentId || undefined,
          batchId: batchId || undefined,
        },
        include: {
          department: true,
          batch: true,
          attendances: true,
        },
        orderBy: { registerNo: "asc" },
      });

      const shortageList = students
        .map((st) => {
          const stats = computeAttendanceStats(st.attendances, policy);
          return {
            studentId: st.id,
            registerNo: st.registerNo,
            rollNo: st.rollNo,
            fullName: st.fullName,
            departmentCode: st.department?.code,
            batchName: st.batch?.name,
            totalConducted: stats.totalConducted,
            totalAttended: stats.totalAttended,
            presentCount: stats.presentCount,
            absentCount: stats.absentCount,
            odCount: stats.odCount,
            internshipCount: stats.internshipCount,
            percentage: stats.percentage,
            isShortage: stats.isShortage,
            requiredPercentage: policy.minAttendancePercentage,
          };
        })
        .filter((st) => st.isShortage);

      if (format === "excel") {
        const rows = shortageList.map((s) => ({
          "Register Number": s.registerNo,
          "Roll Number": s.rollNo,
          "Student Name": s.fullName,
          Department: s.departmentCode,
          Batch: s.batchName,
          "Total Conducted": s.totalConducted,
          "Total Attended": s.totalAttended,
          Present: s.presentCount,
          Absent: s.absentCount,
          "OD Count": s.odCount,
          "Attendance %": `${s.percentage}%`,
          "Required %": `${s.requiredPercentage}%`,
          Status: "ATTENTION REQUIRED (SHORTAGE)",
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance_Shortage_Report");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="Attendance_Shortage_Report.xlsx"`,
          },
        });
      }

      return NextResponse.json({ reportType, totalShortage: shortageList.length, shortageList });
    }

    // Default response
    return NextResponse.json({ message: "Report generated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

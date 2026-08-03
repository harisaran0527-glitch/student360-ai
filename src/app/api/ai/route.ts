import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateStudentRiskScore, evaluateSkillGap } from "@/lib/ai";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const targetRole = searchParams.get("targetRole") || "Full Stack Web Developer";

    if (studentId) {
      const student = await prisma.studentProfile.findUnique({
        where: { id: studentId },
        include: { skills: true },
      });

      if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

      const risk = calculateStudentRiskScore({
        cgpa: student.cgpa,
        attendancePercentage: student.attendancePercentage,
      });
      risk.studentId = student.id;
      risk.registerNo = student.registerNo;
      risk.fullName = student.fullName;

      const userSkillNames = student.skills.map((s) => s.name);
      const skillGap = evaluateSkillGap(targetRole, userSkillNames);

      return NextResponse.json({ risk, skillGap });
    }

    // Faculty or Admin view: calculate risk matrix for all active students
    const allStudents = await prisma.studentProfile.findMany({
      where: { isArchived: false },
      include: { department: true, batch: true },
    });

    const riskMatrix = allStudents.map((s) => {
      const r = calculateStudentRiskScore({
        cgpa: s.cgpa,
        attendancePercentage: s.attendancePercentage,
      });
      return {
        studentId: s.id,
        registerNo: s.registerNo,
        fullName: s.fullName,
        department: s.department.code,
        batch: s.batch.name,
        cgpa: s.cgpa,
        attendancePercentage: s.attendancePercentage,
        riskLevel: r.riskLevel,
        riskScore: r.riskScore,
        factors: r.factors,
        recommendations: r.recommendations,
      };
    });

    return NextResponse.json({ riskMatrix });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

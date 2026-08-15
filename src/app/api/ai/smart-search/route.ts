import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseStructuredSearchQuery } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "FACULTY" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query parameter string is required" }, { status: 400 });
    }

    const searchTranslation = parseStructuredSearchQuery(query);
    const filters = searchTranslation.interpretedFilters;

    const whereClause: any = { isArchived: false };

    if (filters.attendanceShortage) {
      whereClause.attendancePercentage = { lt: 75.0 };
    }
    if (filters.semester) {
      whereClause.currentSemester = filters.semester;
    }
    if (filters.department) {
      whereClause.department = { code: filters.department };
    }

    let students = await prisma.studentProfile.findMany({
      where: whereClause,
      include: {
        department: true,
        batch: true,
        skills: true,
        internships: true,
        projects: true,
      },
    });

    // Filter by missing skill if specified
    if (filters.missingSkill) {
      const targetSkillLower = filters.missingSkill.toLowerCase();
      students = students.filter((s) => {
        const verifiedNames = s.skills.filter((sk) => sk.verified).map((sk) => sk.name.toLowerCase());
        return !verifiedNames.some((v) => v.includes(targetSkillLower) || targetSkillLower.includes(v));
      });
    }

    // Filter by incomplete internship if specified
    if (filters.incompleteInternship) {
      students = students.filter((s) => {
        const approvedInternship = s.internships.find((i) => i.status === "APPROVED" || i.status === "COMPLETED");
        return !approvedInternship;
      });
    }

    // If highest project participation, sort by project count descending
    if (filters.highestProjectParticipation) {
      students.sort((a, b) => b.projects.length - a.projects.length);
    }

    return NextResponse.json({
      query: searchTranslation.rawQuery,
      interpretedFilters: filters,
      summaryExplanation: searchTranslation.summaryExplanation,
      studentsCount: students.length,
      results: students.map((s) => ({
        id: s.id,
        registerNo: s.registerNo,
        fullName: s.fullName,
        department: s.department.code,
        batch: s.batch?.name || "N/A",
        semester: s.currentSemester,
        attendancePercentage: s.attendancePercentage,
        cgpa: s.cgpa,
        verifiedSkills: s.skills.filter((sk) => sk.verified).map((sk) => sk.name),
        verifiedProjectsCount: s.projects.filter((p) => p.status === "VERIFIED" || p.status === "COMPLETED").length,
        internshipStatus: s.internships[0]?.status || "None",
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

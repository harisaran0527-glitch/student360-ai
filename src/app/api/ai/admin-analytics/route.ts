import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  STUDENT_SUPPORT_ENGINE_VERSION,
  INTERNSHIP_REC_ENGINE_VERSION,
  SKILL_GAP_ENGINE_VERSION,
  LEARNING_ROADMAP_ENGINE_VERSION,
  FACULTY_INSIGHTS_ENGINE_VERSION,
} from "@/lib/ai";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const totalStudents = await prisma.studentProfile.count({ where: { isArchived: false } });
    const totalRiskSnapshots = await prisma.studentRiskSnapshot.count();
    const totalInsightSnapshots = await prisma.aIInsightSnapshot.count();
    const totalRecommendationLogs = await prisma.recommendationHistory.count();

    // Support Attention distribution across database
    const highAttentionCount = await prisma.studentRiskSnapshot.count({ where: { attentionLevel: "HIGH_ATTENTION" } });
    const mediumAttentionCount = await prisma.studentRiskSnapshot.count({ where: { attentionLevel: "MEDIUM_ATTENTION" } });
    const lowAttentionCount = await prisma.studentRiskSnapshot.count({ where: { attentionLevel: "LOW_ATTENTION" } });

    // Target Career Role Popularity
    const preferences = await prisma.studentCareerPreference.findMany({
      include: { targetRole: true },
    });

    const rolePopularity: Record<string, number> = {};
    preferences.forEach((p) => {
      const name = p.targetRole.roleName;
      rolePopularity[name] = (rolePopularity[name] || 0) + 1;
    });

    // Recent Snapshot Logs
    const recentSnapshots = await prisma.studentRiskSnapshot.findMany({
      take: 10,
      orderBy: { generatedAt: "desc" },
      include: {
        student: { select: { fullName: true, registerNo: true } },
      },
    });

    return NextResponse.json({
      engineStatus: {
        mode: "Explainable Rule-Based Baseline Engine v1.0",
        mlTrainingPipelineStatus: "ML-Ready (Pipeline Configured in /ml)",
        engines: [
          { name: "Student Support Analysis", version: STUDENT_SUPPORT_ENGINE_VERSION, status: "ACTIVE" },
          { name: "Internship Recommendation", version: INTERNSHIP_REC_ENGINE_VERSION, status: "ACTIVE" },
          { name: "Skill Gap Evaluation", version: SKILL_GAP_ENGINE_VERSION, status: "ACTIVE" },
          { name: "Personalized Roadmap", version: LEARNING_ROADMAP_ENGINE_VERSION, status: "ACTIVE" },
          { name: "Faculty AI Analytics", version: FACULTY_INSIGHTS_ENGINE_VERSION, status: "ACTIVE" },
        ],
      },
      counts: {
        totalStudents,
        totalRiskSnapshots,
        totalInsightSnapshots,
        totalRecommendationLogs,
      },
      supportAttentionDistribution: {
        HIGH_ATTENTION: highAttentionCount,
        MEDIUM_ATTENTION: mediumAttentionCount,
        LOW_ATTENTION: lowAttentionCount,
      },
      popularTargetRoles: Object.entries(rolePopularity).map(([role, count]) => ({ role, count })),
      recentSnapshots: recentSnapshots.map((s) => ({
        id: s.id,
        studentName: s.student.fullName,
        registerNo: s.student.registerNo,
        attentionLevel: s.attentionLevel,
        academicYear: s.academicYear,
        semester: s.semester,
        engineVersion: s.engineVersion,
        generatedAt: s.generatedAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

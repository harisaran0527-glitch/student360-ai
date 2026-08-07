import { evaluateStudentSupportAttention } from "./supportEngine";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { evaluateSkillGapAnalysis } from "./skillGapEngine";

export * from "./engineConfig";
export * from "./supportEngine";
export * from "./internshipEngine";
export * from "./skillGapEngine";
export * from "./roadmapEngine";
export * from "./careerPrepEngine";
export * from "./facultyAiEngine";
export * from "./searchQueryHelper";

// Backward compatibility exports for pre-existing code
export function calculateStudentRiskScore(student: {
  cgpa: number;
  attendancePercentage: number;
}) {
  const result = evaluateStudentSupportAttention({
    attendancePercentage: student.attendancePercentage,
    cgpa: student.cgpa,
    currentSemester: 1,
    academicYear: DEFAULT_ACADEMIC_YEAR,
  });
  return {
    studentId: "",
    registerNo: "",
    fullName: "",
    riskLevel: result.attentionLevel === "HIGH_ATTENTION" ? "HIGH" : result.attentionLevel === "MEDIUM_ATTENTION" ? "MEDIUM" : "LOW",
    riskScore: result.attentionLevel === "HIGH_ATTENTION" ? 80 : result.attentionLevel === "MEDIUM_ATTENTION" ? 45 : 10,
    factors: result.factors,
    recommendations: result.recommendations,
  };
}

export function evaluateSkillGap(targetRole: string, userSkills: string[]) {
  const result = evaluateSkillGapAnalysis({
    targetRoleName: targetRole,
    roleProfile: {
      roleName: targetRole,
      description: targetRole,
      coreSkills: ["React", "Next.js", "Node.js", "TypeScript", "PostgreSQL", "Docker", "Git"],
      recommendedSkills: ["Express", "Tailwind CSS", "Prisma"],
      optionalSkills: ["GraphQL", "Redis"],
      suggestedProjectDomains: ["Web Development"],
      suggestedInternshipDomains: ["Web Development"],
    },
    verifiedSkills: userSkills.map((name, i) => ({ id: `${i}`, name, category: "Technical", level: "Intermediate" })),
    selfReportedSkills: [],
  });

  return {
    targetRole,
    acquiredSkills: result.verifiedExistingSkills.map((s: any) => s.name),
    missingSkills: result.missingCoreSkills,
    matchPercentage: Math.round(
      ((result.metrics.coreSkillsTotal - result.missingCoreSkills.length) / (result.metrics.coreSkillsTotal || 1)) * 100
    ),
  };
}

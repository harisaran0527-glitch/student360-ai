import { FACULTY_INSIGHTS_ENGINE_VERSION } from "./engineConfig";

export interface StudentBatchData {
  id: string;
  registerNo: string;
  fullName: string;
  departmentCode: string;
  batchName: string;
  sectionName?: string;
  semester: number;
  attendancePercentage: number;
  cgpa: number | null;
  verifiedSkills: string[];
  selfReportedSkills: string[];
  internshipStatus?: string | null;
  internshipOverdue?: boolean;
  pendingCertificatesCount: number;
  pendingProjectsCount: number;
  completedProjects: { domain?: string; title: string }[];
  completedInternships: { domain: string; companyName: string }[];
}

export interface BatchSkillGapAnalysisResult {
  targetRole: string;
  studentsAnalyzedCount: number;
  supportAttentionCounts: {
    HIGH_ATTENTION: number;
    MEDIUM_ATTENTION: number;
    LOW_ATTENTION: number;
  };
  overdueInternshipsCount: number;
  verificationBacklogCount: number;
  commonVerifiedSkills: { skill: string; studentCount: number; percentage: number }[];
  commonSelfReportedSkills: { skill: string; studentCount: number; percentage: number }[];
  mostCommonMissingSkills: { skill: string; missingStudentCount: number; missingPercentage: number }[];
  suggestedDepartmentTrainingTopics: string[];
  internshipDomainDistribution: Record<string, number>;
  projectDomainDistribution: Record<string, number>;
  engineVersion: string;
  generatedAt: string;
  limitation: string;
}

export function evaluateBatchSkillGapAndInsights(
  students: StudentBatchData[],
  targetRoleProfile?: {
    roleName: string;
    coreSkills: string[];
    recommendedSkills: string[];
  }
): BatchSkillGapAnalysisResult {
  const roleName = targetRoleProfile?.roleName || "Full Stack Developer";
  const coreSkills = targetRoleProfile?.coreSkills || ["SQL", "JavaScript", "Python", "React", "Git"];

  let highAttention = 0;
  let mediumAttention = 0;
  let lowAttention = 0;
  let overdueInternships = 0;
  let verificationBacklog = 0;

  const verifiedSkillCounts: Record<string, number> = {};
  const selfReportedSkillCounts: Record<string, number> = {};
  const missingCoreCounts: Record<string, number> = {};
  const internshipDomains: Record<string, number> = {};
  const projectDomains: Record<string, number> = {};

  students.forEach((s) => {
    // Attendance & Overdue check
    if (s.attendancePercentage < 70 || s.internshipOverdue) {
      highAttention++;
    } else if (s.attendancePercentage < 75 || s.pendingCertificatesCount > 1) {
      mediumAttention++;
    } else {
      lowAttention++;
    }

    if (s.internshipOverdue) overdueInternships++;
    verificationBacklog += (s.pendingCertificatesCount || 0) + (s.pendingProjectsCount || 0);

    // Verified skills
    const vSkillsLower = s.verifiedSkills.map((k) => k.trim());
    vSkillsLower.forEach((skill) => {
      verifiedSkillCounts[skill] = (verifiedSkillCounts[skill] || 0) + 1;
    });

    // Self-reported skills
    const sSkillsLower = s.selfReportedSkills.map((k) => k.trim());
    sSkillsLower.forEach((skill) => {
      selfReportedSkillCounts[skill] = (selfReportedSkillCounts[skill] || 0) + 1;
    });

    // Missing target role core skills
    coreSkills.forEach((coreSkill) => {
      const hasVerified = vSkillsLower.some(
        (v) => v.toLowerCase().includes(coreSkill.toLowerCase()) || coreSkill.toLowerCase().includes(v.toLowerCase())
      );
      if (!hasVerified) {
        missingCoreCounts[coreSkill] = (missingCoreCounts[coreSkill] || 0) + 1;
      }
    });

    // Internship domains
    s.completedInternships.forEach((i) => {
      const d = i.domain || "Software Development";
      internshipDomains[d] = (internshipDomains[d] || 0) + 1;
    });

    // Project domains
    s.completedProjects.forEach((p) => {
      const d = p.domain || "Web Development";
      projectDomains[d] = (projectDomains[d] || 0) + 1;
    });
  });

  const total = students.length || 1;

  // Format Top Common Verified Skills
  const commonVerifiedSkills = Object.entries(verifiedSkillCounts)
    .map(([skill, count]) => ({
      skill,
      studentCount: count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, 10);

  // Format Top Common Self-Reported Skills
  const commonSelfReportedSkills = Object.entries(selfReportedSkillCounts)
    .map(([skill, count]) => ({
      skill,
      studentCount: count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, 10);

  // Format Most Common Missing Skills
  const mostCommonMissingSkills = Object.entries(missingCoreCounts)
    .map(([skill, count]) => ({
      skill,
      missingStudentCount: count,
      missingPercentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.missingStudentCount - a.missingStudentCount)
    .slice(0, 10);

  // Generate Suggested Department-Level Training Topics
  const suggestedDepartmentTrainingTopics: string[] = [];
  mostCommonMissingSkills.slice(0, 3).forEach((m) => {
    suggestedDepartmentTrainingTopics.push(`${m.skill} Bootcamp & Hands-on Workshop (${m.missingPercentage}% student gap)`);
  });
  if (verificationBacklog > 5) {
    suggestedDepartmentTrainingTopics.push(`Fast-track Verification Drive (${verificationBacklog} pending student submissions)`);
  }
  if (overdueInternships > 0) {
    suggestedDepartmentTrainingTopics.push(`Internship Placement & Compliance Clinic (${overdueInternships} student(s) overdue)`);
  }

  return {
    targetRole: roleName,
    studentsAnalyzedCount: students.length,
    supportAttentionCounts: {
      HIGH_ATTENTION: highAttention,
      MEDIUM_ATTENTION: mediumAttention,
      LOW_ATTENTION: lowAttention,
    },
    overdueInternshipsCount: overdueInternships,
    verificationBacklogCount: verificationBacklog,
    commonVerifiedSkills,
    commonSelfReportedSkills,
    mostCommonMissingSkills,
    suggestedDepartmentTrainingTopics:
      suggestedDepartmentTrainingTopics.length > 0
        ? suggestedDepartmentTrainingTopics
        : ["No major department training gaps identified."],
    internshipDomainDistribution: internshipDomains,
    projectDomainDistribution: projectDomains,
    engineVersion: FACULTY_INSIGHTS_ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    limitation: "Batch insights aggregate anonymized institutional statistics without exposing sensitive student personal attributes.",
  };
}

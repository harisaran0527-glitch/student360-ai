import { SKILL_GAP_ENGINE_VERSION } from "./engineConfig";

export interface SkillGapInput {
  targetRoleName: string;
  roleProfile: {
    roleName: string;
    description: string;
    coreSkills: string[];
    recommendedSkills: string[];
    optionalSkills: string[];
    suggestedProjectDomains: string[];
    suggestedInternshipDomains: string[];
  };
  verifiedSkills: { id: string; name: string; category: string; level: string }[];
  selfReportedSkills: { id: string; name: string; category: string; level: string }[];
}

export interface SkillGapOutput {
  targetRole: string;
  roleDescription: string;
  verifiedExistingSkills: { name: string; category: string; level: string }[];
  selfReportedSkills: { name: string; category: string; level: string }[];
  missingCoreSkills: string[];
  missingRecommendedSkills: string[];
  suggestedNextSkills: string[];
  suggestedProjectDomains: string[];
  suggestedInternshipDomains: string[];
  metrics: {
    coreSkillsTotal: number;
    coreSkillsVerified: number;
    recommendedSkillsTotal: number;
    recommendedSkillsVerified: number;
  };
  engineVersion: string;
  generatedAt: string;
  explanation: string[];
}

export function evaluateSkillGapAnalysis(input: SkillGapInput): SkillGapOutput {
  const { roleProfile, verifiedSkills, selfReportedSkills } = input;

  const verifiedNamesLower = verifiedSkills.map((s) => s.name.toLowerCase().trim());
  const selfReportedNamesLower = selfReportedSkills.map((s) => s.name.toLowerCase().trim());

  // Filter Verified Existing Skills matching the role or general tech stack
  const verifiedExisting = verifiedSkills;
  const selfReportedExisting = selfReportedSkills;

  // Identify Missing Core Skills
  const missingCoreSkills: string[] = [];
  let coreVerifiedCount = 0;

  roleProfile.coreSkills.forEach((coreSkill) => {
    const isVerified = verifiedNamesLower.some(
      (v) => v.includes(coreSkill.toLowerCase()) || coreSkill.toLowerCase().includes(v)
    );
    if (isVerified) {
      coreVerifiedCount++;
    } else {
      missingCoreSkills.push(coreSkill);
    }
  });

  // Identify Missing Recommended Skills
  const missingRecommendedSkills: string[] = [];
  let recommendedVerifiedCount = 0;

  roleProfile.recommendedSkills.forEach((recSkill) => {
    const isVerified = verifiedNamesLower.some(
      (v) => v.includes(recSkill.toLowerCase()) || recSkill.toLowerCase().includes(v)
    );
    if (isVerified) {
      recommendedVerifiedCount++;
    } else {
      missingRecommendedSkills.push(recSkill);
    }
  });

  // Prioritize Suggested Next Skills (missing core first, then missing recommended)
  const suggestedNextSkills = [...missingCoreSkills.slice(0, 3)];
  if (suggestedNextSkills.length < 3) {
    const needed = 3 - suggestedNextSkills.length;
    suggestedNextSkills.push(...missingRecommendedSkills.slice(0, needed));
  }

  const explanation: string[] = [];
  explanation.push(
    `Core Skills: Verified ${coreVerifiedCount} out of ${roleProfile.coreSkills.length} required skills.`
  );
  explanation.push(
    `Recommended Skills: Verified ${recommendedVerifiedCount} out of ${roleProfile.recommendedSkills.length} recommended skills.`
  );

  if (selfReportedSkills.length > 0) {
    explanation.push(
      `Note: ${selfReportedSkills.length} self-reported skill(s) detected. Self-reported skills are displayed separately until backed by verified certificates, projects, or internships.`
    );
  }

  return {
    targetRole: roleProfile.roleName,
    roleDescription: roleProfile.description,
    verifiedExistingSkills: verifiedExisting.map((s) => ({ name: s.name, category: s.category, level: s.level })),
    selfReportedSkills: selfReportedExisting.map((s) => ({ name: s.name, category: s.category, level: s.level })),
    missingCoreSkills,
    missingRecommendedSkills,
    suggestedNextSkills,
    suggestedProjectDomains: roleProfile.suggestedProjectDomains,
    suggestedInternshipDomains: roleProfile.suggestedInternshipDomains,
    metrics: {
      coreSkillsTotal: roleProfile.coreSkills.length,
      coreSkillsVerified: coreVerifiedCount,
      recommendedSkillsTotal: roleProfile.recommendedSkills.length,
      recommendedSkillsVerified: recommendedVerifiedCount,
    },
    engineVersion: SKILL_GAP_ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    explanation,
  };
}

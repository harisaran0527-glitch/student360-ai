import { CAREER_PREP_ENGINE_VERSION } from "./engineConfig";

export interface CareerPrepInput {
  verifiedSkillsCount: number;
  selfReportedSkillsCount: number;
  verifiedProjectsCount: number;
  verifiedInternshipsCount: number;
  verifiedCertificatesCount: number;
  achievementsCount: number;
  placementApplicationsCount: number;
  currentPlacementStage: string | null;
  targetRole: string;
  missingCoreSkills: string[];
  missingRecommendedSkills: string[];
}

export interface CareerPrepOutput {
  summaryMetrics: {
    verifiedSkillsCount: number;
    selfReportedSkillsCount: number;
    verifiedProjectsCount: number;
    verifiedInternshipsCount: number;
    verifiedCertificatesCount: number;
    achievementsCount: number;
    placementApplicationsCount: number;
    currentPlacementStage: string;
  };
  targetRole: string;
  missingTargetSkills: {
    missingCoreSkills: string[];
    missingRecommendedSkills: string[];
  };
  actionableSuggestions: string[];
  engineVersion: string;
  generatedAt: string;
  limitation: string;
}

export function evaluateCareerPreparationInsights(
  input: CareerPrepInput
): CareerPrepOutput {
  const suggestions: string[] = [];

  // Skill evidence suggestion
  if (input.verifiedSkillsCount === 0) {
    suggestions.push(
      "Your profile currently has zero verified skills. Upload supporting course certificates or projects to earn verified skill badges."
    );
  } else if (input.missingCoreSkills.length > 0) {
    suggestions.push(
      `Acquire verified evidence for top missing target-role skills: ${input.missingCoreSkills.join(", ")}.`
    );
  }

  // Project evidence suggestion
  if (input.verifiedProjectsCount === 0) {
    suggestions.push(
      `Complete and verify at least one project aligned with ${input.targetRole} to showcase practical implementation skills.`
    );
  } else {
    suggestions.push(
      `You have ${input.verifiedProjectsCount} verified project(s). Ensure project documentation includes live URLs and GitHub repository links.`
    );
  }

  // Internship evidence suggestion
  if (input.verifiedInternshipsCount === 0) {
    suggestions.push(
      `Your profile currently has no verified industry internship evidence. Apply for ${input.targetRole} internship opportunities.`
    );
  } else {
    suggestions.push(
      `Verified internship history supports your portfolio readiness for ${input.targetRole}.`
    );
  }

  // Certificate evidence suggestion
  if (input.verifiedCertificatesCount === 0) {
    suggestions.push(
      "Obtain institutional or industry certifications to validate your core competencies."
    );
  }

  // Self-reported vs Verified distinction note
  if (input.selfReportedSkillsCount > 0) {
    suggestions.push(
      `You have ${input.selfReportedSkillsCount} self-reported skill(s). Link these to verified certificates or projects to convert them into verified competencies.`
    );
  }

  return {
    summaryMetrics: {
      verifiedSkillsCount: input.verifiedSkillsCount,
      selfReportedSkillsCount: input.selfReportedSkillsCount,
      verifiedProjectsCount: input.verifiedProjectsCount,
      verifiedInternshipsCount: input.verifiedInternshipsCount,
      verifiedCertificatesCount: input.verifiedCertificatesCount,
      achievementsCount: input.achievementsCount,
      placementApplicationsCount: input.placementApplicationsCount,
      currentPlacementStage: input.currentPlacementStage || "Not Applied",
    },
    targetRole: input.targetRole,
    missingTargetSkills: {
      missingCoreSkills: input.missingCoreSkills,
      missingRecommendedSkills: input.missingRecommendedSkills,
    },
    actionableSuggestions: suggestions,
    engineVersion: CAREER_PREP_ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    limitation: "All insights are derived strictly from factual Student360 records without arbitrary score modeling.",
  };
}

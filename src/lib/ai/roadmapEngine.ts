import { LEARNING_ROADMAP_ENGINE_VERSION } from "./engineConfig";

export interface LearningRoadmapInput {
  targetRole: string;
  currentSemester: number;
  verifiedSkills: string[];
  missingCoreSkills: string[];
  missingRecommendedSkills: string[];
  verifiedProjects: { title: string; category?: string; techStack: string }[];
  verifiedInternships: { role: string; domain: string; companyName: string }[];
}

export interface RoadmapPhase {
  phaseNumber: number;
  title: string;
  skillOrObjective: string;
  whyRecommended: string;
  suggestedEvidence: string;
  completionStatus: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";
}

export interface LearningRoadmapOutput {
  targetRole: string;
  currentSemester: number;
  phases: RoadmapPhase[];
  engineVersion: string;
  generatedAt: string;
  limitation: string;
}

export function generatePersonalizedRoadmap(
  input: LearningRoadmapInput
): LearningRoadmapOutput {
  const verifiedLower = input.verifiedSkills.map((s) => s.toLowerCase());

  const missingCore = input.missingCoreSkills;
  const missingRec = input.missingRecommendedSkills;

  const phases: RoadmapPhase[] = [];

  // Phase 1: Core Skill Baseline
  const phase1Skill = missingCore[0] || (input.verifiedSkills[0] ? `${input.verifiedSkills[0]} Advanced` : "Core Fundamentals");
  const p1Completed = missingCore.length === 0 || verifiedLower.includes(phase1Skill.toLowerCase());
  phases.push({
    phaseNumber: 1,
    title: "Phase 1: Foundational Core Mastery",
    skillOrObjective: `Master ${phase1Skill}`,
    whyRecommended: `Core skill required for ${input.targetRole} role profile.`,
    suggestedEvidence: `Complete a verified course certification or complete lab coursework for ${phase1Skill}.`,
    completionStatus: p1Completed ? "COMPLETED" : "NOT_STARTED",
  });

  // Phase 2: Secondary Skill & Tooling
  const phase2Skill = missingCore[1] || missingRec[0] || "Data Tools & Version Control";
  const p2Completed = verifiedLower.includes(phase2Skill.toLowerCase());
  phases.push({
    phaseNumber: 2,
    title: "Phase 2: Applied Competency & Tooling",
    skillOrObjective: `Develop proficiency in ${phase2Skill}`,
    whyRecommended: `Bridging essential skill gap identified for ${input.targetRole}.`,
    suggestedEvidence: `Upload an institutional or industry certificate verifying ${phase2Skill}.`,
    completionStatus: p2Completed ? "COMPLETED" : p1Completed ? "IN_PROGRESS" : "NOT_STARTED",
  });

  // Phase 3: Practical Domain Project Implementation
  const p3Completed = input.verifiedProjects.length > 0;
  const projectTech = missingCore.slice(0, 2).join(" & ") || phase1Skill;
  phases.push({
    phaseNumber: 3,
    title: "Phase 3: Domain Portfolio Project",
    skillOrObjective: `Build and showcase a verified project incorporating ${projectTech}`,
    whyRecommended: `Demonstrates applied practical implementation required by placement recruiters.`,
    suggestedEvidence: "Submit GitHub repo link, live demo URL, and faculty evaluation for project verification.",
    completionStatus: p3Completed ? "COMPLETED" : "IN_PROGRESS",
  });

  // Phase 4: Advanced Tooling & Industry Certification
  const phase4Skill = missingRec[1] || missingRec[0] || "Cloud & Production Deployment";
  const p4Completed = verifiedLower.includes(phase4Skill.toLowerCase());
  phases.push({
    phaseNumber: 4,
    title: "Phase 4: Advanced Specialization",
    skillOrObjective: `Gain specialization in ${phase4Skill}`,
    whyRecommended: "Differentiates your digital portfolio during technical placement rounds.",
    suggestedEvidence: `Earn an external NPTEL, Coursera, AWS, or Microsoft certification in ${phase4Skill}.`,
    completionStatus: p4Completed ? "COMPLETED" : "NOT_STARTED",
  });

  // Phase 5: Industry Internship & Placement Readiness
  const p5Completed = input.verifiedInternships.length > 0;
  phases.push({
    phaseNumber: 5,
    title: "Phase 5: Industrial Internship & Placement",
    skillOrObjective: `Apply for ${input.targetRole} internships & placement drives`,
    whyRecommended: `Fulfills academic semester requirement and validates industry readiness.`,
    suggestedEvidence: "Submit verified Internship Completion Certificate & Mentor Feedback.",
    completionStatus: p5Completed ? "COMPLETED" : "NOT_STARTED",
  });

  return {
    targetRole: input.targetRole,
    currentSemester: input.currentSemester,
    phases,
    engineVersion: LEARNING_ROADMAP_ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    limitation: "Roadmap steps are dynamically mapped from missing target-role core skills and verified student portfolio evidence.",
  };
}

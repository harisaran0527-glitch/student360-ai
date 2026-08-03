import { INTERNSHIP_REC_ENGINE_VERSION } from "./engineConfig";

export interface StudentInternshipInput {
  verifiedSkills: string[];
  selfReportedSkills: string[];
  projects: { id: string; title: string; category?: string; domain?: string; techStack: string; verified: boolean }[];
  certificates: { id: string; title: string; category?: string; issuingBody: string; skillsGained?: string; verified: boolean }[];
  previousInternships: { id: string; companyName: string; role: string; domain: string; status: string }[];
  departmentCode: string;
  interests?: string;
  targetRoleName?: string;
}

export interface DomainMatch {
  domain: string;
  matchCategory: "STRONG_MATCH" | "MODERATE_MATCH" | "EXPLORATORY_MATCH";
  verifiedSkillMatchesCount: number;
  totalDomainCoreSkillsCount: number;
  matchingVerifiedSkills: string[];
  matchingSelfReportedSkills: string[];
  supportingProjectEvidence: { title: string; domain: string }[];
  supportingCertificateEvidence: { title: string; issuingBody: string }[];
  previousInternshipEvidence: { companyName: string; role: string; domain: string }[];
  missingSkills: string[];
  recommendedNextAction: string;
  explanation: string[];
}

export interface InternshipRecommendationOutput {
  topRecommendations: DomainMatch[];
  engineVersion: string;
  generatedAt: string;
  limitation: string;
}

const DOMAIN_SKILL_PROFILES: Record<string, { coreSkills: string[]; keywords: string[] }> = {
  "Machine Learning": {
    coreSkills: ["Python", "PyTorch", "TensorFlow", "Scikit-Learn", "Machine Learning", "Math/Statistics"],
    keywords: ["ml", "machine learning", "sklearn", "pytorch", "tensorflow", "model", "scikit"],
  },
  "Artificial Intelligence": {
    coreSkills: ["Python", "Generative AI", "LLMs", "NLP", "PyTorch", "Prompt Engineering"],
    keywords: ["ai", "nlp", "llm", "deep learning", "langchain", "neural", "artificial intelligence"],
  },
  "Data Science": {
    coreSkills: ["Python", "SQL", "Pandas", "NumPy", "Machine Learning", "Statistics"],
    keywords: ["data science", "pandas", "numpy", "statistics", "data analysis", "r"],
  },
  "Data Analytics": {
    coreSkills: ["SQL", "Excel", "Power BI", "Tableau", "Python", "Data Visualization"],
    keywords: ["analytics", "sql", "excel", "powerbi", "tableau", "visualization", "dashboard"],
  },
  "Web Development": {
    coreSkills: ["HTML", "CSS", "JavaScript", "React", "TypeScript", "Git"],
    keywords: ["html", "css", "javascript", "react", "frontend", "web", "tailwaind"],
  },
  "Full Stack Development": {
    coreSkills: ["JavaScript", "TypeScript", "React", "Next.js", "Node.js", "SQL", "PostgreSQL"],
    keywords: ["fullstack", "full stack", "next.js", "node.js", "express", "prisma", "mongodb"],
  },
  "Mobile Development": {
    coreSkills: ["React Native", "Flutter", "Kotlin", "Swift", "REST API", "Mobile UI"],
    keywords: ["mobile", "react native", "flutter", "kotlin", "swift", "android", "ios"],
  },
  "Cloud Computing": {
    coreSkills: ["AWS", "Docker", "Linux", "Kubernetes", "Cloud Architecture", "CI/CD"],
    keywords: ["aws", "cloud", "docker", "kubernetes", "devops", "linux", "azure"],
  },
  "Cyber Security": {
    coreSkills: ["Network Security", "Linux", "Ethical Hacking", "Cryptography", "Wireshark"],
    keywords: ["security", "cyber", "hacking", "network", "cryptography", "wireshark", "penetration"],
  },
  "Software Development": {
    coreSkills: ["Data Structures", "Algorithms", "Java", "C++", "Python", "Git", "OOP"],
    keywords: ["software", "java", "c++", "dsa", "algorithms", "oop", "system design"],
  },
  "Database": {
    coreSkills: ["SQL", "PostgreSQL", "MySQL", "MongoDB", "Database Design", "Redis"],
    keywords: ["database", "sql", "postgresql", "mysql", "mongodb", "redis", "schema"],
  },
  "UI/UX": {
    coreSkills: ["Figma", "UI Design", "UX Research", "Wireframing", "Prototyping"],
    keywords: ["ui", "ux", "figma", "wireframe", "design", "prototype", "user experience"],
  },
  "Research": {
    coreSkills: ["Python", "Literature Review", "Data Analysis", "Academic Writing", "Statistics"],
    keywords: ["research", "paper", "academic", "study", "analysis", "thesis"],
  },
};

export function evaluateInternshipRecommendations(
  input: StudentInternshipInput
): InternshipRecommendationOutput {
  const verifiedLower = input.verifiedSkills.map((s) => s.toLowerCase());
  const selfReportedLower = input.selfReportedSkills.map((s) => s.toLowerCase());

  const results: DomainMatch[] = [];

  for (const [domainName, profile] of Object.entries(DOMAIN_SKILL_PROFILES)) {
    const matchingVerified: string[] = [];
    const missing: string[] = [];

    profile.coreSkills.forEach((skill) => {
      if (verifiedLower.some((v) => v.includes(skill.toLowerCase()) || skill.toLowerCase().includes(v))) {
        matchingVerified.push(skill);
      } else {
        missing.push(skill);
      }
    });

    const matchingSelfReported: string[] = [];
    profile.coreSkills.forEach((skill) => {
      if (
        !matchingVerified.includes(skill) &&
        selfReportedLower.some((s) => s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s))
      ) {
        matchingSelfReported.push(skill);
      }
    });

    // Supporting Project Evidence
    const supportingProjects = input.projects
      .filter((p) => {
        const text = `${p.title} ${p.category || ""} ${p.domain || ""} ${p.techStack}`.toLowerCase();
        return profile.keywords.some((kw) => text.includes(kw));
      })
      .map((p) => ({ title: p.title, domain: p.domain || domainName }));

    // Supporting Certificate Evidence
    const supportingCerts = input.certificates
      .filter((c) => {
        const text = `${c.title} ${c.category || ""} ${c.skillsGained || ""}`.toLowerCase();
        return profile.keywords.some((kw) => text.includes(kw));
      })
      .map((c) => ({ title: c.title, issuingBody: c.issuingBody }));

    // Supporting Previous Internships
    const supportingInternships = input.previousInternships
      .filter((i) => {
        const text = `${i.role} ${i.domain} ${i.companyName}`.toLowerCase();
        return profile.keywords.some((kw) => text.includes(kw));
      })
      .map((i) => ({ companyName: i.companyName, role: i.role, domain: i.domain }));

    // Deterministic Match Calculation
    const verifiedScore = matchingVerified.length;
    const projectScore = supportingProjects.length;
    const certScore = supportingCerts.length;
    const internshipScore = supportingInternships.length;

    let matchCategory: "STRONG_MATCH" | "MODERATE_MATCH" | "EXPLORATORY_MATCH" = "EXPLORATORY_MATCH";

    if (verifiedScore >= 3 || (verifiedScore >= 2 && (projectScore > 0 || certScore > 0 || internshipScore > 0))) {
      matchCategory = "STRONG_MATCH";
    } else if (verifiedScore >= 1 || matchingSelfReported.length >= 2 || projectScore > 0 || certScore > 0) {
      matchCategory = "MODERATE_MATCH";
    }

    const explanation: string[] = [];
    explanation.push(`Verified required skill matches: ${verifiedScore} out of ${profile.coreSkills.length}`);
    if (projectScore > 0) explanation.push(`Verified project evidence: ${projectScore} project(s) found`);
    if (certScore > 0) explanation.push(`Verified certificate evidence: ${certScore} certificate(s) found`);
    if (internshipScore > 0) explanation.push(`Previous internship evidence: ${internshipScore} internship(s) found`);
    if (matchingSelfReported.length > 0) {
      explanation.push(`Self-reported skills present: ${matchingSelfReported.join(", ")} (pending verification)`);
    }

    let nextAction = `Complete one verified project or certificate in ${domainName}.`;
    if (missing.length > 0) {
      nextAction = `Acquire verified skill evidence for: ${missing.slice(0, 2).join(", ")}.`;
    }

    results.push({
      domain: domainName,
      matchCategory,
      verifiedSkillMatchesCount: verifiedScore,
      totalDomainCoreSkillsCount: profile.coreSkills.length,
      matchingVerifiedSkills: matchingVerified,
      matchingSelfReportedSkills: matchingSelfReported,
      supportingProjectEvidence: supportingProjects,
      supportingCertificateEvidence: supportingCerts,
      previousInternshipEvidence: supportingInternships,
      missingSkills: missing,
      recommendedNextAction: nextAction,
      explanation,
    });
  }

  // Sort results: Strong match first, then Moderate match, then Exploratory match
  results.sort((a, b) => {
    const categoryOrder = { STRONG_MATCH: 3, MODERATE_MATCH: 2, EXPLORATORY_MATCH: 1 };
    if (categoryOrder[b.matchCategory] !== categoryOrder[a.matchCategory]) {
      return categoryOrder[b.matchCategory] - categoryOrder[a.matchCategory];
    }
    return b.verifiedSkillMatchesCount - a.verifiedSkillMatchesCount;
  });

  return {
    topRecommendations: results,
    engineVersion: INTERNSHIP_REC_ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    limitation: "Domain matching is calculated via deterministic evidence graph mapping. Excludes self-reported skills from official verified counts.",
  };
}

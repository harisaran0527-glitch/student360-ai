import { STUDENT_SUPPORT_ENGINE_VERSION } from "./engineConfig";

export interface StudentSupportInputData {
  attendancePercentage: number;
  subjectShortages?: { courseCode: string; courseTitle: string; percentage: number }[];
  cgpa?: number | null;
  currentSemester: number;
  academicYear: string;
  internshipRequiredForSemester?: boolean;
  internshipStatus?: string | null; // e.g. "APPROVED", "SUBMITTED_FOR_APPROVAL", null
  internshipDeadline?: string | null;
  pendingInternshipDocs?: number;
  pendingVerifications?: number; // pending certificates, projects, ODs
  completedProjectsCount?: number;
}

export interface SupportAttentionResult {
  attentionLevel: "LOW_ATTENTION" | "MEDIUM_ATTENTION" | "HIGH_ATTENTION";
  factors: string[];
  inputsUsed: {
    overallAttendancePercentage: number;
    subjectShortagesCount: number;
    cgpa: number | null;
    currentSemester: number;
    academicYear: string;
    internshipRequired: boolean;
    internshipCompleted: boolean;
    internshipOverdue: boolean;
    pendingInternshipDocsCount: number;
    pendingVerificationsCount: number;
    completedProjectsCount: number;
  };
  recommendations: string[];
  limitation: string;
  engineVersion: string;
  generatedAt: string;
}

export function evaluateStudentSupportAttention(
  input: StudentSupportInputData
): SupportAttentionResult {
  const factors: string[] = [];
  const recommendations: string[] = [];
  let issueSeverityScore = 0;

  const attendance = input.attendancePercentage || 0;
  const shortages = input.subjectShortages || [];
  const cgpa = input.cgpa ?? null;
  const pendingDocs = input.pendingInternshipDocs || 0;
  const pendingVerif = input.pendingVerifications || 0;
  const completedProjects = input.completedProjectsCount || 0;

  // 1. Overall Attendance Factor
  if (attendance < 70) {
    issueSeverityScore += 40;
    factors.push(`Overall attendance is ${attendance.toFixed(1)}% (below critical 70% threshold).`);
    recommendations.push("Arrange immediate academic counseling and attendance review session.");
  } else if (attendance < 75) {
    issueSeverityScore += 25;
    factors.push(`Overall attendance is ${attendance.toFixed(1)}% (below mandatory 75% threshold).`);
    recommendations.push("Monitor daily class attendance and submit OD/Medical documentation if applicable.");
  } else if (attendance < 80) {
    issueSeverityScore += 10;
    factors.push(`Overall attendance is ${attendance.toFixed(1)}% (borderline attendance range).`);
  }

  // 2. Subject-wise Shortage Factor
  if (shortages.length > 0) {
    issueSeverityScore += shortages.length * 10;
    const courseCodes = shortages.map((s) => `${s.courseCode} (${s.percentage.toFixed(1)}%)`).join(", ");
    factors.push(`Attendance below 75% in ${shortages.length} course(s): ${courseCodes}.`);
    recommendations.push(`Focus attendance recovery in specific subject(s): ${shortages.map(s => s.courseCode).join(", ")}.`);
  }

  // 3. CGPA / SGPA Factor
  if (cgpa !== null && cgpa < 6.0) {
    issueSeverityScore += 30;
    factors.push(`Current CGPA is ${cgpa.toFixed(2)} (< 6.0 threshold).`);
    recommendations.push("Assign faculty mentor for core subject remedial classes.");
  } else if (cgpa !== null && cgpa < 7.0) {
    issueSeverityScore += 10;
    factors.push(`Current CGPA is ${cgpa.toFixed(2)} (Moderate performance range).`);
  }

  // 4. Internship Semester Requirement Factor
  const internshipRequired = Boolean(input.internshipRequiredForSemester);
  const internshipCompleted = input.internshipStatus === "APPROVED" || input.internshipStatus === "COMPLETED";
  
  let internshipOverdue = false;
  if (internshipRequired && !internshipCompleted) {
    if (input.internshipDeadline) {
      const deadlineDate = new Date(input.internshipDeadline);
      if (deadlineDate < new Date()) {
        internshipOverdue = true;
      }
    }
    if (internshipOverdue) {
      issueSeverityScore += 35;
      factors.push("Required semester internship completion is currently overdue.");
      recommendations.push("Submit pending internship offer letter or completion documents for verification immediately.");
    } else {
      issueSeverityScore += 15;
      factors.push("Required semester internship requirement is currently incomplete.");
      recommendations.push("Apply for eligible internship opportunities or upload current internship NOC.");
    }
  }

  // 5. Pending Documents & Verifications
  if (pendingDocs > 0) {
    issueSeverityScore += pendingDocs * 5;
    factors.push(`${pendingDocs} pending internship document(s) awaiting upload or verification.`);
  }
  if (pendingVerif > 0) {
    issueSeverityScore += pendingVerif * 5;
    factors.push(`${pendingVerif} pending certificate/project verification request(s).`);
  }

  // Determine Attention Category
  let attentionLevel: "LOW_ATTENTION" | "MEDIUM_ATTENTION" | "HIGH_ATTENTION" = "LOW_ATTENTION";
  if (issueSeverityScore >= 45 || (attendance < 70 && internshipOverdue)) {
    attentionLevel = "HIGH_ATTENTION";
  } else if (issueSeverityScore >= 15 || shortages.length > 0 || pendingDocs > 1) {
    attentionLevel = "MEDIUM_ATTENTION";
  }

  if (attentionLevel === "LOW_ATTENTION") {
    factors.push("Student is meeting all core attendance, academic, and administrative compliance thresholds.");
    recommendations.push("Student is on track. Encourage participation in domain hackathons & advanced certifications.");
  }

  return {
    attentionLevel,
    factors: factors.length > 0 ? factors : ["No support attention factors identified."],
    inputsUsed: {
      overallAttendancePercentage: attendance,
      subjectShortagesCount: shortages.length,
      cgpa,
      currentSemester: input.currentSemester,
      academicYear: input.academicYear,
      internshipRequired,
      internshipCompleted,
      internshipOverdue,
      pendingInternshipDocsCount: pendingDocs,
      pendingVerificationsCount: pendingVerif,
      completedProjectsCount: completedProjects,
    },
    recommendations,
    limitation: "Calculated using rule-based institutional threshold parameters. Results reflect verified academic logs.",
    engineVersion: STUDENT_SUPPORT_ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

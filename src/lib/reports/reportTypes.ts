export type ReportCategory =
  | "STUDENT_MASTER"
  | "ATTENDANCE"
  | "ACADEMIC"
  | "INTERNSHIP"
  | "CERTIFICATE"
  | "ACHIEVEMENT"
  | "PROJECT"
  | "SKILL"
  | "PLACEMENT"
  | "ALUMNI"
  | "COMPLIANCE"
  | "AI_INSIGHT"
  | "AUDIT";

export interface ReportDefinition {
  id: string;
  category: ReportCategory;
  name: string;
  description: string;
  allowedFilters: (
    | "academicYear"
    | "batchId"
    | "departmentId"
    | "sectionId"
    | "semester"
    | "academicStatus"
    | "dateRange"
    | "verificationStatus"
    | "internshipStatus"
    | "attendanceStatus"
    | "placementStatus"
    | "projectType"
    | "certificateCategory"
    | "achievementCategory"
    | "targetRoleId"
  )[];
}

export interface GlobalReportFilters {
  academicYear?: string;
  batchId?: string;
  departmentId?: string;
  sectionId?: string;
  semester?: number;
  academicStatus?: string;
  startDate?: string;
  endDate?: string;
  verificationStatus?: string;
  internshipStatus?: string;
  attendanceStatus?: string;
  placementStatus?: string;
  projectType?: string;
  certificateCategory?: string;
  achievementCategory?: string;
  targetRoleId?: string;
  includeSensitiveData?: boolean; // Restricted permission required
}

export interface ReportQueryResult {
  reportId: string;
  reportName: string;
  category: ReportCategory;
  generatedAt: string;
  appliedFilters: Record<string, any>;
  totalRows: number;
  columns: { key: string; label: string }[];
  rows: Record<string, any>[];
  summaryMetrics?: Record<string, any>;
}

export const REPORT_CATALOG: ReportDefinition[] = [
  // 1. Student Master Reports
  {
    id: "STUDENT_MASTER_FULL",
    category: "STUDENT_MASTER",
    name: "Student Master Record Directory",
    description: "Complete list of active student master records with academic status and enrolment metadata.",
    allowedFilters: ["academicYear", "batchId", "departmentId", "sectionId", "semester", "academicStatus"],
  },

  // 2. Attendance Reports
  {
    id: "ATTENDANCE_DAILY",
    category: "ATTENDANCE",
    name: "Daily Attendance Session Report",
    description: "Daily session-wise attendance logs, present counts, absent counts, and OD entries.",
    allowedFilters: ["academicYear", "departmentId", "sectionId", "dateRange"],
  },
  {
    id: "ATTENDANCE_SHORTAGE",
    category: "ATTENDANCE",
    name: "Attendance Shortage & Threshold Report",
    description: "Students with effective attendance percentage below mandatory institutional policy threshold.",
    allowedFilters: ["academicYear", "batchId", "departmentId", "sectionId", "semester"],
  },
  {
    id: "ATTENDANCE_OD",
    category: "ATTENDANCE",
    name: "On-Duty (OD) Record Report",
    description: "On-duty logs for hackathons, paper presentations, and sports activities with approval status.",
    allowedFilters: ["academicYear", "departmentId", "verificationStatus", "dateRange"],
  },

  // 3. Academic Reports
  {
    id: "ACADEMIC_SEMESTER_RESULT",
    category: "ACADEMIC",
    name: "Semester SGPA & CGPA Result Report",
    description: "Academic performance results including SGPA, CGPA, credits earned, and pass/fail counts.",
    allowedFilters: ["academicYear", "batchId", "departmentId", "semester"],
  },

  // 4. Internship Reports
  {
    id: "INTERNSHIP_COMPLIANCE",
    category: "INTERNSHIP",
    name: "Required Internship Compliance Report",
    description: "Tracks semester-mandatory internship completion, pending NOCs, offer letters, and reports.",
    allowedFilters: ["academicYear", "batchId", "departmentId", "semester", "internshipStatus"],
  },
  {
    id: "INTERNSHIP_DOMAIN",
    category: "INTERNSHIP",
    name: "Domain-Wise & Company Internship Report",
    description: "Breakdown of student internships grouped by technical domain, company, and stipend type.",
    allowedFilters: ["academicYear", "batchId", "departmentId", "internshipStatus"],
  },

  // 5. Certificate Reports
  {
    id: "CERTIFICATE_VERIFIED",
    category: "CERTIFICATE",
    name: "Verified Certificate & Skill Vault Report",
    description: "Approved course certifications with issuing bodies, skills gained, and verification status.",
    allowedFilters: ["academicYear", "batchId", "departmentId", "certificateCategory", "verificationStatus"],
  },

  // 6. Achievement Reports
  {
    id: "ACHIEVEMENT_PARTICIPATION",
    category: "ACHIEVEMENT",
    name: "Student Achievement & Hackathon Report",
    description: "Competition awards, hackathon positions, paper presentations, and prize details.",
    allowedFilters: ["academicYear", "batchId", "departmentId", "achievementCategory", "verificationStatus"],
  },

  // 7. Project Reports
  {
    id: "PROJECT_TECHNOLOGY",
    category: "PROJECT",
    name: "Project Technology Stack & Domain Report",
    description: "Unique student capstone & mini projects categorized by tech stack, domain, and mentor.",
    allowedFilters: ["academicYear", "batchId", "departmentId", "projectType", "verificationStatus"],
  },

  // 8. Skill Reports
  {
    id: "SKILL_DISTRIBUTION",
    category: "SKILL",
    name: "Department & Batch Skill Distribution Report",
    description: "Distinct breakdown comparing Verified Skills Passport data against Self-Reported skills.",
    allowedFilters: ["batchId", "departmentId", "targetRoleId"],
  },

  // 9. Placement Reports
  {
    id: "PLACEMENT_PIPELINE",
    category: "PLACEMENT",
    name: "Placement Drive & Selection Pipeline Report",
    description: "Tracks drive applications, shortlists, interview rounds, offers received, and placed students.",
    allowedFilters: ["batchId", "departmentId", "placementStatus"],
  },

  // 10. Alumni Reports
  {
    id: "ALUMNI_DIRECTORY",
    category: "ALUMNI",
    name: "Alumni Directory & Career Track Report",
    description: "Graduated alumni records, current employment roles, higher studies, and locations.",
    allowedFilters: ["departmentId"],
  },

  // 11. Compliance Reports
  {
    id: "COMPLIANCE_NON_COMPLETION",
    category: "COMPLIANCE",
    name: "Institutional Compliance Non-Completion Report",
    description: "Audit list of student compliance tickets, missing required documents, and pending tasks.",
    allowedFilters: ["academicYear", "batchId", "departmentId", "semester"],
  },

  // 12. AI Insight Reports
  {
    id: "AI_INSIGHT_SUPPORT_ATTENTION",
    category: "AI_INSIGHT",
    name: "AI Student Support Attention & Skill Gap Report",
    description: "Rule-based Engine v1.0 support attention levels, contributing factors, and skill gap metrics.",
    allowedFilters: ["academicYear", "batchId", "departmentId", "semester", "targetRoleId"],
  },

  // 13. Audit Reports
  {
    id: "AUDIT_RECORD_LOGS",
    category: "AUDIT",
    name: "System Audit & Master Record Change Report",
    description: "Security audit logs of master record edits, attendance corrections, and approval actions.",
    allowedFilters: ["dateRange"],
  },
];

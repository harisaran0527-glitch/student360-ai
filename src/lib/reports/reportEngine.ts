import { prisma } from "@/lib/prisma";
import { GlobalReportFilters, ReportQueryResult, REPORT_CATALOG } from "./reportTypes";

export async function executeReportQuery(
  reportId: string,
  filters: GlobalReportFilters,
  userRole: string,
  userDepartmentId?: string
): Promise<ReportQueryResult> {
  const reportDef = REPORT_CATALOG.find((r) => r.id === reportId);
  if (!reportDef) throw new Error(`Invalid report ID: ${reportId}`);

  // Base scope filter for Student Profile queries
  const studentWhere: any = {};
  
  // Role scope access control
  if (userRole === "FACULTY" && userDepartmentId) {
    studentWhere.departmentId = userDepartmentId;
  }
  if (filters.departmentId) studentWhere.departmentId = filters.departmentId;
  if (filters.batchId) studentWhere.batchId = filters.batchId;
  if (filters.sectionId) studentWhere.sectionId = filters.sectionId;
  if (filters.academicYear && filters.academicYear !== "ALL") studentWhere.academicYear = filters.academicYear;
  if (filters.semester) studentWhere.currentSemester = filters.semester;
  if (filters.academicStatus) studentWhere.academicStatus = filters.academicStatus;

  // Sensitive data check
  const includeSensitive = Boolean(filters.includeSensitiveData) && (userRole === "ADMIN" || userRole === "SUPER_ADMIN");

  switch (reportId) {
    // 1. Student Master Directory Report
    case "STUDENT_MASTER_FULL": {
      const students = await prisma.studentProfile.findMany({
        where: studentWhere,
        include: { department: true, batch: true, section: true },
        orderBy: { registerNo: "asc" },
      });

      const columns = [
        { key: "registerNo", label: "Register No" },
        { key: "rollNo", label: "Roll No" },
        { key: "admissionNo", label: "Admission No" },
        { key: "fullName", label: "Student Name" },
        { key: "departmentCode", label: "Department" },
        { key: "batchName", label: "Batch" },
        { key: "sectionName", label: "Section" },
        { key: "academicYear", label: "Academic Year" },
        { key: "semester", label: "Current Semester" },
        { key: "academicStatus", label: "Academic Status" },
        { key: "admissionQuotaLabel", label: "Admission Quota" },
        { key: "entryType", label: "Entry Type" },
        { key: "residenceType", label: "Residence Type" },
        { key: "admissionDate", label: "Admission Date" },
        { key: "cgpa", label: "CGPA" },
        { key: "attendancePercentage", label: "Attendance %" },
      ];

      if (includeSensitive) {
        columns.push(
          { key: "aadharNo", label: "Aadhaar No [RESTRICTED]" },
          { key: "phone", label: "Phone No [RESTRICTED]" },
          { key: "email", label: "Email [RESTRICTED]" }
        );
      }

      const rows = students.map((s) => ({
        registerNo: s.registerNo,
        rollNo: s.rollNo,
        admissionNo: s.admissionNo,
        fullName: s.fullName,
        departmentCode: s.department.code,
        batchName: s.batch.name,
        sectionName: s.section?.name || "Unassigned",
        academicYear: s.academicYear,
        semester: s.currentSemester,
        academicStatus: s.academicStatus,
        admissionQuotaLabel: s.admissionQuota === "GQ" ? "Government Quota" : s.admissionQuota === "MQ" ? "Management Quota" : "Not Assigned",
        entryType: s.entryType,
        residenceType: s.residenceType,
        admissionDate: s.admissionDate,
        cgpa: s.cgpa.toFixed(2),
        attendancePercentage: `${s.attendancePercentage.toFixed(1)}%`,
        ...(includeSensitive
          ? {
              aadharNo: s.aadharNo || "N/A",
              phone: s.phone || "N/A",
              email: s.email,
            }
          : {}),
      }));

      return {
        reportId,
        reportName: reportDef.name,
        category: reportDef.category,
        generatedAt: new Date().toISOString(),
        appliedFilters: filters,
        totalRows: rows.length,
        columns,
        rows,
        summaryMetrics: {
          totalStudents: rows.length,
          pursuingCount: students.filter((s) => s.academicStatus === "PURSUING").length,
          avgCgpa: (students.reduce((acc, curr) => acc + curr.cgpa, 0) / (students.length || 1)).toFixed(2),
          avgAttendance: (students.reduce((acc, curr) => acc + curr.attendancePercentage, 0) / (students.length || 1)).toFixed(1),
        },
      };
    }

    // 2. Attendance Shortage Report
    case "ATTENDANCE_SHORTAGE": {
      const policy = (await prisma.attendancePolicy.findFirst()) || { minAttendancePercentage: 75.0 };
      const minThreshold = policy.minAttendancePercentage;

      studentWhere.attendancePercentage = { lt: minThreshold };

      const shortageStudents = await prisma.studentProfile.findMany({
        where: studentWhere,
        include: { department: true, batch: true, section: true },
        orderBy: { attendancePercentage: "asc" },
      });

      const columns = [
        { key: "registerNo", label: "Register No" },
        { key: "fullName", label: "Student Name" },
        { key: "departmentCode", label: "Department" },
        { key: "batchName", label: "Batch" },
        { key: "semester", label: "Semester" },
        { key: "attendancePercentage", label: "Effective Attendance %" },
        { key: "minThreshold", label: "Policy Threshold %" },
        { key: "shortageMargin", label: "Shortage Margin %" },
      ];

      const rows = shortageStudents.map((s) => ({
        registerNo: s.registerNo,
        fullName: s.fullName,
        departmentCode: s.department.code,
        batchName: s.batch.name,
        semester: s.currentSemester,
        attendancePercentage: `${s.attendancePercentage.toFixed(1)}%`,
        minThreshold: `${minThreshold.toFixed(1)}%`,
        shortageMargin: `${(minThreshold - s.attendancePercentage).toFixed(1)}%`,
      }));

      return {
        reportId,
        reportName: reportDef.name,
        category: reportDef.category,
        generatedAt: new Date().toISOString(),
        appliedFilters: filters,
        totalRows: rows.length,
        columns,
        rows,
        summaryMetrics: {
          totalShortageStudents: rows.length,
          configuredPolicyThreshold: `${minThreshold}%`,
        },
      };
    }

    // 3. Internship Compliance Report
    case "INTERNSHIP_COMPLIANCE": {
      const internships = await prisma.internship.findMany({
        where: {
          student: studentWhere,
          ...(filters.internshipStatus ? { status: filters.internshipStatus } : {}),
        },
        include: {
          student: { include: { department: true, batch: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const columns = [
        { key: "registerNo", label: "Register No" },
        { key: "fullName", label: "Student Name" },
        { key: "departmentCode", label: "Department" },
        { key: "companyName", label: "Company Name" },
        { key: "role", label: "Role" },
        { key: "domain", label: "Domain" },
        { key: "startDate", label: "Start Date" },
        { key: "endDate", label: "End Date" },
        { key: "status", label: "Approval Status" },
        { key: "stipendAmount", label: "Stipend" },
      ];

      const rows = internships.map((i) => ({
        registerNo: i.student.registerNo,
        fullName: i.student.fullName,
        departmentCode: i.student.department.code,
        companyName: i.companyName,
        role: i.role,
        domain: i.domain,
        startDate: i.startDate,
        endDate: i.endDate,
        status: i.status,
        stipendAmount: i.stipendAmount || "Unpaid",
      }));

      return {
        reportId,
        reportName: reportDef.name,
        category: reportDef.category,
        generatedAt: new Date().toISOString(),
        appliedFilters: filters,
        totalRows: rows.length,
        columns,
        rows,
        summaryMetrics: {
          totalInternships: rows.length,
          approvedCount: internships.filter((i) => i.status === "APPROVED" || i.status === "COMPLETED").length,
          pendingCount: internships.filter((i) => i.status === "SUBMITTED_FOR_APPROVAL").length,
        },
      };
    }

    // 4. Verified Certificate Report
    case "CERTIFICATE_VERIFIED": {
      const certs = await prisma.certificate.findMany({
        where: {
          student: studentWhere,
          ...(filters.verificationStatus ? { verificationStatus: filters.verificationStatus } : {}),
          ...(filters.certificateCategory ? { category: filters.certificateCategory } : {}),
        },
        include: {
          student: { include: { department: true, batch: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const columns = [
        { key: "registerNo", label: "Register No" },
        { key: "fullName", label: "Student Name" },
        { key: "departmentCode", label: "Department" },
        { key: "title", label: "Certificate Title" },
        { key: "category", label: "Category" },
        { key: "issuingBody", label: "Issuing Body" },
        { key: "issueDate", label: "Issue Date" },
        { key: "verificationStatus", label: "Verification Status" },
        { key: "skillsGained", label: "Skills Gained" },
      ];

      const rows = certs.map((c) => ({
        registerNo: c.student.registerNo,
        fullName: c.student.fullName,
        departmentCode: c.student.department.code,
        title: c.title,
        category: c.category,
        issuingBody: c.issuingBody,
        issueDate: c.issueDate,
        verificationStatus: c.verificationStatus,
        skillsGained: c.skillsGained || "N/A",
      }));

      return {
        reportId,
        reportName: reportDef.name,
        category: reportDef.category,
        generatedAt: new Date().toISOString(),
        appliedFilters: filters,
        totalRows: rows.length,
        columns,
        rows,
        summaryMetrics: {
          totalCertificates: rows.length,
          approvedCount: certs.filter((c) => c.verificationStatus === "APPROVED" || c.verificationStatus === "VERIFIED").length,
          pendingCount: certs.filter((c) => c.verificationStatus === "PENDING").length,
        },
      };
    }

    // 5. Project Technology Stack Report
    case "PROJECT_TECHNOLOGY": {
      const projects = await prisma.project.findMany({
        where: {
          student: studentWhere,
          ...(filters.projectType ? { projectType: filters.projectType } : {}),
          ...(filters.verificationStatus ? { status: filters.verificationStatus } : {}),
        },
        include: {
          student: { include: { department: true, batch: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const columns = [
        { key: "registerNo", label: "Register No" },
        { key: "fullName", label: "Student Name" },
        { key: "departmentCode", label: "Department" },
        { key: "title", label: "Project Title" },
        { key: "projectType", label: "Project Type" },
        { key: "category", label: "Category" },
        { key: "domain", label: "Domain" },
        { key: "techStack", label: "Technology Stack" },
        { key: "status", label: "Status" },
        { key: "guideName", label: "Faculty Guide" },
      ];

      const rows = projects.map((p) => ({
        registerNo: p.student.registerNo,
        fullName: p.student.fullName,
        departmentCode: p.student.department.code,
        title: p.title,
        projectType: p.projectType,
        category: p.category,
        domain: p.domain || "Software Engineering",
        techStack: p.techStack,
        status: p.status,
        guideName: p.guideName || "Self Guided",
      }));

      return {
        reportId,
        reportName: reportDef.name,
        category: reportDef.category,
        generatedAt: new Date().toISOString(),
        appliedFilters: filters,
        totalRows: rows.length,
        columns,
        rows,
        summaryMetrics: {
          totalProjectParticipations: rows.length,
          verifiedProjects: projects.filter((p) => p.status === "VERIFIED" || p.status === "COMPLETED").length,
        },
      };
    }

    // 6. Placement Pipeline Report
    case "PLACEMENT_PIPELINE": {
      const records = await prisma.placementRecord.findMany({
        where: {
          student: studentWhere,
          ...(filters.placementStatus ? { status: filters.placementStatus } : {}),
        },
        include: {
          student: { include: { department: true, batch: true } },
          drive: true,
        },
        orderBy: { offerDate: "desc" },
      });

      const columns = [
        { key: "registerNo", label: "Register No" },
        { key: "fullName", label: "Student Name" },
        { key: "departmentCode", label: "Department" },
        { key: "companyName", label: "Company Name" },
        { key: "jobTitle", label: "Job Role" },
        { key: "packageLpa", label: "CTC (LPA)" },
        { key: "offerDate", label: "Offer Date" },
        { key: "status", label: "Pipeline Status" },
      ];

      const rows = records.map((r) => ({
        registerNo: r.student.registerNo,
        fullName: r.student.fullName,
        departmentCode: r.student.department.code,
        companyName: r.companyName,
        jobTitle: r.jobTitle,
        packageLpa: `₹${r.packageLpa.toFixed(1)} LPA`,
        offerDate: r.offerDate,
        status: r.status,
      }));

      const uniquePlacedStudents = new Set(
        records.filter((r) => r.status === "OFFER_RECEIVED" || r.status === "SELECTED" || r.status === "JOINED").map((r) => r.studentId)
      ).size;

      return {
        reportId,
        reportName: reportDef.name,
        category: reportDef.category,
        generatedAt: new Date().toISOString(),
        appliedFilters: filters,
        totalRows: rows.length,
        columns,
        rows,
        summaryMetrics: {
          totalApplicationsOrOffers: rows.length,
          uniquePlacedStudents,
          selectedOrJoined: records.filter((r) => r.status === "SELECTED" || r.status === "JOINED").length,
        },
      };
    }

    // Default Fallback: Query Student Profile with relation metrics
    default: {
      const defaultStudents = await prisma.studentProfile.findMany({
        where: studentWhere,
        include: { department: true, batch: true },
        take: 100,
      });

      const columns = [
        { key: "registerNo", label: "Register No" },
        { key: "fullName", label: "Student Name" },
        { key: "departmentCode", label: "Department" },
        { key: "batchName", label: "Batch" },
        { key: "semester", label: "Semester" },
        { key: "cgpa", label: "CGPA" },
        { key: "attendancePercentage", label: "Attendance %" },
      ];

      const rows = defaultStudents.map((s) => ({
        registerNo: s.registerNo,
        fullName: s.fullName,
        departmentCode: s.department.code,
        batchName: s.batch.name,
        semester: s.currentSemester,
        cgpa: s.cgpa.toFixed(2),
        attendancePercentage: `${s.attendancePercentage.toFixed(1)}%`,
      }));

      return {
        reportId,
        reportName: reportDef.name,
        category: reportDef.category,
        generatedAt: new Date().toISOString(),
        appliedFilters: filters,
        totalRows: rows.length,
        columns,
        rows,
        summaryMetrics: {
          totalRows: rows.length,
        },
      };
    }
  }
}

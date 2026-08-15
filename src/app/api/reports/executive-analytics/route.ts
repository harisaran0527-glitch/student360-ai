import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId");
    const batchId = searchParams.get("batchId");
    const academicYear = searchParams.get("academicYear");

    const studentWhere: any = {};
    if (departmentId) studentWhere.departmentId = departmentId;
    if (batchId) studentWhere.batchId = batchId;
    if (academicYear) studentWhere.academicYear = academicYear;

    // 1. Total Student Counts
    const totalStudents = await prisma.studentProfile.count({ where: studentWhere });
    const activeStudents = await prisma.studentProfile.count({ where: { ...studentWhere, academicStatus: "PURSUING" } });
    const graduatedStudents = await prisma.studentProfile.count({ where: { ...studentWhere, academicStatus: "GRADUATED" } });
    const alumniCount = await prisma.alumniRecord.count();
    const activeBatchesCount = await prisma.batch.count({ where: { isCurrent: true } });

    // 2. Attendance Metrics
    const studentsList = await prisma.studentProfile.findMany({
      where: studentWhere,
      select: {
        id: true,
        registerNo: true,
        fullName: true,
        cgpa: true,
        attendancePercentage: true,
        academicYear: true,
        currentSemester: true,
        department: { select: { id: true, code: true, name: true } },
        batch: { select: { id: true, name: true } },
      },
    });

    const policy = (await prisma.attendancePolicy.findFirst()) || { minAttendancePercentage: 75.0 };
    const minThreshold = policy.minAttendancePercentage;

    const totalAttSum = studentsList.reduce((acc, s) => acc + s.attendancePercentage, 0);
    const attendanceAvg = studentsList.length > 0 ? (totalAttSum / studentsList.length).toFixed(1) : "0.0";
    const belowThresholdCount = studentsList.filter((s) => s.attendancePercentage < minThreshold).length;

    // 3. Internship Metrics
    const internships = await prisma.internship.findMany({
      where: { student: studentWhere },
    });
    const totalInternships = internships.length;
    const completedInternships = internships.filter((i) => i.status === "APPROVED" || i.status === "COMPLETED").length;
    const internshipCompletionRate = totalStudents > 0 ? ((completedInternships / totalStudents) * 100).toFixed(1) : "0.0";

    // 4. Certificates & Achievements & Projects
    const certificates = await prisma.certificate.findMany({ where: { student: studentWhere } });
    const verifiedCertificates = certificates.filter((c) => c.verificationStatus === "APPROVED" || c.verificationStatus === "VERIFIED").length;

    const achievements = await prisma.achievement.findMany({ where: { student: studentWhere } });
    const verifiedAchievements = achievements.filter((a) => a.verificationStatus === "APPROVED" || a.verificationStatus === "VERIFIED").length;

    const projects = await prisma.project.findMany({ where: { student: studentWhere } });
    const verifiedProjects = projects.filter((p) => p.status === "VERIFIED" || p.status === "COMPLETED").length;

    const verificationBacklog =
      certificates.filter((c) => c.verificationStatus === "PENDING").length +
      achievements.filter((a) => a.verificationStatus === "PENDING").length +
      projects.filter((p) => p.status === "PLANNED" || p.status === "ONGOING").length;

    // 5. Skills Metrics
    const skills = await prisma.skill.findMany({ where: { student: studentWhere } });
    const verifiedSkillsCount = skills.filter((s) => s.verified).length;

    const skillCounts: Record<string, number> = {};
    skills.filter((s) => s.verified).forEach((s) => {
      const name = s.name.trim();
      skillCounts[name] = (skillCounts[name] || 0) + 1;
    });
    const commonVerifiedSkills = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 6. Placement Metrics
    const placementRecords = await prisma.placementRecord.findMany({ where: { student: studentWhere } });
    const uniquePlacedStudentIds = new Set(
      placementRecords
        .filter((r) => r.status === "OFFER_RECEIVED" || r.status === "SELECTED" || r.status === "JOINED")
        .map((r) => r.studentId)
    );
    const uniquePlacedCount = uniquePlacedStudentIds.size;
    const totalOffersCount = placementRecords.filter((r) => r.status === "OFFER_RECEIVED" || r.status === "SELECTED" || r.status === "JOINED").length;

    // Multiple offer calculation
    const offerCountsPerStudent: Record<string, number> = {};
    placementRecords
      .filter((r) => r.status === "OFFER_RECEIVED" || r.status === "SELECTED" || r.status === "JOINED")
      .forEach((r) => {
        offerCountsPerStudent[r.studentId] = (offerCountsPerStudent[r.studentId] || 0) + 1;
      });
    const multipleOfferStudentsCount = Object.values(offerCountsPerStudent).filter((c) => c > 1).length;

    const placementRate = totalStudents > 0 ? ((uniquePlacedCount / totalStudents) * 100).toFixed(1) : "0.0";

    // 7. Compliance Alerts & AI Support Attention
    const complianceAlertsCount = await prisma.studentComplianceReport.count();

    const highAttentionSnapshots = await prisma.studentRiskSnapshot.count({ where: { attentionLevel: "HIGH_ATTENTION" } });
    const mediumAttentionSnapshots = await prisma.studentRiskSnapshot.count({ where: { attentionLevel: "MEDIUM_ATTENTION" } });
    const lowAttentionSnapshots = await prisma.studentRiskSnapshot.count({ where: { attentionLevel: "LOW_ATTENTION" } });

    // 8. Visualizations Data Sets
    // Department Distribution
    const depts = await prisma.department.findMany();
    const deptDistribution = depts.map((d) => ({
      name: d.code,
      fullName: d.name,
      students: studentsList.filter((s) => s.department.id === d.id).length,
    }));

    // Batch Distribution
    const batches = await prisma.batch.findMany();
    const batchDistribution = batches.map((b) => ({
      name: b.name,
      students: studentsList.filter((s) => s.batch?.id === b.id).length,
    }));

    // Internship Domains Distribution
    const internshipDomainCounts: Record<string, number> = {};
    internships.forEach((i) => {
      const dom = i.domain || "Software Engineering";
      internshipDomainCounts[dom] = (internshipDomainCounts[dom] || 0) + 1;
    });
    const internshipDomainsData = Object.entries(internshipDomainCounts).map(([domain, count]) => ({ domain, count }));

    // Project Domains Distribution
    const projectDomainCounts: Record<string, number> = {};
    projects.forEach((p) => {
      const dom = p.domain || "Software Engineering";
      projectDomainCounts[dom] = (projectDomainCounts[dom] || 0) + 1;
    });
    const projectDomainsData = Object.entries(projectDomainCounts).map(([domain, count]) => ({ domain, count }));

    // Placement Pipeline Breakdown
    const pipelineCounts: Record<string, number> = {};
    placementRecords.forEach((r) => {
      pipelineCounts[r.status] = (pipelineCounts[r.status] || 0) + 1;
    });
    const placementPipelineData = Object.entries(pipelineCounts).map(([status, count]) => ({ status, count }));

    return NextResponse.json({
      metrics: {
        totalStudents,
        activeStudents,
        graduatedStudents,
        alumniCount,
        activeBatchesCount,
        attendanceAvg,
        belowThresholdCount,
        internshipCompletionRate,
        totalInternships,
        completedInternships,
        verifiedCertificates,
        verifiedAchievements,
        verifiedProjects,
        verifiedSkillsCount,
        uniquePlacedCount,
        totalOffersCount,
        multipleOfferStudentsCount,
        placementRate,
        verificationBacklog,
        complianceAlertsCount,
        supportAttentionSummary: {
          HIGH_ATTENTION: highAttentionSnapshots,
          MEDIUM_ATTENTION: mediumAttentionSnapshots,
          LOW_ATTENTION: lowAttentionSnapshots,
        },
      },
      visualizations: {
        deptDistribution,
        batchDistribution,
        internshipDomainsData,
        projectDomainsData,
        placementPipelineData,
        commonVerifiedSkills,
      },
      filtersApplied: { departmentId, batchId, academicYear },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

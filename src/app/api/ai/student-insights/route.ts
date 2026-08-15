import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  evaluateStudentSupportAttention,
  evaluateInternshipRecommendations,
  evaluateSkillGapAnalysis,
  generatePersonalizedRoadmap,
  evaluateCareerPreparationInsights,
} from "@/lib/ai";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const requestedStudentId = searchParams.get("studentId");

    let studentId = requestedStudentId || session.studentId;
    if (!studentId && session.role === "STUDENT") {
      const sp = await prisma.studentProfile.findUnique({ where: { userId: session.id } });
      if (sp) studentId = sp.id;
    }

    if (!studentId) {
      return NextResponse.json({ error: "Student profile required" }, { status: 400 });
    }

    // Security Authorization: Student can only view their own insights
    if (session.role === "STUDENT") {
      const sp = await prisma.studentProfile.findUnique({ where: { userId: session.id } });
      if (sp && sp.id !== studentId) {
        return NextResponse.json({ error: "Forbidden: Cannot access other student insights" }, { status: 403 });
      }
    }

    // Fetch full student record with relevant academic & activity relation data
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        department: true,
        batch: {
          include: {
            semesterConfigs: true,
          },
        },
        skills: true,
        projects: true,
        certificates: true,
        internships: true,
        achievements: true,
        attendances: true,
        placementRecords: true,
        careerPreference: {
          include: { targetRole: true },
        },
        riskSnapshots: {
          orderBy: { generatedAt: "desc" },
          take: 5,
        },
      },
    });

    if (!student) return NextResponse.json({ error: "Student record not found" }, { status: 404 });

    // Determine current semester config
    const currentSemConfig = student.batch?.semesterConfigs?.find(
      (sc) => sc.semesterNumber === student.currentSemester
    );

    // Subject shortages (attendance < 75%)
    const subjectShortages: { courseCode: string; courseTitle: string; percentage: number }[] = [];
    if (student.attendancePercentage < 75) {
      subjectShortages.push({
        courseCode: "CORE_ACAD",
        courseTitle: "Overall Attendance Shortage",
        percentage: student.attendancePercentage,
      });
    }

    // Module 1: Support Attention Analysis
    const supportAttention = evaluateStudentSupportAttention({
      attendancePercentage: student.attendancePercentage,
      subjectShortages,
      cgpa: student.cgpa,
      currentSemester: student.currentSemester,
      academicYear: student.academicYear,
      internshipRequiredForSemester: currentSemConfig?.internshipRequired || false,
      internshipStatus: student.internships[0]?.status || null,
      internshipDeadline: currentSemConfig?.submissionDeadline || null,
      pendingInternshipDocs: student.internships.filter((i) => i.status === "SUBMITTED_FOR_APPROVAL").length,
      pendingVerifications:
        student.certificates.filter((c) => c.verificationStatus === "PENDING").length +
        student.projects.filter((p) => p.status === "PLANNED" || p.status === "ONGOING").length,
      completedProjectsCount: student.projects.filter((p) => p.status === "COMPLETED" || p.status === "VERIFIED").length,
    });

    // Save StudentRiskSnapshot if not existing for this semester
    const existingSnapshot = await prisma.studentRiskSnapshot.findFirst({
      where: {
        studentId: student.id,
        academicYear: student.academicYear,
        semester: student.currentSemester,
      },
    });

    if (!existingSnapshot) {
      await prisma.studentRiskSnapshot.create({
        data: {
          studentId: student.id,
          academicYear: student.academicYear,
          semester: student.currentSemester,
          attentionLevel: supportAttention.attentionLevel,
          factors: JSON.stringify(supportAttention.factors),
          inputsUsed: JSON.stringify(supportAttention.inputsUsed),
          recommendation: JSON.stringify(supportAttention.recommendations),
          engineVersion: supportAttention.engineVersion,
        },
      });
    }

    // Trigger notification if HIGH_ATTENTION with deduplication
    if (supportAttention.attentionLevel === "HIGH_ATTENTION") {
      const dedupKey = `student_support_${student.id}_sem${student.currentSemester}_${student.academicYear}`;
      await prisma.notification.upsert({
        where: { deduplicationKey: dedupKey },
        update: {},
        create: {
          userId: student.userId,
          studentId: student.id,
          type: "WARNING",
          title: "Support Attention Update",
          message: `Your Support Attention status is HIGH. Reasons: ${supportAttention.factors.slice(0, 2).join("; ")}`,
          priority: "HIGH",
          relatedModule: "AI_SUPPORT",
          deduplicationKey: dedupKey,
        },
      });
    }

    // Target Role Profile
    let targetRoleProfile = student.careerPreference?.targetRole;

    if (!targetRoleProfile) {
      const defaultRole = await prisma.careerRoleProfile.findFirst({
        where: { roleName: "Full Stack Developer" },
      });
      if (defaultRole) targetRoleProfile = defaultRole;
    }

    const verifiedSkills = student.skills.filter((s) => s.verified);
    const selfReportedSkills = student.skills.filter((s) => !s.verified);

    // Module 2: Internship Domain Recommendation
    const internshipRecommendations = evaluateInternshipRecommendations({
      verifiedSkills: verifiedSkills.map((s) => s.name),
      selfReportedSkills: selfReportedSkills.map((s) => s.name),
      projects: student.projects.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        domain: p.domain || undefined,
        techStack: p.techStack,
        verified: p.status === "VERIFIED" || p.status === "COMPLETED",
      })),
      certificates: student.certificates.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        issuingBody: c.issuingBody,
        skillsGained: c.skillsGained || undefined,
        verified: c.verificationStatus === "APPROVED" || c.verificationStatus === "VERIFIED",
      })),
      previousInternships: student.internships.map((i) => ({
        id: i.id,
        companyName: i.companyName,
        role: i.role,
        domain: i.domain,
        status: i.status,
      })),
      departmentCode: student.department.code,
      interests: student.careerPreference?.interests || undefined,
      targetRoleName: targetRoleProfile?.roleName,
    });

    const parseSkillString = (str?: string) =>
      str ? str.split(",").map((s) => s.trim()).filter(Boolean) : [];

    const roleProfileData = {
      roleName: targetRoleProfile?.roleName || "Full Stack Developer",
      description: targetRoleProfile?.description || "Full Stack Architecture",
      coreSkills: parseSkillString(targetRoleProfile?.coreSkills),
      recommendedSkills: parseSkillString(targetRoleProfile?.recommendedSkills),
      optionalSkills: parseSkillString(targetRoleProfile?.optionalSkills),
      suggestedProjectDomains: parseSkillString(targetRoleProfile?.suggestedProjectDomains),
      suggestedInternshipDomains: parseSkillString(targetRoleProfile?.suggestedInternshipDomains),
    };

    // Module 3: Skill Gap Analysis
    const skillGap = evaluateSkillGapAnalysis({
      targetRoleName: roleProfileData.roleName,
      roleProfile: roleProfileData,
      verifiedSkills: verifiedSkills.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        level: s.level,
      })),
      selfReportedSkills: selfReportedSkills.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        level: s.level,
      })),
    });

    // Module 4: Personalized Learning Roadmap
    const learningRoadmap = generatePersonalizedRoadmap({
      targetRole: roleProfileData.roleName,
      currentSemester: student.currentSemester,
      verifiedSkills: verifiedSkills.map((s) => s.name),
      missingCoreSkills: skillGap.missingCoreSkills,
      missingRecommendedSkills: skillGap.missingRecommendedSkills,
      verifiedProjects: student.projects.map((p) => ({
        title: p.title,
        category: p.category,
        techStack: p.techStack,
      })),
      verifiedInternships: student.internships.map((i) => ({
        role: i.role,
        domain: i.domain,
        companyName: i.companyName,
      })),
    });

    // Module 5: Career Preparation Insights
    const careerPrep = evaluateCareerPreparationInsights({
      verifiedSkillsCount: verifiedSkills.length,
      selfReportedSkillsCount: selfReportedSkills.length,
      verifiedProjectsCount: student.projects.length,
      verifiedInternshipsCount: student.internships.length,
      verifiedCertificatesCount: student.certificates.length,
      achievementsCount: student.achievements.length,
      placementApplicationsCount: student.placementRecords.length,
      currentPlacementStage: student.placementRecords[0]?.status || null,
      targetRole: roleProfileData.roleName,
      missingCoreSkills: skillGap.missingCoreSkills,
      missingRecommendedSkills: skillGap.missingRecommendedSkills,
    });

    // Fetch Historical AI Insight Snapshots
    const historicalSnapshots = await prisma.aIInsightSnapshot.findMany({
      where: { studentId: student.id },
      orderBy: { generatedAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      studentInfo: {
        id: student.id,
        fullName: student.fullName,
        registerNo: student.registerNo,
        department: student.department.name,
        currentSemester: student.currentSemester,
        academicYear: student.academicYear,
      },
      supportAttention,
      targetRoleProfile: roleProfileData,
      internshipRecommendations,
      skillGap,
      learningRoadmap,
      careerPrep,
      historicalSnapshots,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

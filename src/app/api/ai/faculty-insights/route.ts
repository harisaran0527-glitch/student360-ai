import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { evaluateBatchSkillGapAndInsights } from "@/lib/ai";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "FACULTY" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get("academicYear");
    const batchId = searchParams.get("batchId");
    const departmentId = searchParams.get("departmentId");
    const sectionId = searchParams.get("sectionId");
    const semester = searchParams.get("semester");
    const targetRoleId = searchParams.get("targetRoleId");

    const whereClause: any = { isArchived: false };

    if (academicYear) whereClause.academicYear = academicYear;
    if (batchId) whereClause.batchId = batchId;
    if (departmentId) whereClause.departmentId = departmentId;
    if (sectionId) whereClause.sectionId = sectionId;
    if (semester) whereClause.currentSemester = parseInt(semester, 10);

    const students = await prisma.studentProfile.findMany({
      where: whereClause,
      select: {
        id: true,
        registerNo: true,
        fullName: true,
        currentSemester: true,
        academicYear: true,
        attendancePercentage: true,
        cgpa: true,
        department: { select: { code: true, name: true } },
        batch: { select: { id: true, name: true, semesterConfigs: true } },
        section: { select: { id: true, name: true } },
        skills: { select: { name: true, category: true, verified: true } },
        certificates: { select: { id: true, verificationStatus: true } },
        projects: { select: { id: true, domain: true, title: true, status: true } },
        internships: { select: { id: true, domain: true, companyName: true, role: true, status: true } },
      },
    });

    let targetRoleProfile;
    if (targetRoleId) {
      targetRoleProfile = await prisma.careerRoleProfile.findUnique({
        where: { id: targetRoleId },
      });
    } else {
      targetRoleProfile = await prisma.careerRoleProfile.findFirst({
        where: { roleName: "Data Analyst" },
      });
    }

    const parseSkillString = (str?: string) =>
      str ? str.split(",").map((s) => s.trim()).filter(Boolean) : [];

    const formattedRoleProfile = targetRoleProfile
      ? {
          roleName: targetRoleProfile.roleName,
          coreSkills: parseSkillString(targetRoleProfile.coreSkills),
          recommendedSkills: parseSkillString(targetRoleProfile.recommendedSkills),
        }
      : undefined;

    const formattedStudents = students.map((s) => {
      const semConfig = s.batch?.semesterConfigs?.find((sc) => sc.semesterNumber === s.currentSemester);

      return {
        id: s.id,
        registerNo: s.registerNo,
        fullName: s.fullName,
        departmentCode: s.department.code,
        batchName: s.batch?.name || "N/A",
        sectionName: s.section?.name,
        semester: s.currentSemester,
        attendancePercentage: s.attendancePercentage,
        cgpa: s.cgpa,
        verifiedSkills: s.skills.filter((sk) => sk.verified).map((sk) => sk.name),
        selfReportedSkills: s.skills.filter((sk) => !sk.verified).map((sk) => sk.name),
        internshipStatus: s.internships[0]?.status || null,
        internshipOverdue:
          Boolean(semConfig?.internshipRequired) &&
          (!s.internships[0] || s.internships[0].status !== "APPROVED"),
        pendingCertificatesCount: s.certificates.filter((c) => c.verificationStatus === "PENDING").length,
        pendingProjectsCount: s.projects.filter((p) => p.status === "PLANNED" || p.status === "ONGOING").length,
        completedProjects: s.projects
          .filter((p) => p.status === "COMPLETED" || p.status === "VERIFIED")
          .map((p) => ({ domain: p.domain || undefined, title: p.title })),
        completedInternships: s.internships
          .filter((i) => i.status === "APPROVED" || i.status === "COMPLETED")
          .map((i) => ({ domain: i.domain, companyName: i.companyName })),
      };
    });

    const batchInsights = evaluateBatchSkillGapAndInsights(formattedStudents, formattedRoleProfile);

    // Filter Options for Faculty UI
    const departments = await prisma.department.findMany({ select: { id: true, code: true, name: true } });
    const batches = await prisma.batch.findMany({ select: { id: true, name: true } });
    const roles = await prisma.careerRoleProfile.findMany({ select: { id: true, roleName: true } });

    return NextResponse.json({
      batchInsights,
      studentsCount: students.length,
      studentsList: formattedStudents.map((s) => ({
        id: s.id,
        registerNo: s.registerNo,
        fullName: s.fullName,
        departmentCode: s.departmentCode,
        batchName: s.batchName,
        sectionName: s.sectionName,
        semester: s.semester,
        attendancePercentage: s.attendancePercentage,
        cgpa: s.cgpa,
        verifiedSkillsCount: s.verifiedSkills.length,
        pendingCertificatesCount: s.pendingCertificatesCount,
      })),
      filterOptions: { departments, batches, roles },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId || undefined },
      include: {
        department: true,
        batch: true,
        academicRecords: { include: { course: true } },
        skills: { where: { verified: true } },
        projects: { where: { status: "VERIFIED" } },
        internships: { where: { status: "VERIFIED" } },
        certificates: { where: { verificationStatus: "APPROVED" } },
        achievements: { where: { verificationStatus: "APPROVED" } },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const resumeData = {
      profileSummary: {
        fullName: student.fullName,
        email: student.email,
        phone: student.phone,
        department: student.department?.name,
        registerNo: student.registerNo,
        batch: student.batch?.name,
        cgpa: student.cgpa,
      },
      education: [
        {
          institution: "College of Engineering & Technology",
          degree: `B.E. ${student.department?.name}`,
          batch: student.batch?.name,
          cgpa: `${student.cgpa} / 10.0`,
        },
      ],
      verifiedSkills: student.skills.map((s) => ({ name: s.name, category: s.category, level: s.level })),
      verifiedProjects: student.projects.map((p) => ({
        title: p.title,
        description: p.description,
        techStack: p.techStack,
        githubUrl: p.githubUrl,
      })),
      verifiedInternships: student.internships.map((i) => ({
        company: i.companyName,
        role: i.role,
        dates: `${i.startDate} - ${i.endDate}`,
        summary: i.workSummary || "Completed verified industry internship.",
      })),
      verifiedCertifications: student.certificates.map((c) => ({
        title: c.title,
        issuingBody: c.issuingBody,
        issueDate: c.issueDate,
      })),
      verifiedAchievements: student.achievements.map((a) => ({
        title: a.title,
        position: a.position,
        event: a.eventName,
        organizer: a.organizer,
      })),
    };

    return NextResponse.json({ resumeData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    const where: any = {};
    if (studentId) where.studentId = studentId;

    const skills = await prisma.skill.findMany({
      where,
      orderBy: [{ verified: "desc" }, { name: "asc" }],
    });

    // Populate Backing Evidence Graph Records
    const skillsWithEvidence = await Promise.all(
      skills.map(async (sk) => {
        let evidenceRecord: any = null;
        if (sk.evidenceType === "CERTIFICATE" && sk.evidenceRecordId) {
          evidenceRecord = await prisma.certificate.findUnique({
            where: { id: sk.evidenceRecordId },
            select: { title: true, issuingBody: true, issueDate: true },
          });
        } else if (sk.evidenceType === "PROJECT" && sk.evidenceRecordId) {
          evidenceRecord = await prisma.project.findUnique({
            where: { id: sk.evidenceRecordId },
            select: { title: true, category: true, techStack: true },
          });
        } else if (sk.evidenceType === "INTERNSHIP" && sk.evidenceRecordId) {
          evidenceRecord = await prisma.internship.findUnique({
            where: { id: sk.evidenceRecordId },
            select: { companyName: true, role: true, startDate: true },
          });
        }

        return {
          ...sk,
          evidenceRecord,
        };
      })
    );

    return NextResponse.json({ skills: skillsWithEvidence });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { studentId, name, category, level, evidenceType } = await req.json();

    if (!studentId || !name) {
      return NextResponse.json({ error: "studentId and name are required" }, { status: 400 });
    }

    const isFacultyOrAdmin = session.role === "SUPER_ADMIN" || session.role === "ADMIN" || session.role === "FACULTY";

    const skill = await prisma.skill.create({
      data: {
        studentId,
        name,
        category: category || "Programming",
        level: level || "Intermediate",
        proficiency: level || "Intermediate",
        evidenceType: evidenceType || "SELF_REPORTED",
        verified: isFacultyOrAdmin && evidenceType === "FACULTY_VERIFIED",
      },
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "ADD_SKILL",
        entityType: "Skill",
        entityId: skill.id,
        details: JSON.stringify({ name, category, evidenceType, addedBy: session.email }),
      },
    });

    return NextResponse.json({ skill });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

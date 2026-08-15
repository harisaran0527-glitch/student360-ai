import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    const where: any = {};
    if (studentId) where.studentId = studentId;

    const skills = await prisma.skill.findMany({
      where,
      orderBy: [{ verified: "desc" }, { name: "asc" }],
    });

    // Collect unique record IDs for bulk fetch to prevent N+1 database connection timeouts
    const certIds = skills.filter((s) => s.evidenceType === "CERTIFICATE" && s.evidenceRecordId).map((s) => s.evidenceRecordId as string);
    const projIds = skills.filter((s) => s.evidenceType === "PROJECT" && s.evidenceRecordId).map((s) => s.evidenceRecordId as string);
    const internIds = skills.filter((s) => s.evidenceType === "INTERNSHIP" && s.evidenceRecordId).map((s) => s.evidenceRecordId as string);

    // Fetch dependencies sequentially
    const certs = certIds.length > 0
      ? await prisma.certificate.findMany({
          where: { id: { in: certIds } },
          select: { id: true, title: true, issuingBody: true, issueDate: true },
        })
      : [];

    const projects = projIds.length > 0
      ? await prisma.project.findMany({
          where: { id: { in: projIds } },
          select: { id: true, title: true, category: true, techStack: true },
        })
      : [];

    const internships = internIds.length > 0
      ? await prisma.internship.findMany({
          where: { id: { in: internIds } },
          select: { id: true, companyName: true, role: true, startDate: true },
        })
      : [];

    const certMap = new Map(certs.map((c) => [c.id, c]));
    const projMap = new Map(projects.map((p) => [p.id, p]));
    const internMap = new Map(internships.map((i) => [i.id, i]));

    const skillsWithEvidence = skills.map((sk) => {
      let evidenceRecord: any = null;
      if (sk.evidenceRecordId) {
        if (sk.evidenceType === "CERTIFICATE") {
          evidenceRecord = certMap.get(sk.evidenceRecordId) || null;
        } else if (sk.evidenceType === "PROJECT") {
          evidenceRecord = projMap.get(sk.evidenceRecordId) || null;
        } else if (sk.evidenceType === "INTERNSHIP") {
          evidenceRecord = internMap.get(sk.evidenceRecordId) || null;
        }
      }
      return {
        ...sk,
        evidenceRecord,
      };
    });

    return NextResponse.json({ skills: skillsWithEvidence });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
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

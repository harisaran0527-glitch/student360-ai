import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentIdParam = searchParams.get("studentId");

    let studentId = studentIdParam || session.studentId;
    if (!studentId && session.role === "STUDENT") {
      const sp = await prisma.studentProfile.findUnique({ where: { userId: session.id } });
      if (sp) studentId = sp.id;
    }

    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    const pref = await prisma.studentCareerPreference.findUnique({
      where: { studentId },
      include: { targetRole: true },
    });

    return NextResponse.json({ preference: pref });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { studentId: bodyStudentId, targetRoleId, interests } = body;

    let targetId = bodyStudentId || session.studentId;
    if (!targetId && session.role === "STUDENT") {
      const sp = await prisma.studentProfile.findUnique({ where: { userId: session.id } });
      if (sp) targetId = sp.id;
    }

    if (!targetId || !targetRoleId) {
      return NextResponse.json({ error: "Student ID and Target Role ID are required" }, { status: 400 });
    }

    // Security check: student can only set their own preference
    if (session.role === "STUDENT") {
      const sp = await prisma.studentProfile.findUnique({ where: { userId: session.id } });
      if (sp && sp.id !== targetId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const preference = await prisma.studentCareerPreference.upsert({
      where: { studentId: targetId },
      update: {
        targetRoleId,
        interests: interests || null,
      },
      create: {
        studentId: targetId,
        targetRoleId,
        interests: interests || null,
      },
      include: { targetRole: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "TARGET_CAREER_ROLE_SELECTED",
        entityType: "StudentCareerPreference",
        entityId: preference.id,
        details: `Selected target role: ${preference.targetRole.roleName}`,
      },
    });

    return NextResponse.json({ preference, message: "Target career role updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAcademicYearFromRequest } from "@/lib/academicYearEngine";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const academicYear = getAcademicYearFromRequest(req);
    const where: any = {};

    if (session.role === "STUDENT") {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: session.id } });
      if (profile) where.studentId = profile.id;
    } else if (studentId) {
      where.studentId = studentId;
    }

    if (academicYear && !where.studentId) {
      where.student = { academicYear };
    }

    const achievements = await prisma.achievement.findMany({
      where,
      include: { student: { select: { fullName: true, registerNo: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ achievements });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, category, eventName, organizer, position, date, documentUrl } = body;

    let studentId = body.studentId;
    if (session.role === "STUDENT") {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: session.id } });
      if (!profile) return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
      studentId = profile.id;
    }

    const achievement = await prisma.achievement.create({
      data: {
        studentId,
        title,
        category: category || "Hackathon",
        eventName,
        organizer,
        position: position || "Participant",
        date: date || new Date().toISOString().split("T")[0],
        documentUrl,
        verificationStatus: "PENDING",
      },
    });

    return NextResponse.json({ success: true, achievement });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role === "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, verificationStatus } = await req.json();
    const achievement = await prisma.achievement.update({
      where: { id },
      data: { verificationStatus },
    });

    return NextResponse.json({ success: true, achievement });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

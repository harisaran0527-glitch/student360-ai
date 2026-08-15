import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");

    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    const ods = await prisma.oDRecord.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            registerNo: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ods });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();

    // Action 1: Faculty / Admin Approval
    if (data.action === "approve" || data.action === "reject") {
      if (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN" && session.role !== "FACULTY") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const od = await prisma.oDRecord.update({
        where: { id: data.odId },
        data: {
          status: data.action === "approve" ? "APPROVED" : "REJECTED",
          approvedBy: session.email,
        },
      });

      return NextResponse.json({ success: true, od });
    }

    // Action 2: Student Creation
    const { studentId, reason, category, fromDate, toDate, documentUrl } = data;

    const od = await prisma.oDRecord.create({
      data: {
        studentId,
        reason,
        category: category || "Hackathon",
        fromDate,
        toDate,
        documentUrl,
        status: "PENDING",
      },
    });

    return NextResponse.json({ od });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = session.role === "STUDENT" ? session.studentProfileId : undefined;
    if (session.role === "STUDENT" && !studentId) {
      return NextResponse.json({ companies: [] });
    }

    const where: any = { isArchived: false };
    if (studentId) {
      where.studentId = studentId;
    }

    const records = await prisma.internship.findMany({
      where,
      select: {
        id: true,
        companyName: true,
        role: true,
        mode: true,
        domain: true,
        location: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ companies: records });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

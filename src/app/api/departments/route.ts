import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const departments = await prisma.department.findMany({
      include: {
        _count: { select: { students: true, courses: true } },
        sections: true,
      },
      orderBy: { code: "asc" },
    });

    return NextResponse.json({ departments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { code, name, hodName } = await req.json();

    const department = await prisma.department.create({
      data: {
        code: code.toUpperCase(),
        name,
        hodName,
      },
    });

    return NextResponse.json({ success: true, department });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const calendar = await prisma.academicCalendar.findMany({
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ calendar });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date, dayType, description, academicYearCode } = await req.json();

    if (!date || !dayType) {
      return NextResponse.json({ error: "date and dayType are required" }, { status: 400 });
    }

    const entry = await prisma.academicCalendar.upsert({
      where: { date },
      update: {
        dayType,
        description,
        academicYearCode: academicYearCode || DEFAULT_ACADEMIC_YEAR,
      },
      create: {
        date,
        dayType,
        description,
        academicYearCode: academicYearCode || DEFAULT_ACADEMIC_YEAR,
      },
    });

    return NextResponse.json({ entry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

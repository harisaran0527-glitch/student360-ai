import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getCachedDepartments, setCachedDepartments, invalidateServerMetadataCache } from "@/lib/serverCache";

import { getDepartmentDisplayCode, getDepartmentDisplayName, getDepartmentDisplayLabel } from "@/lib/departmentEngine";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cached = getCachedDepartments();
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=10, s-maxage=30, stale-while-revalidate=30",
        },
      });
    }

    const rawDepts = await prisma.department.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        hodName: true,
        _count: { select: { students: true, courses: true } },
      },
      orderBy: { code: "asc" },
    });

    const departments = rawDepts.map((d) => ({
      ...d,
      displayCode: getDepartmentDisplayCode(d.code),
      displayName: getDepartmentDisplayName(d),
      displayLabel: getDepartmentDisplayLabel(d),
    }));

    const payload = { departments };
    setCachedDepartments(payload);

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=10, s-maxage=30, stale-while-revalidate=30",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
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

    invalidateServerMetadataCache();

    return NextResponse.json({ success: true, department });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


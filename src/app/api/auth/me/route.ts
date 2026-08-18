import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      studentProfile: {
        include: {
          department: true,
          batch: true,
          section: true,
        },
      },
    },
  });

  if (!dbUser) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      ...session,
      ...dbUser,
    },
  });
}

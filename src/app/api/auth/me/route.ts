import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user: session });
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { registerPushSubscription } from "@/lib/pushNotifications";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const subscription = await req.json();
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Invalid push subscription object" }, { status: 400 });
    }

    await registerPushSubscription(subscription, session.id);

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "PUSH_SUBSCRIPTION_REGISTERED",
        entityType: "PushSubscription",
        entityId: session.id,
        details: "User enabled Web Push Notifications for Student360 AI",
      },
    });

    return NextResponse.json({ success: true, message: "Push notification subscription registered" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, comparePassword, hashPassword, validatePasswordPolicy } from "@/lib/auth";

export async function PUT(req: Request) {
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { currentPassword, newEmail, newPassword } = body;

    if (!currentPassword) {
      return NextResponse.json({ error: "Current password confirmation required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const passwordMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
    }

    const updateData: any = {};

    if (newEmail && newEmail !== user.email) {
      const emailExists = await prisma.user.findUnique({ where: { email: newEmail } });
      if (emailExists) return NextResponse.json({ error: "Email address is already in use" }, { status: 400 });
      updateData.email = newEmail;
    }

    if (newPassword) {
      const policyCheck = validatePasswordPolicy(newPassword);
      if (!policyCheck.valid) {
        return NextResponse.json({ error: policyCheck.message }, { status: 400 });
      }
      updateData.passwordHash = await hashPassword(newPassword);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No changes requested" });
    }

    await prisma.user.update({
      where: { id: session.id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "ADMIN_ACCOUNT_UPDATED",
        entityType: "User",
        entityId: session.id,
        details: `Updated Admin account (${Object.keys(updateData).join(", ")})`,
      },
    });

    return NextResponse.json({ message: "Account settings updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

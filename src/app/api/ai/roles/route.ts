import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    let roles = await prisma.careerRoleProfile.findMany({
      where: { isActive: true },
      orderBy: { roleName: "asc" },
    });

    return NextResponse.json({ roles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const {
      roleName,
      description,
      coreSkills,
      recommendedSkills,
      optionalSkills,
      suggestedProjectDomains,
      suggestedInternshipDomains,
    } = body;

    if (!roleName || !description) {
      return NextResponse.json({ error: "Role name and description are required" }, { status: 400 });
    }

    const role = await prisma.careerRoleProfile.upsert({
      where: { roleName },
      update: {
        description,
        coreSkills: Array.isArray(coreSkills) ? coreSkills.join(", ") : coreSkills || "",
        recommendedSkills: Array.isArray(recommendedSkills) ? recommendedSkills.join(", ") : recommendedSkills || "",
        optionalSkills: Array.isArray(optionalSkills) ? optionalSkills.join(", ") : optionalSkills || "",
        suggestedProjectDomains: Array.isArray(suggestedProjectDomains) ? suggestedProjectDomains.join(", ") : suggestedProjectDomains || "",
        suggestedInternshipDomains: Array.isArray(suggestedInternshipDomains) ? suggestedInternshipDomains.join(", ") : suggestedInternshipDomains || "",
        isActive: true,
      },
      create: {
        roleName,
        description,
        coreSkills: Array.isArray(coreSkills) ? coreSkills.join(", ") : coreSkills || "",
        recommendedSkills: Array.isArray(recommendedSkills) ? recommendedSkills.join(", ") : recommendedSkills || "",
        optionalSkills: Array.isArray(optionalSkills) ? optionalSkills.join(", ") : optionalSkills || "",
        suggestedProjectDomains: Array.isArray(suggestedProjectDomains) ? suggestedProjectDomains.join(", ") : suggestedProjectDomains || "",
        suggestedInternshipDomains: Array.isArray(suggestedInternshipDomains) ? suggestedInternshipDomains.join(", ") : suggestedInternshipDomains || "",
        isActive: true,
      },
    });

    // Log audit entry
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "CAREER_ROLE_PROFILE_UPDATED",
        entityType: "CareerRoleProfile",
        entityId: role.id,
        details: `Updated career role profile: ${roleName}`,
      },
    });

    return NextResponse.json({ role, message: "Career role profile saved successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

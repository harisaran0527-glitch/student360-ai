import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const opportunities = await prisma.internshipOpportunity.findMany({
      include: {
        applications: {
          select: { studentId: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ opportunities });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();

    // Action 1: Student Application / Save
    if (data.action === "apply" || data.action === "save") {
      const studentProfile = await prisma.studentProfile.findFirst({
        where: { userId: session.id },
      });
      if (!studentProfile) return NextResponse.json({ error: "Student profile not found" }, { status: 404 });

      const app = await prisma.studentOpportunityApplication.upsert({
        where: {
          studentId_opportunityId: {
            studentId: studentProfile.id,
            opportunityId: data.opportunityId,
          },
        },
        update: { status: data.action === "apply" ? "APPLIED" : "SAVED" },
        create: {
          studentId: studentProfile.id,
          opportunityId: data.opportunityId,
          status: data.action === "apply" ? "APPLIED" : "SAVED",
        },
      });

      return NextResponse.json({ success: true, app });
    }

    // Action 2: Admin/Faculty Create Opportunity Posting
    if (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN" && session.role !== "FACULTY") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      companyName,
      role,
      domain,
      description,
      eligibility,
      requiredSkills,
      location,
      mode,
      startDate,
      duration,
      deadline,
      availableSlots,
      applicationLink,
    } = data;

    const opportunity = await prisma.internshipOpportunity.create({
      data: {
        companyName,
        role,
        domain: domain || "Software Engineering",
        description,
        eligibility,
        requiredSkills,
        location,
        mode: mode || "HYBRID",
        startDate,
        duration: duration || "2 Months",
        deadline,
        availableSlots: availableSlots || 5,
        applicationLink,
        postedBy: session.id,
      },
    });

    return NextResponse.json({ opportunity });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

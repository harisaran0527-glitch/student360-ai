import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const drives = await prisma.placementDrive.findMany({
      include: {
        records: { select: { studentId: true, status: true } },
      },
      orderBy: { driveDate: "asc" },
    });

    return NextResponse.json({ drives });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN" && session.role !== "FACULTY")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      companyName,
      driveName,
      role,
      description,
      eligibility,
      minCgpa,
      allowedDepartments,
      batchId,
      requiredSkills,
      location,
      packageCtc,
      deadline,
      driveDate,
      applicationLink,
    } = await req.json();

    if (!companyName || !role || !deadline || !driveDate) {
      return NextResponse.json(
        { error: "companyName, role, deadline, and driveDate are required" },
        { status: 400 }
      );
    }

    const drive = await prisma.placementDrive.create({
      data: {
        companyName,
        driveName: driveName || `${companyName} Recruitment Drive`,
        role,
        description: description || "On-campus placement drive",
        eligibility: eligibility || "Eligible for 7th & 8th Semester Students",
        minCgpa: minCgpa || 6.0,
        allowedDepartments,
        batchId,
        requiredSkills,
        location: location || "On Campus",
        packageCtc: packageCtc || 6.5,
        deadline,
        driveDate,
        applicationLink,
        postedBy: session.id,
      },
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "CREATE_PLACEMENT_DRIVE",
        entityType: "PlacementDrive",
        entityId: drive.id,
        details: JSON.stringify({ companyName, role, packageCtc, postedBy: session.email }),
      },
    });

    return NextResponse.json({ drive });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

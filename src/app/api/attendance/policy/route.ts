import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let policy = await prisma.attendancePolicy.findFirst();
    if (!policy) {
      policy = await prisma.attendancePolicy.create({
        data: {
          minAttendancePercentage: 75.0,
          countOdAsPresent: true,
          countInternshipAsPresent: true,
          countMedicalAsPresent: false,
          allowLateCount: true,
        },
      });
    }

    return NextResponse.json({ policy });
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

    const { minAttendancePercentage, countOdAsPresent, countInternshipAsPresent, countMedicalAsPresent, allowLateCount } = await req.json();

    let policy = await prisma.attendancePolicy.findFirst();
    if (policy) {
      policy = await prisma.attendancePolicy.update({
        where: { id: policy.id },
        data: {
          minAttendancePercentage: minAttendancePercentage ?? policy.minAttendancePercentage,
          countOdAsPresent: countOdAsPresent ?? policy.countOdAsPresent,
          countInternshipAsPresent: countInternshipAsPresent ?? policy.countInternshipAsPresent,
          countMedicalAsPresent: countMedicalAsPresent ?? policy.countMedicalAsPresent,
          allowLateCount: allowLateCount ?? policy.allowLateCount,
        },
      });
    } else {
      policy = await prisma.attendancePolicy.create({
        data: {
          minAttendancePercentage: minAttendancePercentage || 75.0,
          countOdAsPresent: countOdAsPresent ?? true,
          countInternshipAsPresent: countInternshipAsPresent ?? true,
          countMedicalAsPresent: countMedicalAsPresent ?? false,
          allowLateCount: allowLateCount ?? true,
        },
      });
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "UPDATE_ATTENDANCE_POLICY",
        entityType: "AttendancePolicy",
        entityId: policy.id,
        details: JSON.stringify({ policy, updatedBy: session.email }),
      },
    });

    return NextResponse.json({ policy });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

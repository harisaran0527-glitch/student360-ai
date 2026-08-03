import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, batchId, graduationAcademicYear, transitionToAlumni } = await req.json();

    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { department: true },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const eligibleStudents = await prisma.studentProfile.findMany({
      where: {
        batchId,
        isArchived: false,
        OR: [{ currentSemester: 8 }, { academicStatus: "GRADUATED" }],
      },
      include: {
        department: true,
        placementRecords: true,
      },
    });

    if (action === "preview") {
      const previewList = eligibleStudents.map((st) => {
        const selectedPlacement = st.placementRecords.find((p) => p.status === "SELECTED");
        return {
          studentId: st.id,
          registerNo: st.registerNo,
          fullName: st.fullName,
          departmentCode: st.department?.code,
          cgpa: st.cgpa,
          currentStatus: st.academicStatus,
          placementStatus: selectedPlacement
            ? `Placed @ ${selectedPlacement.companyName} (${selectedPlacement.packageLpa} LPA)`
            : "Not Placed / Seeking Higher Studies",
        };
      });

      return NextResponse.json({
        batchName: batch.name,
        totalEligible: previewList.length,
        previewList,
      });
    }

    if (action === "execute") {
      let count = 0;
      const acadYear = graduationAcademicYear || `${batch.expectedGraduationYear - 1}-${batch.expectedGraduationYear}`;

      for (const st of eligibleStudents) {
        const newStatus = transitionToAlumni ? "ALUMNI" : "GRADUATED";

        // Update StudentProfile
        await prisma.studentProfile.update({
          where: { id: st.id },
          data: {
            academicStatus: newStatus,
            graduationDate: new Date().toISOString().split("T")[0],
            graduationAcademicYear: acadYear,
            finalCgpa: st.cgpa,
          },
        });

        // Create or update AlumniRecord
        await prisma.alumniRecord.upsert({
          where: { studentId: st.id },
          update: {
            graduationYear: batch.expectedGraduationYear,
          },
          create: {
            studentId: st.id,
            graduationYear: batch.expectedGraduationYear,
            country: "India",
          },
        });

        count++;
      }

      // Update Batch status to GRADUATED
      await prisma.batch.update({
        where: { id: batchId },
        data: { status: "GRADUATED" },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: session.id,
          userEmail: session.email,
          userRole: session.role,
          action: transitionToAlumni ? "TRANSITION_BATCH_TO_ALUMNI" : "GRADUATE_BATCH",
          entityType: "Batch",
          entityId: batchId,
          details: JSON.stringify({
            batchName: batch.name,
            graduatedCount: count,
            graduationAcademicYear: acadYear,
            executedBy: session.email,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully processed graduation for ${count} students in Batch ${batch.name}. Status: ${
          transitionToAlumni ? "ALUMNI" : "GRADUATED"
        }.`,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use 'preview' or 'execute'" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

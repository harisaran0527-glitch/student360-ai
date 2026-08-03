import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const archiveRecords = await prisma.archiveRecord.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ archiveRecords });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Admin required for cold-storage archival" }, { status: 403 });
    }

    const { studentId, batchId, reason } = await req.json();

    if (studentId) {
      // Archive single student
      const student = await prisma.studentProfile.findUnique({
        where: { id: studentId },
        include: {
          department: true,
          batch: true,
          section: true,
          attendances: true,
          academicRecords: { include: { course: true } },
          internships: true,
          certificates: true,
          achievements: true,
          projects: true,
          skills: true,
          placementRecords: true,
          alumniRecord: true,
        },
      });

      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      // Create immutable 10+ year JSON snapshot
      const snapshot = JSON.stringify(student);

      const archiveEntry = await prisma.archiveRecord.create({
        data: {
          studentRegisterNo: student.registerNo,
          studentName: student.fullName,
          batchName: student.batch.name,
          departmentCode: student.department.code,
          archivedReason: reason || "Graduation & Cold Storage Retention",
          fullBackupSnapshot: snapshot,
          archivedBy: session.email,
        },
      });

      // Update student profile status
      await prisma.studentProfile.update({
        where: { id: studentId },
        data: {
          isArchived: true,
          archivedAt: new Date(),
          archiveReason: reason || "10+ Year Cold Storage Archival",
          academicStatus: "ARCHIVED",
        },
      });

      await logAuditEvent({
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "COLD_STORAGE_ARCHIVE_CREATE",
        entityType: "ArchiveRecord",
        entityId: archiveEntry.id,
        details: { registerNo: student.registerNo },
      });

      return NextResponse.json({ success: true, archiveEntry });
    } else if (batchId) {
      // Batch-level archival (e.g. archiving graduating batch)
      const batchStudents = await prisma.studentProfile.findMany({
        where: { batchId, isArchived: false },
        include: {
          department: true,
          batch: true,
          section: true,
          attendances: true,
          academicRecords: { include: { course: true } },
          internships: true,
          certificates: true,
          achievements: true,
          projects: true,
          skills: true,
          placementRecords: true,
          alumniRecord: true,
        },
      });

      let archivedCount = 0;
      for (const st of batchStudents) {
        const snapshot = JSON.stringify(st);
        await prisma.archiveRecord.create({
          data: {
            studentRegisterNo: st.registerNo,
            studentName: st.fullName,
            batchName: st.batch.name,
            departmentCode: st.department.code,
            archivedReason: reason || `Batch ${st.batch.name} Archival Rollover`,
            fullBackupSnapshot: snapshot,
            archivedBy: session.email,
          },
        });

        await prisma.studentProfile.update({
          where: { id: st.id },
          data: {
            isArchived: true,
            archivedAt: new Date(),
            academicStatus: "ARCHIVED",
          },
        });
        archivedCount++;
      }

      await prisma.batch.update({
        where: { id: batchId },
        data: { isArchived: true },
      });

      await logAuditEvent({
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "BATCH_COLD_STORAGE_ARCHIVE",
        entityType: "Batch",
        entityId: batchId,
        details: { count: archivedCount },
      });

      return NextResponse.json({ success: true, archivedCount });
    }

    return NextResponse.json({ error: "Specify studentId or batchId" }, { status: 400 });
  } catch (error: any) {
    console.error("Archive POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

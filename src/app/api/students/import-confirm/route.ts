import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { selectedRows } = await req.json();
    if (!selectedRows || !Array.isArray(selectedRows) || selectedRows.length === 0) {
      return NextResponse.json({ error: "No records selected for import" }, { status: 400 });
    }

    const defaultPasswordHash = await bcrypt.hash("Student@360", 10);
    let importedCount = 0;

    for (const row of selectedRows) {
      // Create user account if not exists
      let user = await prisma.user.findUnique({ where: { email: row.email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: row.email,
            passwordHash: defaultPasswordHash,
            fullName: row.fullName,
            role: "STUDENT",
          },
        });
      }

      // Check section or find/create section if provided
      let sectionId = null;
      if (row.sectionName && row.departmentId && row.batchId) {
        let sec = await prisma.section.findFirst({
          where: {
            departmentId: row.departmentId,
            batchId: row.batchId,
            name: row.sectionName,
          },
        });
        if (!sec) {
          sec = await prisma.section.create({
            data: {
              name: row.sectionName,
              departmentId: row.departmentId,
              batchId: row.batchId,
            },
          });
        }
        sectionId = sec.id;
      }

      // Create permanent student master record
      await prisma.studentProfile.create({
        data: {
          userId: user.id,
          registerNo: row.registerNo,
          rollNo: row.rollNo,
          admissionNo: row.admissionNo,
          fullName: row.fullName,
          gender: row.gender || "Male",
          dob: row.dob || "2004-06-15",
          bloodGroup: row.bloodGroup,
          email: row.email,
          phone: row.phone || "9876543210",
          aadharNo: row.aadharNo,
          fatherName: row.fatherName || "Father Name",
          motherName: row.motherName || "Mother Name",
          guardianPhone: row.guardianPhone,
          emergencyPhone: row.emergencyPhone || "9876543210",
          addressLine1: row.addressLine1 || "Address Line 1",
          addressLine2: row.addressLine2,
          city: row.city || "Chennai",
          state: row.state || "Tamil Nadu",
          pincode: row.pincode || "600001",
          departmentId: row.departmentId,
          batchId: row.batchId,
          sectionId,
          academicYear: row.academicYear || DEFAULT_ACADEMIC_YEAR,
          currentSemester: row.currentSemester || 1,
          entryType: row.entryType || "REGULAR",
          admissionQuota: row.admissionQuota || "GOVERNMENT",
          residenceType: row.residenceType || "DAY_SCHOLAR",
          admissionDate: row.admissionDate || new Date().toISOString().split("T")[0],
          academicStatus: "PURSUING",
        },
      });

      importedCount++;
    }

    // Record Audit Log for Excel Bulk Import
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "BULK_IMPORT_EXCEL",
        entityType: "StudentProfile",
        details: JSON.stringify({
          importedRecordsCount: importedCount,
          timestamp: new Date().toISOString(),
          importedBy: session.email,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedCount} permanent student master profiles.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

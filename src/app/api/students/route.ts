import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { getOrCreateDefaultDepartment } from "@/lib/departmentEngine";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { apiSuccess, apiError, serverError, logApiPerf } from "@/lib/apiResponse";
import { invalidateServerMetadataCache } from "@/lib/serverCache";

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const tAuthStart = Date.now();
    const session = await getSession(req);
    const authTime = Date.now() - tAuthStart;

    if (!session) return apiError("Unauthorized", 401);

    const connectTime = 0;
    const pingTime = 0;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const batchId = searchParams.get("batchId") || "";
    const sectionId = searchParams.get("sectionId") || "";
    const academicYear = searchParams.get("academicYear") || "";
    const currentSemester = searchParams.get("currentSemester") || "";
    const academicStatus = searchParams.get("academicStatus") || "";
    const quota = searchParams.get("quota") || searchParams.get("admissionQuota") || "";
    const isArchived = searchParams.get("isArchived") === "true";
    const sortBy = searchParams.get("sortBy") || "registerNo";
    const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const departmentId = searchParams.get("departmentId") || "";

    const where: any = {
      isArchived,
    };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (search) {
      const trimmed = search.trim();
      if (trimmed) {
        where.OR = [
          { fullName: { contains: trimmed, mode: "insensitive" } },
          { registerNo: { contains: trimmed, mode: "insensitive" } },
          { rollNo: { contains: trimmed, mode: "insensitive" } },
          { admissionNo: { contains: trimmed, mode: "insensitive" } },
          { email: { contains: trimmed, mode: "insensitive" } },
          { institutionalEmail: { contains: trimmed, mode: "insensitive" } },
        ];
      }
    }

    if (batchId) where.batchId = batchId;
    if (sectionId) where.sectionId = sectionId;
    if (academicYear && academicYear !== "ALL") {
      where.academicYear = academicYear;
    }
    if (currentSemester) where.currentSemester = parseInt(currentSemester, 10);
    if (academicStatus) where.academicStatus = academicStatus;

    // Quota Filter
    if (quota && quota !== "ALL") {
      const q = String(quota).trim().toUpperCase();
      if (q === "GOVERNMENT QUOTA" || q === "GOVERNMENT" || q === "GQ") {
        where.admissionQuota = "GQ";
      } else if (q === "MANAGEMENT QUOTA" || q === "MANAGEMENT" || q === "MQ") {
        where.admissionQuota = "MQ";
      } else {
        where.admissionQuota = quota;
      }
    }

    // Optimized findMany including only needed relations
    const tFindStart = Date.now();
    const students = await prisma.studentProfile.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            code: true,
          },
        },
        batch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });
    const findManyTime = Date.now() - tFindStart;

    let total = 0;
    let countTime = 0;
    if (page === 1 && students.length < limit) {
      total = students.length;
    } else {
      const tCountStart = Date.now();
      total = await prisma.studentProfile.count({ where });
      countTime = Date.now() - tCountStart;
    }

    const routeTime = Date.now() - startTime;

    const perfMetrics = {
      authTime,
      connectTime,
      pingTime,
      findManyTime,
      countTime,
      routeTime,
      serverTotalTime: Date.now() - startTime,
    };

    logApiPerf("GET /api/students", startTime);
    return apiSuccess({
      students,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      perfMetrics,
    });
  } catch (error: any) {
    return serverError(error.message || "Failed to fetch students");
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const data = await req.json();
    const {
      registerNo,
      rollNo,
      admissionNo,
      fullName,
      gender,
      dob,
      bloodGroup,
      email,
      password,
      phone,
      aadharNo,
      fatherName,
      motherName,
      guardianPhone,
      emergencyPhone,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      departmentId,
      batchId,
      sectionId,
      academicYear,
      currentSemester,
      entryType,
      admissionQuota,
      residenceType,
      admissionDate,
      religion,
      community,
      motherTongue,
      degreeLevel,
      reservation75,
      firstGraduate,
      profilePic,
    } = data;

    const finalInstitutionalEmail = String(data.institutionalEmail || data.email || "").trim().toLowerCase();
    const finalPersonalEmail = data.personalEmail ? String(data.personalEmail).trim().toLowerCase() : null;

    if (!registerNo || !fullName || !finalInstitutionalEmail) {
      return apiError("Register Number, Full Name, and Institutional Email ID are required.", 400);
    }

    // Validate and Normalize Admission Quota
    let normalizedQuota = "";
    if (admissionQuota) {
      const q = String(admissionQuota).trim().toUpperCase();
      if (q === "GOVERNMENT QUOTA" || q === "GOVERNMENT" || q === "GQ") {
        normalizedQuota = "GQ";
      } else if (q === "MANAGEMENT QUOTA" || q === "MANAGEMENT" || q === "MQ") {
        normalizedQuota = "MQ";
      }
    }

    if (!normalizedQuota) {
      return apiError("Please select Government Quota or Management Quota.", 400);
    }

    // 1. Prevent duplicate Register Number, Admission Number, or Institutional Email
    const existing = await prisma.studentProfile.findFirst({
      where: {
        OR: [
          { registerNo },
          { admissionNo: admissionNo || registerNo },
          { email: finalInstitutionalEmail },
          { institutionalEmail: finalInstitutionalEmail },
        ],
      },
    });

    if (existing) {
      return apiError(
        "A student with this Register Number, Admission Number, or Institutional Email ID already exists.",
        400
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: finalInstitutionalEmail },
    });

    if (existingUser) {
      return apiError(
        "A user account with this Institutional Email ID already exists.",
        400
      );
    }

    // Validate and Normalize relation IDs
    const finalSectionId = (sectionId && String(sectionId).trim()) ? String(sectionId).trim() : null;
    if (finalSectionId) {
      const sectionExists = await prisma.section.findUnique({
        where: { id: finalSectionId },
      });
      if (!sectionExists) {
        return apiError("Selected section no longer exists. Please select a valid section.", 400);
      }
    }

    const finalDepartmentId = (departmentId && String(departmentId).trim()) ? String(departmentId).trim() : null;
    if (finalDepartmentId) {
      const deptExists = await prisma.department.findUnique({
        where: { id: finalDepartmentId },
      });
      if (!deptExists) {
        return apiError("Selected department no longer exists. Please select a valid department.", 400);
      }
    }

    const finalBatchIdPassed = (batchId && String(batchId).trim()) ? String(batchId).trim() : null;
    if (finalBatchIdPassed) {
      const batchExists = await prisma.batch.findUnique({
        where: { id: finalBatchIdPassed },
      });
      if (!batchExists) {
        return apiError("Selected batch no longer exists. Please select a valid batch.", 400);
      }
    }

    const dept = await getOrCreateDefaultDepartment();
    const targetYearCode = academicYear || DEFAULT_ACADEMIC_YEAR;

    let acadYearObj = await prisma.academicYear.findUnique({ where: { yearCode: targetYearCode } });
    if (!acadYearObj) {
      acadYearObj = await prisma.academicYear.create({
        data: {
          yearCode: targetYearCode,
          name: `Academic Year ${targetYearCode}`,
          status: "ACTIVE",
        },
      });
    }

    // Determine target batch if not explicitly passed
    let finalBatchId = batchId;
    if (!finalBatchId) {
      const admissionStartYear = parseInt(targetYearCode.split("-")[0], 10) || 2025;
      const batchName = `${admissionStartYear}-${admissionStartYear + 4}`;
      let batchObj = await prisma.batch.findUnique({ where: { name: batchName } });
      if (!batchObj) {
        batchObj = await prisma.batch.create({
          data: {
            name: batchName,
            admissionYear: admissionStartYear,
            expectedGraduationYear: admissionStartYear + 4,
            departmentId: dept.id,
            totalSemesters: 8,
            currentSemester: 1,
            status: "ACTIVE",
          },
        });
      }
      finalBatchId = batchObj.id;
    }

    if (!password) {
      return apiError("Student Login Password is required for account creation.", 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Atomic transaction for profile + user account + notifications
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Student Portal Login User (uses Institutional Email)
      const user = await tx.user.create({
        data: {
          email: finalInstitutionalEmail,
          passwordHash,
          fullName,
          role: "STUDENT",
        },
      });

      // 2. Create Student Profile linked to AY, Batch & AI & ML Department
      const student = await tx.studentProfile.create({
        data: {
          userId: user.id,
          registerNo,
          rollNo: rollNo || registerNo,
          admissionNo: admissionNo || registerNo,
          fullName,
          gender: gender || "Male",
          dob: dob || "2005-06-15",
          bloodGroup: bloodGroup || "O+",
          email: finalInstitutionalEmail,
          institutionalEmail: finalInstitutionalEmail,
          personalEmail: finalPersonalEmail,
          phone: phone || "9876543210",
          aadharNo,
          profilePic: profilePic || null,
          fatherName: fatherName || "Father Name",
          motherName: motherName || "Mother Name",
          guardianPhone,
          emergencyPhone: emergencyPhone || "9876543210",
          addressLine1: addressLine1 || "Department of AI & ML, Campus",
          addressLine2,
          city: city || "Chennai",
          state: state || "Tamil Nadu",
          pincode: pincode || "600001",
          departmentId: finalDepartmentId || dept.id,
          batchId: finalBatchIdPassed || finalBatchId,
          sectionId: finalSectionId,
          academicYear: targetYearCode,
          admissionAcademicYearId: acadYearObj.id,
          currentSemester: currentSemester || 1,
          entryType: entryType || "REGULAR",
          admissionQuota: normalizedQuota,
          residenceType: residenceType || "DAY_SCHOLAR",
          admissionDate: admissionDate || new Date().toISOString().split("T")[0],
          academicStatus: "PURSUING",
          religion: religion || null,
          community: community || null,
          motherTongue: motherTongue || null,
          degreeLevel: degreeLevel || null,
          reservation75: reservation75 || null,
          firstGraduate: firstGraduate || null,
        },
      });

      // 3. Welcome Notification Record
      await tx.notification.create({
        data: {
          userId: user.id,
          studentId: student.id,
          type: "WELCOME_LOGIN",
          title: "Welcome to Student360 AI Student Portal",
          message: `Your login account for Department of AI & ML has been created. Login Email: ${finalInstitutionalEmail}. Please change your password upon first login.`,
          priority: "HIGH",
          emailRequired: true,
          emailStatus: process.env.SMTP_HOST ? "PENDING" : "DEVELOPMENT_EMAIL_PENDING",
        },
      });

      // 4. Write Audit Log
      await tx.auditLog.create({
        data: {
          userId: session.id,
          userEmail: session.email,
          userRole: session.role,
          action: "ADD_STUDENT",
          entityType: "StudentProfile",
          entityId: student.id,
          details: `Created student ${fullName} (${registerNo}) in Department of AI & ML under Academic Year ${targetYearCode} with Quota ${normalizedQuota}`,
        },
      });

      return student;
    });

    invalidateServerMetadataCache();
    logApiPerf("POST /api/students", startTime);
    return apiSuccess({ student: result }, "Student created successfully with portal login.", 201);
  } catch (error: any) {
    console.error("[STUDENTS_POST_ERROR] Failed to create student profile:", error);
    return apiError(error.message || "Failed to create student profile", 500);
  }
}

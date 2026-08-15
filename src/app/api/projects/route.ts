import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { getAcademicYearFromRequest } from "@/lib/academicYearEngine";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const semester = searchParams.get("semester");
    const status = searchParams.get("status");
    const academicYear = getAcademicYearFromRequest(req);

    const where: any = {};
    if (session.role === "STUDENT") {
      where.studentId = session.studentProfileId;
    } else if (studentId) {
      where.studentId = studentId;
    }

    if (semester) where.semester = parseInt(semester, 10);
    if (status) where.status = status;
    if (academicYear && session.role !== "STUDENT") {
      where.student = { academicYear };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            registerNo: true,
          },
        },
        certificates: true,
      },
      orderBy: { createdAt: "desc" },
    });

    logApiPerf("GET /api/projects", startTime);
    return apiSuccess({ projects });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch projects", 500);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session) return apiError("Unauthorized", 401);

    if (session.role === "STUDENT") {
      return apiError("Forbidden: Student Portal is strict READ-ONLY. Only Admins can manage projects.", 403);
    }

    const data = await req.json();
    const {
      studentId,
      title,
      description,
      detailedDescription,
      projectType,
      academicYearCode,
      semester,
      category,
      techStack,
      toolsUsed,
      languages,
      domain,
      facultyMentor,
      teamMembers,
      problemStatement,
      objectives,
      githubUrl,
      demoUrl,
      liveUrl,
      presentationUrl,
      documentUrl,
      screenshots,
      startDate,
      completionDate,
    } = data;

    if (!studentId || !title || !description || !techStack) {
      return apiError("studentId, title, description, and techStack are required", 400);
    }

    const pType = projectType || "SOFTWARE";

    // Conditional Validation for SOFTWARE vs HARDWARE
    if (pType === "SOFTWARE" && !liveUrl && !githubUrl) {
      return apiError("Software projects require a GitHub Repository URL or Software Live Demo URL.", 400);
    }

    if (pType === "HARDWARE" && !screenshots) {
      return apiError("Hardware projects require a Hardware Model Photo Upload URL.", 400);
    }

    const project = await prisma.project.create({
      data: {
        studentId,
        title,
        description,
        detailedDescription,
        projectType: pType,
        academicYearCode: academicYearCode || DEFAULT_ACADEMIC_YEAR,
        semester: semester || 1,
        category: category || (pType === "HARDWARE" ? "Embedded & IoT" : "Software Engineering"),
        techStack,
        toolsUsed,
        languages,
        domain: domain || "AI & Software Systems",
        facultyMentor,
        teamMembers: teamMembers ? JSON.stringify(teamMembers) : undefined,
        problemStatement,
        objectives,
        githubUrl,
        demoUrl,
        liveUrl,
        presentationUrl,
        documentUrl,
        screenshots,
        startDate,
        completionDate,
        status: "COMPLETED",
      },
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
        action: "CREATE_PROJECT",
        entityType: "Project",
        entityId: project.id,
        details: JSON.stringify({ title, projectType: pType, submittedBy: session.email }),
      },
    });

    logApiPerf("POST /api/projects", startTime);
    return apiSuccess({ project }, "Project record added successfully.", 201);
  } catch (error: any) {
    return apiError(error.message || "Failed to add project record", 500);
  }
}

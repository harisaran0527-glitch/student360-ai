import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, createSessionToken, setSessionCookie, Role } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return apiError("Email and password required", 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: true,
      },
    });

    if (!user || !user.isActive) {
      return apiError("Invalid email or password.", 401);
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return apiError("Invalid email or password.", 401);
    }

    const userRole = user.role as Role;

    // STRICT: Only STUDENT may use this endpoint
    if (userRole !== "STUDENT") {
      return apiError("Invalid email or password.", 401);
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: userRole,
      studentId: user.studentProfile?.id,
      registerNo: user.studentProfile?.registerNo,
    });

    await setSessionCookie(token);

    try {
      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: "USER_LOGIN",
        entityType: "User",
        entityId: user.id,
        details: { role: user.role, portal: "STUDENT" },
      });
    } catch (auditErr) {
      console.warn("Audit logging skipped:", auditErr);
    }

    logApiPerf("POST /api/auth/student-login", startTime);
    const response = apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    }, "Login successful");

    await setSessionCookie(token, response);
    return response;
  } catch (error: any) {
    console.error("[AUTH_API_ERROR] Route: POST /api/auth/student-login | Status: 500", {
      code: error?.code || "UNKNOWN_ERROR",
      name: error?.name || "Error",
      message: error?.message || "An unexpected error occurred",
    });
    return apiError("Internal server error during authentication", 500);
  }
}

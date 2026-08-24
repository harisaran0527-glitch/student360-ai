import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";
import { runAttendanceReconciliation } from "@/lib/attendanceReconciliation";

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized: Admin access required.", 401);
    }

    // Run dry-run reconciliation report without mutating database
    const report = await runAttendanceReconciliation(true);

    logApiPerf("GET /api/admin/attendance/reconcile", startTime);
    return apiSuccess({ report, dryRun: true }, "Attendance recovery report generated successfully.", 200);
  } catch (error: any) {
    console.error("[GET /api/admin/attendance/reconcile Error]", error);
    return apiError(error.message || "Failed to generate attendance recovery report", 500);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized: Admin access required.", 401);
    }

    // Execute actual non-destructive reconciliation and recalculation
    const report = await runAttendanceReconciliation(false);

    logApiPerf("POST /api/admin/attendance/reconcile", startTime);
    return apiSuccess({ report, dryRun: false }, "Historical attendance records reconciled and percentages updated successfully.", 200);
  } catch (error: any) {
    console.error("[POST /api/admin/attendance/reconcile Error]", error);
    return apiError(error.message || "Failed to reconcile historical attendance records", 500);
  }
}

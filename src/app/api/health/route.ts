import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveStorageProvider } from "@/lib/storage";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "HEALTHY";
  let dbLatencyMs = 0;

  let dbError = "";
  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
  } catch (err: any) {
    dbStatus = "UNHEALTHY";
    dbError = err.message || String(err);
  }

  const storageProvider = getActiveStorageProvider();
  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  const gitCommit = process.env.RENDER_GIT_COMMIT || "local";

  const dbUrl = process.env.DATABASE_URL || "";
  let dbHost = "";
  let dbPort = "";
  try {
    const match = dbUrl.match(/@([^:\/]+)(?::(\d+))?/);
    if (match) {
      dbHost = match[1];
      dbPort = match[2] || "5432";
    }
  } catch (e) {}

  const status = dbStatus === "HEALTHY" ? 200 : 503;

  return NextResponse.json(
    {
      status: dbStatus === "HEALTHY" ? "UP" : "DOWN",
      system: "Student360 AI Enterprise ERP",
      environment: process.env.NODE_ENV || "development",
      commit: gitCommit,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      components: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
          host: dbHost,
          port: dbPort,
          error: dbError || undefined,
        },
        storage: {
          provider: storageProvider,
          status: "CONFIGURED",
        },
        notificationsEmail: {
          status: smtpConfigured ? "CONFIGURED" : "NOT_CONFIGURED",
        },
      },
    },
    { status }
  );
}

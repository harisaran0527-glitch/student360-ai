import { NextResponse } from "next/server";

export function apiSuccess<T>(data: T, message: string = "Success", status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

export function apiError(
  message: string = "An error occurred",
  status: number = 400,
  errors: Record<string, string> | null = null
) {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(errors ? { errors } : {}),
    },
    { status }
  );
}

export function logApiPerf(route: string, startTime: number) {
  const duration = Date.now() - startTime;
  if (process.env.NODE_ENV !== "production") {
    console.log(`[PERF] ${route} completed in ${duration}ms`);
  }
}

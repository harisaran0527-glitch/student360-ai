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

export function badRequest(message: string = "Bad Request", errors: Record<string, string> | null = null) {
  return apiError(message, 400, errors);
}

export function unauthorized(message: string = "Unauthorized access") {
  return apiError(message, 401);
}

export function forbidden(message: string = "Forbidden resource") {
  return apiError(message, 403);
}

export function notFound(message: string = "Resource not found") {
  return apiError(message, 404);
}

export function conflict(message: string = "Resource conflict") {
  return apiError(message, 409);
}

export function serverError(message: string = "Internal server error") {
  // Sanitize any accidental error messages to ensure zero sensitive info leak
  const sanitizedMessage = typeof message === "string" && !message.includes("DATABASE_URL") && !message.includes("JWT")
    ? message
    : "An unexpected internal server error occurred. Please try again.";
  return apiError(sanitizedMessage, 500);
}

export function logApiPerf(route: string, startTime: number) {
  const duration = Date.now() - startTime;
  if (process.env.NODE_ENV !== "production") {
    console.log(`[PERF] ${route} completed in ${duration}ms`);
  }
}

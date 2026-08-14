import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiSuccess, apiError, logApiPerf } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const busNo = searchParams.get("busNo") || "";
    const routeFilter = searchParams.get("route") || "";
    const boardingPoint = searchParams.get("boardingPoint") || "";

    const where: any = {};

    if (busNo && busNo !== "ALL") {
      where.busNo = { equals: busNo, mode: "insensitive" };
    }
    if (routeFilter && routeFilter !== "ALL") {
      where.route = { equals: routeFilter, mode: "insensitive" };
    }
    if (boardingPoint && boardingPoint !== "ALL") {
      where.boardingPoint = { equals: boardingPoint, mode: "insensitive" };
    }

    if (search) {
      where.student = {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { registerNo: { contains: search, mode: "insensitive" } },
          { rollNo: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const busRecords = await prisma.busRecord.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            registerNo: true,
            rollNo: true,
            residenceType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    logApiPerf("GET /api/bus", startTime);
    return apiSuccess({ busRecords });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch bus records", 500);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized: Only Admin can create bus records.", 403);
    }

    const data = await req.json();
    const { studentId, resident, busNo, route, boardingPoint } = data;

    if (!studentId || !resident || !busNo || !route || !boardingPoint) {
      return apiError("All fields (Student, Resident, BusNo, Route, Boarding Point) are required.", 400);
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return apiError("Selected student profile not found.", 404);
    }

    const existingRecord = await prisma.busRecord.findUnique({
      where: { studentId },
    });

    if (existingRecord) {
      return apiError("A bus record already exists for this student. Please edit the existing record.", 400);
    }

    const busRecord = await prisma.busRecord.create({
      data: {
        studentId,
        resident: String(resident).trim(),
        busNo: String(busNo).trim(),
        route: String(route).trim(),
        boardingPoint: String(boardingPoint).trim(),
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            registerNo: true,
            rollNo: true,
            residenceType: true,
          },
        },
      },
    });

    logApiPerf("POST /api/bus", startTime);
    return apiSuccess({ busRecord }, "Bus record created successfully.", 201);
  } catch (error: any) {
    return apiError(error.message || "Failed to create bus record", 500);
  }
}

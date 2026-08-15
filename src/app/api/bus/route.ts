import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiSuccess, apiError, serverError, logApiPerf } from "@/lib/apiResponse";

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

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

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

    // 1. Fetch paginated records with minimal select fields
    const busRecords = await prisma.busRecord.findMany({
      where,
      select: {
        id: true,
        resident: true,
        busNo: true,
        route: true,
        boardingPoint: true,
        createdAt: true,
        student: {
          select: {
            id: true,
            fullName: true,
            registerNo: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    // 2. Fetch total count for pagination
    const total = await prisma.busRecord.count({ where });

    // 3. Fetch unique filter option dropdown values sequentially to respect connection_limit=1
    const uniqueBusNosObj = await prisma.busRecord.groupBy({
      by: ["busNo"],
    });
    const uniqueRoutesObj = await prisma.busRecord.groupBy({
      by: ["route"],
    });
    const uniqueBoardingPointsObj = await prisma.busRecord.groupBy({
      by: ["boardingPoint"],
    });

    const uniqueBusNos = uniqueBusNosObj.map((b) => b.busNo).filter(Boolean).sort();
    const uniqueRoutes = uniqueRoutesObj.map((r) => r.route).filter(Boolean).sort();
    const uniqueBoardingPoints = uniqueBoardingPointsObj.map((bp) => bp.boardingPoint).filter(Boolean).sort();

    logApiPerf("GET /api/bus", startTime);
    return apiSuccess({
      busRecords,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      uniqueBusNos,
      uniqueRoutes,
      uniqueBoardingPoints,
    });
  } catch (error: any) {
    return serverError(error.message || "Failed to fetch bus records");
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

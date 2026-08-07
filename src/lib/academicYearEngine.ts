import { prisma } from "@/lib/prisma";

export interface AcademicYearConfig {
  yearCode: string; // e.g. "2025-2026"
  name: string;
  startDate: string; // "2025-06-01"
  endDate: string;   // "2026-05-31"
  status: "ACTIVE" | "CLOSED" | "ARCHIVED";
  isCurrent: boolean;
}

export function calculateAcademicYearForDate(targetDate: Date = new Date()): { yearCode: string; name: string; startDate: string; endDate: string } {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1; // 1 to 12

  // Academic Year starts in June (Month 6) with 4-year range (endYear = startYear + 4)
  let startYear = year;
  let endYear = year + 4;

  if (month < 6) {
    startYear = year - 1;
    endYear = startYear + 4;
  }

  // Base year safeguard: Academic Year must be at least 2025-2029
  if (startYear < 2025) {
    startYear = 2025;
    endYear = 2029;
  }

  const yearCode = `${startYear}-${endYear}`;
  const name = `Academic Year ${yearCode}`;
  const startDate = `${startYear}-06-01`;
  const endDate = `${endYear}-05-31`;

  return { yearCode, name, startDate, endDate };
}

export async function ensureCurrentAcademicYear(): Promise<{ activeYearCode: string; createdNew: boolean }> {
  const currentCalc = calculateAcademicYearForDate();

  // Find if academic year exists
  const existing = await prisma.academicYear.findUnique({
    where: { yearCode: currentCalc.yearCode },
  });

  if (existing) {
    if (!existing.isCurrent) {
      await prisma.$transaction([
        prisma.academicYear.updateMany({ data: { isCurrent: false } }),
        prisma.academicYear.update({ where: { id: existing.id }, data: { isCurrent: true } }),
      ]);
    }
    return { activeYearCode: existing.yearCode, createdNew: false };
  }

  // Idempotent automatic creation of new Academic Year
  let newYearObj: any;
  await prisma.$transaction(async (tx) => {
    await tx.academicYear.updateMany({ data: { isCurrent: false } });

    newYearObj = await tx.academicYear.create({
      data: {
        yearCode: currentCalc.yearCode,
        name: currentCalc.name,
        startDate: currentCalc.startDate,
        endDate: currentCalc.endDate,
        status: "ACTIVE",
        isCurrent: true,
        notes: "Automatically created by Dynamic Academic Year Engine based on server date threshold.",
      },
    });

    // Create Admin Notification
    const adminUser = await tx.user.findFirst({ where: { role: "ADMIN" } });
    if (adminUser) {
      await tx.notification.create({
        data: {
          userId: adminUser.id,
          type: "ACADEMIC_YEAR_ROLLOVER",
          title: `New Academic Year ${currentCalc.yearCode} Activated`,
          message: `The system automatically detected server date rollover and initialized Academic Year ${currentCalc.yearCode}. Previous student admission cohorts remain preserved.`,
          priority: "HIGH",
          relatedModule: "ACADEMIC_YEAR",
          relatedRecordId: newYearObj.id,
          deduplicationKey: `AY_ROLLOVER_${currentCalc.yearCode}`,
        },
      });
    }
  });

  return { activeYearCode: currentCalc.yearCode, createdNew: true };
}

export function getAcademicYearFromRequest(req: Request): string | null {
  try {
    const { searchParams } = new URL(req.url);
    const param = searchParams.get("academicYear");
    if (param) {
      return param === "ALL" ? null : param;
    }

    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/selected_academic_year=([^;]+)/);
    if (match && match[1]) {
      const val = decodeURIComponent(match[1]);
      return val === "ALL" ? null : val;
    }
  } catch (err) {
    // Return null if request parsing fails
  }
  return null;
}

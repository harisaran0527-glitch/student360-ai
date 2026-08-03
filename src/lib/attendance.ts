import { prisma } from "@/lib/prisma";

export interface AttendancePolicyConfig {
  minAttendancePercentage: number;
  countOdAsPresent: boolean;
  countInternshipAsPresent: boolean;
  countMedicalAsPresent: boolean;
  allowLateCount: boolean;
}

export const DEFAULT_ATTENDANCE_POLICY: AttendancePolicyConfig = {
  minAttendancePercentage: 75.0,
  countOdAsPresent: true,
  countInternshipAsPresent: true,
  countMedicalAsPresent: false,
  allowLateCount: true,
};

export async function getAttendancePolicy(): Promise<AttendancePolicyConfig> {
  try {
    const policy = await prisma.attendancePolicy.findFirst();
    if (!policy) return DEFAULT_ATTENDANCE_POLICY;
    return {
      minAttendancePercentage: policy.minAttendancePercentage,
      countOdAsPresent: policy.countOdAsPresent,
      countInternshipAsPresent: policy.countInternshipAsPresent,
      countMedicalAsPresent: policy.countMedicalAsPresent,
      allowLateCount: policy.allowLateCount,
    };
  } catch (err) {
    return DEFAULT_ATTENDANCE_POLICY;
  }
}

export function computeAttendanceStats(
  attendanceRecords: Array<{ status: string }>,
  policy: AttendancePolicyConfig = DEFAULT_ATTENDANCE_POLICY
) {
  const totalConducted = attendanceRecords.length;
  if (totalConducted === 0) {
    return {
      totalConducted: 0,
      totalAttended: 0,
      presentCount: 0,
      absentCount: 0,
      odCount: 0,
      internshipCount: 0,
      medicalCount: 0,
      lateCount: 0,
      percentage: 100.0,
      isShortage: false,
    };
  }

  let presentCount = 0;
  let absentCount = 0;
  let odCount = 0;
  let internshipCount = 0;
  let medicalCount = 0;
  let lateCount = 0;

  attendanceRecords.forEach((r) => {
    switch (r.status) {
      case "PRESENT":
        presentCount++;
        break;
      case "ABSENT":
      case "LONG_ABSENT":
        absentCount++;
        break;
      case "OD":
        odCount++;
        break;
      case "INTERNSHIP":
        internshipCount++;
        break;
      case "MEDICAL_LEAVE":
        medicalCount++;
        break;
      case "LATE":
        lateCount++;
        break;
      default:
        break;
    }
  });

  let effectiveAttended = presentCount;
  if (policy.allowLateCount) effectiveAttended += lateCount;
  if (policy.countOdAsPresent) effectiveAttended += odCount;
  if (policy.countInternshipAsPresent) effectiveAttended += internshipCount;
  if (policy.countMedicalAsPresent) effectiveAttended += medicalCount;

  const percentage = Number(((effectiveAttended / totalConducted) * 100).toFixed(1));
  const isShortage = percentage < policy.minAttendancePercentage;

  return {
    totalConducted,
    totalAttended: effectiveAttended,
    presentCount,
    absentCount,
    odCount,
    internshipCount,
    medicalCount,
    lateCount,
    percentage,
    isShortage,
  };
}

import { prisma } from "@/lib/prisma";

export interface AcademicGradeResult {
  internalMarks: number;
  externalMarks: number;
  totalMarks: number;
  grade: string;
  gradePoint: number;
  result: "PASS" | "FAIL";
}

/**
 * Centralized Academic Grading Policy for Student360 AI
 * Internal: 0 - 50
 * External: 0 - 50
 * Total: 0 - 100
 * Sub-minima: Internal >= 20, External >= 20, Total >= 50 for PASS
 */
export function calculateAcademicGrade(
  internalInput: number | string,
  externalInput: number | string
): AcademicGradeResult {
  const internalMarks = Math.min(50, Math.max(0, Number(internalInput) || 0));
  const externalMarks = Math.min(50, Math.max(0, Number(externalInput) || 0));
  const totalMarks = Math.round((internalMarks + externalMarks) * 100) / 100;

  let grade = "RA";
  let gradePoint = 0;
  let result: "PASS" | "FAIL" = "FAIL";

  if (totalMarks >= 50 && externalMarks >= 20 && internalMarks >= 20) {
    result = "PASS";
    if (totalMarks >= 90) {
      grade = "O";
      gradePoint = 10;
    } else if (totalMarks >= 80) {
      grade = "A+";
      gradePoint = 9;
    } else if (totalMarks >= 70) {
      grade = "A";
      gradePoint = 8;
    } else if (totalMarks >= 60) {
      grade = "B+";
      gradePoint = 7;
    } else if (totalMarks >= 50) {
      grade = "B";
      gradePoint = 6;
    }
  } else {
    grade = "RA";
    gradePoint = 0;
    result = "FAIL";
  }

  return {
    internalMarks,
    externalMarks,
    totalMarks,
    grade,
    gradePoint,
    result,
  };
}

/**
 * Recalculate CGPA and SGPA for a student and update StudentProfile & StudentSemesterHistory
 */
export async function recalculateStudentCgpa(studentId: string, semesterToUpdate?: number) {
  try {
    const allRecords = await prisma.academicRecord.findMany({
      where: { studentId },
    });

    if (allRecords.length === 0) return 0.0;

    const gradePointMap: Record<string, number> = {
      O: 10,
      "A+": 9,
      A: 8,
      "B+": 7,
      B: 6,
      RA: 0,
      F: 0,
    };

    // Deduplicate records: if the same courseId exists multiple times, keep the one with the highest grade point.
    const dedupedRecordsMap = new Map<string, typeof allRecords[0]>();
    allRecords.forEach((r) => {
      const existing = dedupedRecordsMap.get(r.courseId);
      if (!existing) {
        dedupedRecordsMap.set(r.courseId, r);
      } else {
        const gpNew = gradePointMap[r.grade] || 0;
        const gpExisting = gradePointMap[existing.grade] || 0;
        if (gpNew > gpExisting) {
          dedupedRecordsMap.set(r.courseId, r);
        }
      }
    });

    const uniqueRecords = Array.from(dedupedRecordsMap.values());

    let totalGradePoints = 0;
    let totalCredits = 0;

    uniqueRecords.forEach((r) => {
      const gp = gradePointMap[r.grade] || 0;
      const credits = r.credits || 3;
      totalGradePoints += gp * credits;
      totalCredits += credits;
    });

    const cgpa = totalCredits > 0 ? Math.round((totalGradePoints / totalCredits) * 100) / 100 : 0.0;

    await prisma.studentProfile.update({
      where: { id: studentId },
      data: { cgpa },
    });

    // Update semester history if semester specified
    if (semesterToUpdate) {
      const semRecords = allRecords.filter((r) => r.semester === semesterToUpdate);
      let semGradePoints = 0;
      let semCredits = 0;
      let semHasFail = false;

      semRecords.forEach((r) => {
        const gp = gradePointMap[r.grade] || 0;
        const credits = r.credits || 3;
        semGradePoints += gp * credits;
        semCredits += credits;
        if (r.result === "FAIL") semHasFail = true;
      });

      const sgpa = semCredits > 0 ? Math.round((semGradePoints / semCredits) * 100) / 100 : 0.0;

      await prisma.studentSemesterHistory.upsert({
        where: {
          studentId_semester: {
            studentId,
            semester: semesterToUpdate,
          },
        },
        create: {
          studentId,
          semester: semesterToUpdate,
          academicYearCode: semRecords[0]?.academicYear || "2025-2029",
          sgpa,
          cgpa,
          result: semHasFail ? "FAIL" : "PASS",
        },
        update: {
          sgpa,
          cgpa,
          result: semHasFail ? "FAIL" : "PASS",
        },
      });
    }

    return cgpa;
  } catch (err) {
    console.error("[RECALCULATE_CGPA_ERROR]", err);
    return 0.0;
  }
}

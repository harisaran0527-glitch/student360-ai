export function calculateAttendancePercentage(records: { status: string }[]): number {
  const activeRecords = records.filter(r => r.status && r.status.toUpperCase() !== "UNMARKED");
  const total = activeRecords.length;
  if (total === 0) return 0.0;

  const present = activeRecords.filter(r => {
    const s = r.status.toUpperCase();
    return s === "PRESENT" || s === "OD" || s === "MEDICAL_LEAVE" || s === "ML";
  }).length;

  return Math.round((present / total) * 100 * 100) / 100;
}

export function runAutomatedAssertions() {
  // Case A: P=9, A=1, Total=10 => 90%
  const caseA = [
    ...Array(9).fill({ status: "PRESENT" }),
    { status: "ABSENT" }
  ];
  const pctA = calculateAttendancePercentage(caseA);
  if (pctA !== 90) throw new Error(`Assertion failed for Case A: expected 90, got ${pctA}`);

  // Case B: P=8, A=2, Total=10 => 80%
  const caseB = [
    ...Array(8).fill({ status: "PRESENT" }),
    ...Array(2).fill({ status: "ABSENT" })
  ];
  const pctB = calculateAttendancePercentage(caseB);
  if (pctB !== 80) throw new Error(`Assertion failed for Case B: expected 80, got ${pctB}`);

  // Case C: P=5, OD=2, ML=1, A=1, Long Absent=1, Total=10 => 80%
  const caseC = [
    ...Array(5).fill({ status: "PRESENT" }),
    ...Array(2).fill({ status: "OD" }),
    { status: "MEDICAL_LEAVE" },
    { status: "ABSENT" },
    { status: "LONG_ABSENT" }
  ];
  const pctC = calculateAttendancePercentage(caseC);
  if (pctC !== 80) throw new Error(`Assertion failed for Case C: expected 80, got ${pctC}`);

  // Student comparison assertion:
  // "If two students have the SAME number of saved attendance days, the student with MORE Absent/Long Absent days must NEVER have a higher percentage."
  const student1 = [
    ...Array(6).fill({ status: "PRESENT" }),
    ...Array(4).fill({ status: "ABSENT" }) // 4 absent/long absent days
  ]; // Total = 10
  const student2 = [
    ...Array(7).fill({ status: "PRESENT" }),
    ...Array(3).fill({ status: "ABSENT" }) // 3 absent/long absent days
  ]; // Total = 10

  const pct1 = calculateAttendancePercentage(student1);
  const pct2 = calculateAttendancePercentage(student2);

  if (pct1 > pct2) {
    throw new Error(`Comparison assertion failed: Student 1 (more absents) has higher percentage ${pct1}% than Student 2 ${pct2}%`);
  }

  console.log("All automated assertions PASSED successfully.");
}

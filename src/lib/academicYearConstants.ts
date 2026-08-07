/**
 * Shared Source of Truth for Academic Year and Batch Options
 * Applies across the ENTIRE Student360 AI Admin Panel.
 */

export const ACADEMIC_YEAR_OPTIONS = [
  "2025-2029",
  "2026-2030",
  "2027-2031",
  "2028-2032",
  "2029-2033",
  "2030-2034",
  "2031-2035",
  "2032-2036",
  "2033-2037",
  "2034-2038",
] as const;

export const BATCH_OPTIONS = [
  "2025-2026",
  "2026-2027",
  "2027-2028",
  "2028-2029",
  "2029-2030",
  "2030-2031",
  "2031-2032",
  "2032-2033",
  "2033-2034",
  "2034-2035",
] as const;

export const DEFAULT_ACADEMIC_YEAR = "2025-2029";
export const DEFAULT_BATCH = "2025-2026";

/**
 * Helper to check if a batch name is selectable (>= 2025-2026).
 * Removes legacy batch values such as 2022-2023, 2023-2024, 2024-2025.
 */
export function isSelectableBatch(batchName: string): boolean {
  if (!batchName) return false;
  const match = batchName.match(/^(\d{4})/);
  if (!match) return false;
  const startYear = parseInt(match[1], 10);
  return startYear >= 2025;
}

/**
 * Helper to check if an academic year string is a valid 4-year range.
 */
export function isSelectableAcademicYear(yearCode: string): boolean {
  if (!yearCode) return false;
  const parts = yearCode.split("-");
  if (parts.length !== 2) return false;
  const start = parseInt(parts[0], 10);
  const end = parseInt(parts[1], 10);
  return !isNaN(start) && !isNaN(end) && end - start === 4 && start >= 2025;
}

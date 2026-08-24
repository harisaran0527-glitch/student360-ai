import { prisma } from "@/lib/prisma";

export const DEFAULT_DEPARTMENT_CODE = "AIML";
export const DEFAULT_DEPARTMENT_NAME = "AI & ML";

let cachedDept: any = null;

export async function getOrCreateDefaultDepartment() {
  if (cachedDept) return cachedDept;

  let dept = await prisma.department.findUnique({
    where: { code: DEFAULT_DEPARTMENT_CODE },
  });

  if (!dept) {
    dept = await prisma.department.create({
      data: {
        code: DEFAULT_DEPARTMENT_CODE,
        name: DEFAULT_DEPARTMENT_NAME,
        hodName: "Head of Department - AI & ML",
      },
    });
  }

  cachedDept = dept;
  return dept;
}

/**
 * UI Normalization Helpers for Department Code & Label Display
 * Maps internal department code "AIDS" to display abbreviation "AI&DS"
 * while preserving internal database IDs and codes.
 */
export function getDepartmentDisplayCode(code?: string | null): string {
  if (!code) return "";
  const upper = code.toUpperCase().trim();
  if (upper === "AIDS") return "AI&DS";
  return code;
}

export function getDepartmentDisplayName(dept?: { code?: string | null; name?: string | null } | null): string {
  if (!dept) return "";
  const code = (dept.code || "").toUpperCase().trim();
  const name = dept.name || "";
  if (code === "AIDS" || name === "Artificial Intelligence & Data Science") {
    return "Artificial Intelligence & Data Science";
  }
  if (code === "AIML" || name === "AI & ML" || name.includes("Artificial Intelligence & Machine")) {
    return "Artificial Intelligence & Machine Learning";
  }
  return name;
}

export function getDepartmentDisplayLabel(dept?: { code?: string | null; name?: string | null } | null): string {
  if (!dept) return "";
  const displayCode = getDepartmentDisplayCode(dept.code);
  const displayName = getDepartmentDisplayName(dept);
  return `${displayCode} — ${displayName}`;
}

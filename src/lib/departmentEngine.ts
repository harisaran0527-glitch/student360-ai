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


import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { BookOpen, FileText, Lock } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FacultyAcademicsPage() {
  const session = await getSession();

  let courses: any[] = [];
  try {
    courses = await prisma.course.findMany({
      where: { isActive: true, isArchived: false },
      include: { faculty: { select: { id: true, fullName: true, email: true } } },
      orderBy: [{ semester: "asc" }, { code: "asc" }],
    });
  } catch (err) {
    console.error("[FACULTY_ACADEMICS_ERROR]", err);
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Faculty Academics & Syllabus Repository"
        subtitle="Department of Artificial Intelligence & Machine Learning course syllabus and faculty assignments"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-3">
          <Lock className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Read-Only Faculty View:</strong> Faculty members can view assigned subjects and official syllabus documents. Editing or adding subjects requires Admin privileges.
          </span>
        </div>

        <div className="ui-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Department Syllabus Directory ({courses.length} Subjects)</span>
            </h3>
            <Badge variant="purple">Department: AI & ML</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="p-3">Sem</th>
                  <th className="p-3">Subject Code & Title</th>
                  <th className="p-3">Credits</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Assigned Faculty</th>
                  <th className="p-3">Official Syllabus / Material</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {courses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      No active subjects configured yet.
                    </td>
                  </tr>
                ) : (
                  courses.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">Sem {c.semester}</td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 dark:text-white block">{c.code}: {c.title}</span>
                      </td>
                      <td className="p-3 font-semibold">{c.credits} Credits</td>
                      <td className="p-3">
                        <Badge variant={c.subjectType === "LAB" ? "warning" : "info"}>
                          {c.subjectType || "CORE"}
                        </Badge>
                      </td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                        {c.faculty?.fullName || <span className="text-slate-400 italic">Unassigned</span>}
                      </td>
                      <td className="p-3">
                        {c.syllabusUrl ? (
                          <a
                            href={c.syllabusUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 font-bold flex items-center gap-1.5 w-fit"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Syllabus / Material</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No document uploaded</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

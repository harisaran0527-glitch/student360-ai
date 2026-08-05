import React from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GraduationCap, BookOpen, Download, FileText } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentAcademicsPage() {
  const session = await getSession();
  const student = await prisma.studentProfile.findFirst({
    where: { userId: session?.id },
    include: {
      department: true,
      academicRecords: {
        include: { course: true },
        orderBy: { semester: "asc" },
      },
    },
  });

  const departmentCourses = await prisma.course.findMany({
    where: { departmentId: student?.departmentId, isActive: true },
    orderBy: [{ semester: "asc" }, { code: "asc" }],
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Subjects & Syllabus — AI & ML Curriculum"
        subtitle="Department of Artificial Intelligence & Machine Learning course syllabus, credits, and semester transcript"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
        {/* Cumulative Performance Summary */}
        <div className="ui-card p-6 border-l-4 border-l-emerald-600 bg-gradient-to-r from-emerald-50/50 dark:from-emerald-950/30 to-slate-50 dark:to-slate-900 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Cumulative Grade Point Average (CGPA)</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Calculated across all completed credit courses for {student?.fullName}</p>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{student?.cgpa || "0.00"} / 10.0</div>
        </div>

        {/* Subjects & Syllabus Master Directory */}
        <div className="ui-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Department Subjects & Official Syllabus Documents</span>
            </h3>
            <Badge variant="purple">Department: AI & ML</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="p-3">Sem</th>
                  <th className="p-3">Subject Code & Name</th>
                  <th className="p-3">Credits</th>
                  <th className="p-3">Course Type</th>
                  <th className="p-3">Official Syllabus Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {departmentCourses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No department syllabus courses configured yet.
                    </td>
                  </tr>
                ) : (
                  departmentCourses.map((c) => (
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
                      <td className="p-3">
                        {(c as any).syllabusUrl ? (
                          <a
                            href={(c as any).syllabusUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 font-bold flex items-center gap-1.5 w-fit"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Syllabus</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Syllabus Document Available in Vault</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Academic Transcript & Semester Marksheet */}
        <div className="ui-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Official Semester Transcript & Marksheet Logs</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="p-3">Sem</th>
                  <th className="p-3">Course Code & Title</th>
                  <th className="p-3">Internal (50)</th>
                  <th className="p-3">External (50)</th>
                  <th className="p-3">Total (100)</th>
                  <th className="p-3">Grade</th>
                  <th className="p-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {student?.academicRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No official semester examination marks logged yet.
                    </td>
                  </tr>
                ) : (
                  student?.academicRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">Sem {rec.semester}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{rec.course?.code}: {rec.course?.title}</td>
                      <td className="p-3">{rec.internalMarks}</td>
                      <td className="p-3">{rec.externalMarks}</td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{rec.totalMarks}</td>
                      <td className="p-3 font-bold text-indigo-600 dark:text-indigo-300">{rec.grade}</td>
                      <td className="p-3"><Badge variant="success">{rec.result}</Badge></td>
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

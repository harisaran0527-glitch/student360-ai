"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  BookOpen,
  Layers,
  FileText,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  UserCheck,
  Building,
  Sparkles,
} from "lucide-react";

export default function StudentAcademicsPage() {
  const [semester, setSemester] = useState<number>(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const fetchStudentSyllabus = async (semNum: number) => {
    setLoading(true);
    try {
      const [sylRes, recordRes] = await Promise.all([
        fetch(`/api/academics/syllabus/student?semester=${semNum}`),
        fetch(`/api/academics`),
      ]);

      const sylData = await sylRes.json();
      const recData = await recordRes.json();

      if (sylData.success) {
        setData({
          ...sylData.data,
          records: recData.success ? recData.data : null,
        });
        if (sylData.data.student?.currentSemester) {
          setSemester(sylData.data.student.currentSemester);
        }
      }
    } catch (err) {
      console.error("[Student Syllabus Fetch Error]", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentSyllabus(semester);
  }, [semester]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
              <GraduationCap className="w-6 h-6 text-indigo-300" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Subjects & Syllabus — Applicable Curriculum</h1>
          </div>
          <p className="text-slate-300 text-sm pl-11">
            View your batch-pinned course syllabus, units, learning objectives, and official credit structure.
          </p>
        </div>

        {data?.student && (
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-xs space-y-0.5">
            <p className="font-bold text-indigo-200">{data.student.fullName}</p>
            <p className="text-slate-300">Reg: {data.student.registerNumber} | Batch: {data.student.batchName}</p>
          </div>
        )}
      </div>

      {/* Semester Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
          <button
            key={s}
            onClick={() => setSemester(s)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
              semester === s
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-300"
            }`}
          >
            <span>Semester {s}</span>
            {data?.student?.currentSemester === s && (
              <span className="px-1.5 py-0.5 bg-emerald-400/30 text-white rounded text-[10px]">Current</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium">Loading applicable syllabus...</div>
      ) : !data || !data.subjects || data.subjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-500 text-sm font-medium">No active subjects mapped for Semester {semester} yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Subject Accordions */}
          <div className="space-y-4">
            {data.subjects.map((sub: any) => {
              const isExpanded = expandedSubject === sub.id;
              const ver = sub.applicableSyllabusVersion;

              return (
                <div
                  key={sub.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition"
                >
                  <button
                    onClick={() => setExpandedSubject(isExpanded ? null : sub.id)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                        {sub.code}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">{sub.title}</h3>
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded">
                            {sub.credits} Credits
                          </span>
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-bold rounded">
                            {sub.subjectType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Assigned Faculty: <span className="font-semibold text-slate-700 dark:text-slate-300">{sub.faculty?.fullName || "Department Faculty"}</span> | Active Version: <span className="font-bold text-emerald-600">{ver ? `v${ver.versionNumber} (${ver.regulation})` : "v1.0 Standard"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {isExpanded ? "Hide Syllabus Units" : "View Syllabus Units"}
                      </span>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </button>

                  {/* Detailed Syllabus View */}
                  {isExpanded && (
                    <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-6">
                      {ver ? (
                        <>
                          {/* Units Outline */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                              <Layers className="w-4 h-4 text-indigo-500" /> Course Units & Learning Modules ({Array.isArray(ver.units) ? ver.units.length : 0} Units)
                            </h4>

                            <div className="grid grid-cols-1 gap-3">
                              {Array.isArray(ver.units) &&
                                ver.units.map((u: any, idx: number) => (
                                  <div key={idx} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <h5 className="text-sm font-bold text-slate-900 dark:text-white">{u.title}</h5>
                                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                                        {u.hours || 9} Hours
                                      </span>
                                    </div>
                                    {u.topics && <p className="text-xs text-slate-600 dark:text-slate-300 font-medium"><strong>Topics:</strong> {u.topics}</p>}
                                    {u.description && <p className="text-xs text-slate-500">{u.description}</p>}
                                  </div>
                                ))}
                            </div>
                          </div>

                          {/* Objectives & Outcomes */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            {Array.isArray(ver.courseObjectives) && ver.courseObjectives.length > 0 && (
                              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                <h5 className="font-bold text-slate-800 dark:text-slate-200">Course Objectives</h5>
                                <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                                  {ver.courseObjectives.map((obj: string, i: number) => (
                                    <li key={i}>{obj}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {Array.isArray(ver.courseOutcomes) && ver.courseOutcomes.length > 0 && (
                              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                <h5 className="font-bold text-slate-800 dark:text-slate-200">Course Outcomes (COs)</h5>
                                <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                                  {ver.courseOutcomes.map((out: string, i: number) => (
                                    <li key={i}>{out}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Textbooks & References */}
                          {Array.isArray(ver.textBooks) && ver.textBooks.length > 0 && (
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                              <h5 className="font-bold text-slate-800 dark:text-slate-200">Recommended Textbooks</h5>
                              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                                {ver.textBooks.map((tb: string, i: number) => (
                                  <li key={i}>{tb}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-4 text-center text-slate-500 text-xs italic">
                          Detailed syllabus units available in standard department repository.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

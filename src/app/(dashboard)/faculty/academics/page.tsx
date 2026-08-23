"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  BookOpen,
  Layers,
  FileText,
  Lock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";

export default function FacultyAcademicsPage() {
  const [semester, setSemester] = useState<number>(1);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);

  const fetchFacultySubjects = async (semNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/academics/subjects?semester=${semNum}`);
      const data = await res.json();
      if (data.success) {
        setSubjects(data.data);
        if (data.data.length > 0) setSelectedSubject(data.data[0]);
      }
    } catch (err) {
      console.error("[Faculty Subjects Fetch Error]", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultySubjects(semester);
  }, [semester]);

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
              <GraduationCap className="w-6 h-6 text-indigo-300" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Faculty Academics & Syllabus Repository</h1>
          </div>
          <p className="text-slate-300 text-sm pl-11">
            View assigned subjects, syllabus version details, units, and learning objectives.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-500/20 text-amber-200 px-3.5 py-2 rounded-xl text-xs border border-amber-400/30 font-semibold">
          <Lock className="w-4 h-4 text-amber-300" /> Read-Only Academic Portal
        </div>
      </div>

      {/* Read-only Permission Banner */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-3">
        <Lock className="w-4 h-4 flex-shrink-0" />
        <span>
          <strong>Read-Only Faculty View:</strong> Faculty members can view assigned subjects and syllabus versions. Editing or publishing new versions requires Admin privileges.
        </span>
      </div>

      {/* Semester Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
          <button
            key={s}
            onClick={() => setSemester(s)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition border ${
              semester === s
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-300"
            }`}
          >
            Semester {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium">Loading subjects...</div>
      ) : subjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border space-y-2">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-500 text-sm font-medium">No subjects found for Semester {semester}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subject Roster List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" /> Semester {semester} Subjects
            </h3>

            <div className="space-y-2">
              {subjects.map((sub) => {
                const isSelected = selectedSubject?.id === sub.id;
                const latestVer = sub.syllabusVersions?.[0];

                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubject(sub)}
                    className={`w-full p-4 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                    }`}
                  >
                    <div>
                      <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 block">
                        {sub.code}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{sub.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {sub.credits} Credits | {sub.subjectType}
                      </p>
                    </div>

                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-bold text-[10px]">
                      {latestVer ? `v${latestVer.versionNumber}` : "v1.0"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Subject Detailed Syllabus View */}
          <div className="lg:col-span-2 space-y-4">
            {selectedSubject ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                      {selectedSubject.code}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {selectedSubject.title}
                    </h3>
                  </div>

                  {selectedSubject.syllabusVersions?.[0] && (
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-full border border-emerald-300">
                      Active: Version {selectedSubject.syllabusVersions[0].versionNumber}
                    </span>
                  )}
                </div>

                {selectedSubject.syllabusVersions?.[0] ? (
                  (() => {
                    const ver = selectedSubject.syllabusVersions[0];
                    return (
                      <div className="space-y-6 text-xs">
                        {/* Syllabus Units */}
                        <div className="space-y-3">
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-500" /> Syllabus Units
                          </h4>
                          <div className="space-y-2">
                            {Array.isArray(ver.units) &&
                              ver.units.map((u: any, idx: number) => (
                                <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                                  <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                                    <span>{u.title}</span>
                                    <span className="text-indigo-600">{u.hours || 9} Hours</span>
                                  </div>
                                  {u.topics && <p className="text-slate-600 dark:text-slate-300"><strong>Topics:</strong> {u.topics}</p>}
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Objectives & Outcomes */}
                        <div className="grid grid-cols-2 gap-4">
                          {Array.isArray(ver.courseObjectives) && ver.courseObjectives.length > 0 && (
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border space-y-2">
                              <h5 className="font-bold text-slate-800 dark:text-slate-200">Course Objectives</h5>
                              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                                {ver.courseObjectives.map((obj: string, i: number) => <li key={i}>{obj}</li>)}
                              </ul>
                            </div>
                          )}

                          {Array.isArray(ver.courseOutcomes) && ver.courseOutcomes.length > 0 && (
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border space-y-2">
                              <h5 className="font-bold text-slate-800 dark:text-slate-200">Course Outcomes</h5>
                              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                                {ver.courseOutcomes.map((out: string, i: number) => <li key={i}>{out}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-8 text-center text-slate-500 italic">
                    No detailed syllabus version uploaded for {selectedSubject.code} yet.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-500 italic py-8 text-center text-xs">Select a subject to view syllabus details.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

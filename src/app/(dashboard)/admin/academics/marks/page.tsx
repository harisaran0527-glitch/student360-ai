"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import {
  Save,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  BookOpen,
} from "lucide-react";
import { calculateAcademicGrade } from "@/lib/academic-grading";

interface StudentOption {
  id: string;
  fullName: string;
  registerNo: string;
  rollNo: string;
  currentSemester: number;
  departmentId: string;
  sectionId?: string | null;
  academicYear: string;
  cgpa?: number;
  department?: { id: string; code: string; name: string };
  section?: { id: string; name: string };
}

interface CourseItem {
  id: string;
  code: string;
  title: string;
  credits: number;
  semester: number;
}

interface StudentMarkState {
  studentId: string;
  registerNo: string;
  fullName: string;
  rollNo: string;
  cgpa?: number;
  internalMarks: number | string;
  externalMarks: number | string;
  originalInternal: number | string;
  originalExternal: number | string;
  isSaving?: boolean;
}

export default function AdminMarksPage() {
  // Filter States
  const [academicYear, setAcademicYear] = useState<string>("2025-2029");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [selectedSem, setSelectedSem] = useState<number>(3);
  const [sectionId, setSectionId] = useState<string>("all");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("all");

  // Data States
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [studentMarkStates, setStudentMarkStates] = useState<StudentMarkState[]>([]);

  // UI Feedback States
  const [loading, setLoading] = useState<boolean>(true);
  const [savingAll, setSavingAll] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Fetch Departments on initial load
  useEffect(() => {
    async function loadInitialData() {
      try {
        const res = await fetch("/api/departments");
        const data = await res.json();
        const depts = data.departments || [];
        if (Array.isArray(depts)) {
          setDepartments(depts);
          if (depts.length > 0) {
            const aimlDept = depts.find((d: any) => d.code === "AIML");
            if (aimlDept) {
              setDepartmentId(aimlDept.id);
            } else {
              setDepartmentId(depts[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load departments", err);
      }
    }
    loadInitialData();
  }, []);

  // Fetch Course List and Student Roster
  const fetchMarksData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (departmentId) queryParams.set("departmentId", departmentId);
      if (selectedSem) queryParams.set("semester", selectedSem.toString());
      if (academicYear) queryParams.set("academicYear", academicYear);
      if (sectionId && sectionId !== "all") queryParams.set("sectionId", sectionId);
      if (selectedCourseId) queryParams.set("courseId", selectedCourseId);

      const res = await fetch(`/api/admin/academics/marks?${queryParams.toString()}`);
      const data = await res.json();

      if (data.success) {
        // Set courses
        const fetchedCourses: CourseItem[] = data.courses || [];
        setCourses(fetchedCourses);

        // Auto-select first course if none selected
        let activeCourseId = selectedCourseId;
        if (fetchedCourses.length > 0 && !selectedCourseId) {
          activeCourseId = fetchedCourses[0].id;
          setSelectedCourseId(fetchedCourses[0].id);
        }

        const students: StudentOption[] = data.students || [];
        const existingRecords: any[] = data.records || [];

        // Build roster mark states
        const rosterStates: StudentMarkState[] = students.map((s) => {
          // If we had a specific selectedCourseId, match the record
          const rec = existingRecords.find((r) => r.studentId === s.id);
          return {
            studentId: s.id,
            registerNo: s.registerNo,
            fullName: s.fullName,
            rollNo: s.rollNo,
            cgpa: s.cgpa || 0,
            internalMarks: rec ? rec.internalMarks : "",
            externalMarks: rec ? rec.externalMarks : "",
            originalInternal: rec ? rec.internalMarks : "",
            originalExternal: rec ? rec.externalMarks : "",
          };
        });

        setStudentMarkStates(rosterStates);
      }
    } catch (err) {
      console.error("Failed to fetch marks roster", err);
      showToast("Failed to fetch marks roster", "error");
    } finally {
      setLoading(false);
    }
  }, [departmentId, selectedSem, academicYear, sectionId, selectedCourseId]);

  useEffect(() => {
    if (departmentId) {
      fetchMarksData();
    }
  }, [fetchMarksData, departmentId]);

  const showToast = (text: string, type: "success" | "error") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Input change handler
  const handleMarkChange = (studentId: string, field: "internalMarks" | "externalMarks", value: string) => {
    // Keep blank values as string "", clamp numbers to 0-50
    const processedValue = value === "" ? "" : Math.min(50, Math.max(0, Number(value) || 0));
    setStudentMarkStates((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, [field]: processedValue } : row))
    );
  };

  // Save Single Student Mark
  const saveSingleStudentMarks = async (row: StudentMarkState) => {
    if (!selectedCourseId) {
      showToast("Please select a subject first", "error");
      return;
    }

    setStudentMarkStates((prev) =>
      prev.map((r) => (r.studentId === row.studentId ? { ...r, isSaving: true } : r))
    );

    try {
      const res = await fetch("/api/admin/academics/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          semester: selectedSem,
          academicYear,
          marks: [
            {
              studentId: row.studentId,
              internalMarks: row.internalMarks,
              externalMarks: row.externalMarks,
            },
          ],
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast(`Saved marks for ${row.fullName}`, "success");
        // Update original marks state so it's no longer marked as unsaved
        setStudentMarkStates((prev) =>
          prev.map((r) =>
            r.studentId === row.studentId
              ? {
                  ...r,
                  originalInternal: row.internalMarks,
                  originalExternal: row.externalMarks,
                }
              : r
          )
        );
      } else {
        showToast(data.error || "Failed to save student marks", "error");
      }
    } catch (err) {
      console.error("Save student error", err);
      showToast("Network error while saving student mark", "error");
    } finally {
      setStudentMarkStates((prev) =>
        prev.map((r) => (r.studentId === row.studentId ? { ...r, isSaving: false } : r))
      );
    }
  };

  // Save All Changed Marks in a Single Batch Request
  const saveAllMarks = async () => {
    if (!selectedCourseId) {
      showToast("Please select a subject first", "error");
      return;
    }

    // Filter only modified rows
    const modifiedRows = studentMarkStates.filter(
      (r) => r.internalMarks !== r.originalInternal || r.externalMarks !== r.originalExternal
    );

    if (modifiedRows.length === 0) {
      showToast("No changes detected to save", "error");
      return;
    }

    setSavingAll(true);
    try {
      const res = await fetch("/api/admin/academics/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          semester: selectedSem,
          academicYear,
          marks: modifiedRows.map((r) => ({
            studentId: r.studentId,
            internalMarks: r.internalMarks,
            externalMarks: r.externalMarks,
          })),
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast(`Successfully saved marks for ${modifiedRows.length} student(s).`, "success");
        // Update all original mark states to match
        setStudentMarkStates((prev) =>
          prev.map((r) => {
            const mod = modifiedRows.find((m) => m.studentId === r.studentId);
            if (mod) {
              return {
                ...r,
                originalInternal: r.internalMarks,
                originalExternal: r.externalMarks,
              };
            }
            return r;
          })
        );
      } else {
        showToast(data.error || "Failed to save all marks", "error");
      }
    } catch (err) {
      console.error("Save all error", err);
      showToast("Network error while saving bulk marks", "error");
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Semester Marks & Transcript Management"
        subtitle="Official institution internal, external examination marks entry, grade calculation, and transcript management"
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2 text-sm font-semibold transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20"
              : "bg-rose-500 text-white border-rose-600 shadow-rose-500/20"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Admin Filter Controls Bar */}
        <div className="ui-card p-6 space-y-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Select Academic Batch & Subject Filters</span>
            </h2>
            <Badge variant="purple">Class-Wise Bulk Mark Entry</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Academic Year Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                Academic Year
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="2025-2029">2025 - 2029</option>
                <option value="2026-2030">2026 - 2030</option>
                <option value="2024-2028">2024 - 2028</option>
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setSelectedCourseId("");
                }}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.displayLabel || `${d.code === "AIDS" ? "AI&DS" : d.code} — ${d.name}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                Semester
              </label>
              <select
                value={selectedSem}
                onChange={(e) => {
                  setSelectedSem(Number(e.target.value));
                  setSelectedCourseId("");
                }}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                Section
              </label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
              </select>
            </div>

            {/* Course/Subject Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase text-indigo-600 dark:text-indigo-400">
                Select Subject
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-indigo-300 dark:border-indigo-800 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {courses.length === 0 ? (
                  <option value="">No subjects active</option>
                ) : (
                  courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.title} ({c.credits} Credits)
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Official Class Roster Marks Entry Table */}
        <div className="ui-card p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                Class Roster — {studentMarkStates.length} Active Students Listed
              </span>
            </h3>

            <button
              onClick={saveAllMarks}
              disabled={savingAll || loading || studentMarkStates.length === 0}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-500/20 transition disabled:opacity-50"
            >
              {savingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save All Student Marks</span>
            </button>
          </div>

          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold">Loading student class roster and existing marks...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3.5 w-16">S.NO</th>
                    <th className="p-3.5">REGISTER NO</th>
                    <th className="p-3.5">STUDENT NAME</th>
                    <th className="p-3.5 w-32">INTERNAL (50)</th>
                    <th className="p-3.5 w-32">EXTERNAL (50)</th>
                    <th className="p-3.5">TOTAL (100)</th>
                    <th className="p-3.5">GRADE</th>
                    <th className="p-3.5">RESULT</th>
                    <th className="p-3.5 text-right w-24">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {studentMarkStates.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 font-medium">
                        No students matching the selected criteria found in this roster.
                      </td>
                    </tr>
                  ) : (
                    studentMarkStates.map((row, index) => {
                      const isUnmarked =
                        row.internalMarks === "" ||
                        row.externalMarks === "" ||
                        row.internalMarks === undefined ||
                        row.externalMarks === undefined;

                      const gradeCalc = isUnmarked
                        ? null
                        : calculateAcademicGrade(row.internalMarks, row.externalMarks);

                      return (
                        <tr
                          key={row.studentId}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition border-b border-slate-100 dark:border-slate-800"
                        >
                          <td className="p-3.5 font-bold text-slate-500">
                            {index + 1}
                          </td>
                          <td className="p-3.5 font-bold text-indigo-600 dark:text-indigo-400">
                            {row.registerNo}
                          </td>
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white uppercase">
                            {row.fullName}
                          </td>
                          <td className="p-3.5">
                            <input
                              type="number"
                              min={0}
                              max={50}
                              placeholder="0-50"
                              value={row.internalMarks}
                              onChange={(e) =>
                                handleMarkChange(row.studentId, "internalMarks", e.target.value)
                              }
                              className="w-24 px-3 py-1.5 font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                          <td className="p-3.5">
                            <input
                              type="number"
                              min={0}
                              max={50}
                              placeholder="0-50"
                              value={row.externalMarks}
                              onChange={(e) =>
                                handleMarkChange(row.studentId, "externalMarks", e.target.value)
                              }
                              className="w-24 px-3 py-1.5 font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                          <td className="p-3.5 font-black text-slate-900 dark:text-white text-sm font-mono">
                            {isUnmarked || !gradeCalc ? "-" : gradeCalc.totalMarks}
                          </td>
                          <td className="p-3.5">
                            {isUnmarked || !gradeCalc ? (
                              <span className="text-slate-400 font-medium">-</span>
                            ) : (
                              <Badge
                                variant={
                                  gradeCalc.grade === "O" || gradeCalc.grade === "A+"
                                    ? "success"
                                    : gradeCalc.grade === "RA"
                                    ? "danger"
                                    : "info"
                                }
                              >
                                {gradeCalc.grade}
                              </Badge>
                            )}
                          </td>
                          <td className="p-3.5">
                            {isUnmarked || !gradeCalc ? (
                              <span className="text-slate-400 font-medium">-</span>
                            ) : (
                              <Badge
                                variant={gradeCalc.result === "PASS" ? "success" : "danger"}
                              >
                                {gradeCalc.result}
                              </Badge>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => saveSingleStudentMarks(row)}
                              disabled={row.isSaving}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center gap-1.5 ml-auto"
                            >
                              {row.isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                              <span>Save</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

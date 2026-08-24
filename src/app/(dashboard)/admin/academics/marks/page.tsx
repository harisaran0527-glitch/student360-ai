"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import {
  GraduationCap,
  Save,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  User,
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
  department?: { id: string; code: string; name: string };
  section?: { id: string; name: string };
}

interface CourseItem {
  id: string;
  code: string;
  title: string;
  credits: number;
  semester: number;
  subjectType: string;
}

interface MarkRowState {
  courseId: string;
  code: string;
  title: string;
  credits: number;
  semester: number;
  internalMarks: number | string;
  externalMarks: number | string;
  isSaving?: boolean;
}

export default function AdminMarksPage() {
  // Filter States
  const [academicYear, setAcademicYear] = useState<string>("2025-2029");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [selectedSem, setSelectedSem] = useState<number>(3);
  const [sectionId, setSectionId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data States
  const [departments, setDepartments] = useState<any[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [markRows, setMarkRows] = useState<MarkRowState[]>([]);

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
        if (Array.isArray(data)) {
          setDepartments(data);
          if (data.length > 0) {
            setDepartmentId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load departments", err);
      }
    }
    loadInitialData();
  }, []);

  // Fetch Students & Marks Data when filters change
  const fetchMarksData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (departmentId) queryParams.set("departmentId", departmentId);
      if (selectedSem) queryParams.set("semester", selectedSem.toString());
      if (academicYear) queryParams.set("academicYear", academicYear);
      if (sectionId) queryParams.set("sectionId", sectionId);
      if (selectedStudentId) queryParams.set("studentId", selectedStudentId);
      if (searchQuery) queryParams.set("search", searchQuery);

      const res = await fetch(`/api/admin/academics/marks?${queryParams.toString()}`);
      const data = await res.json();

      if (data.success) {
        setStudents(data.students || []);
        setSelectedStudent(data.selectedStudent || null);
        if (data.selectedStudent && !selectedStudentId) {
          setSelectedStudentId(data.selectedStudent.id);
        }

        const courses: CourseItem[] = data.courses || [];
        const existingRecords: any[] = data.records || [];

        // Build mark rows matrix pre-filling existing marks
        const rows: MarkRowState[] = courses.map((course) => {
          const rec = existingRecords.find((r) => r.courseId === course.id);
          return {
            courseId: course.id,
            code: course.code,
            title: course.title,
            credits: course.credits || 3,
            semester: course.semester,
            internalMarks: rec ? rec.internalMarks : "",
            externalMarks: rec ? rec.externalMarks : "",
          };
        });

        setMarkRows(rows);
      }
    } catch (err) {
      console.error("Failed to fetch marks data", err);
      showToast("Failed to fetch marks data", "error");
    } finally {
      setLoading(false);
    }
  }, [departmentId, selectedSem, academicYear, sectionId, selectedStudentId, searchQuery]);

  useEffect(() => {
    fetchMarksData();
  }, [fetchMarksData]);

  const showToast = (text: string, type: "success" | "error") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle Mark Input Change
  const handleMarkChange = (courseId: string, field: "internalMarks" | "externalMarks", value: string) => {
    const numVal = value === "" ? "" : Math.min(50, Math.max(0, Number(value) || 0));
    setMarkRows((prev) =>
      prev.map((row) => (row.courseId === courseId ? { ...row, [field]: numVal } : row))
    );
  };

  // Save Individual Subject Mark
  const saveSingleSubject = async (row: MarkRowState) => {
    if (!selectedStudentId) {
      showToast("Please select a student first", "error");
      return;
    }

    setMarkRows((prev) =>
      prev.map((r) => (r.courseId === row.courseId ? { ...r, isSaving: true } : r))
    );

    try {
      const res = await fetch("/api/admin/academics/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          semester: selectedSem,
          academicYear,
          marks: [
            {
              courseId: row.courseId,
              internalMarks: Number(row.internalMarks) || 0,
              externalMarks: Number(row.externalMarks) || 0,
              credits: row.credits,
            },
          ],
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast(`Saved marks for ${row.code} (${row.title})`, "success");
        if (data.cgpa !== undefined && selectedStudent) {
          setSelectedStudent((prev: any) => ({ ...prev, cgpa: data.cgpa }));
        }
      } else {
        showToast(data.error || "Failed to save subject mark", "error");
      }
    } catch (err) {
      console.error("Save subject error", err);
      showToast("Network error while saving mark", "error");
    } finally {
      setMarkRows((prev) =>
        prev.map((r) => (r.courseId === row.courseId ? { ...r, isSaving: false } : r))
      );
    }
  };

  // Save All Subject Marks Together
  const saveAllSubjects = async () => {
    if (!selectedStudentId) {
      showToast("Please select a student first", "error");
      return;
    }

    if (markRows.length === 0) {
      showToast("No active courses available to save", "error");
      return;
    }

    setSavingAll(true);
    try {
      const marksPayload = markRows.map((row) => ({
        courseId: row.courseId,
        internalMarks: Number(row.internalMarks) || 0,
        externalMarks: Number(row.externalMarks) || 0,
        credits: row.credits,
      }));

      const res = await fetch("/api/admin/academics/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          semester: selectedSem,
          academicYear,
          marks: marksPayload,
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast(`Successfully saved all ${markRows.length} subject marks!`, "success");
        if (data.cgpa !== undefined && selectedStudent) {
          setSelectedStudent((prev: any) => ({ ...prev, cgpa: data.cgpa }));
        }
      } else {
        showToast(data.error || "Failed to save marks", "error");
      }
    } catch (err) {
      console.error("Save all error", err);
      showToast("Network error while saving all marks", "error");
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
              <span>Select Academic Batch & Student Filters</span>
            </h2>
            <Badge variant="purple">Official Exam Management</Badge>
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
                  setSelectedStudentId("");
                }}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code === "AIDS" ? "AI&DS" : d.code} — {d.name}
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
                onChange={(e) => setSelectedSem(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                Search Student
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Reg No / Name / Roll No"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Student Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                Select Student ({students.length})
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.registerNo} — {s.fullName} ({s.rollNo})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Selected Student Banner Card */}
        {selectedStudent ? (
          <div className="ui-card p-6 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-slate-900/5 dark:from-indigo-950/40 dark:to-slate-900 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-500/20">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{selectedStudent.fullName}</span>
                  <Badge variant="purple">Reg No: {selectedStudent.registerNo}</Badge>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                  Roll No: <span className="font-bold">{selectedStudent.rollNo}</span> | Department:{" "}
                  <span className="font-bold">
                    {selectedStudent.department?.code === "AIDS"
                      ? "AI&DS"
                      : selectedStudent.department?.code || "N/A"}
                  </span>{" "}
                  | Current Semester: <span className="font-bold">{selectedStudent.currentSemester}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">
                  Current Cumulative CGPA
                </span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {selectedStudent.cgpa !== undefined ? `${selectedStudent.cgpa} / 10.0` : "0.00 / 10.0"}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Official Marks Entry Table */}
        <div className="ui-card p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                Semester {selectedSem} Course Examination Marks Entry — {markRows.length} Applicable Subjects
              </span>
            </h3>

            <button
              onClick={saveAllSubjects}
              disabled={savingAll || loading || markRows.length === 0}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-500/20 transition disabled:opacity-50"
            >
              {savingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save All Subject Marks</span>
            </button>
          </div>

          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold">Loading applicable semester courses and marks...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3.5">SEM</th>
                    <th className="p-3.5">COURSE CODE & TITLE</th>
                    <th className="p-3.5 w-32">INTERNAL (50)</th>
                    <th className="p-3.5 w-32">EXTERNAL (50)</th>
                    <th className="p-3.5">TOTAL (100)</th>
                    <th className="p-3.5">GRADE</th>
                    <th className="p-3.5">RESULT</th>
                    <th className="p-3.5 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {markRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                        No active courses configured for Semester {selectedSem} in this department.
                      </td>
                    </tr>
                  ) : (
                    markRows.map((row) => {
                      const gradeCalc = calculateAcademicGrade(row.internalMarks, row.externalMarks);
                      const isUnsaved = row.internalMarks === "" && row.externalMarks === "";

                      return (
                        <tr
                          key={row.courseId}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="p-3.5 font-bold text-indigo-600 dark:text-indigo-400">
                            Sem {row.semester}
                          </td>
                          <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                            <span className="font-bold text-indigo-600 dark:text-indigo-300">
                              [{row.code}]
                            </span>{" "}
                            {row.title}
                          </td>
                          <td className="p-3.5">
                            <input
                              type="number"
                              min={0}
                              max={50}
                              placeholder="0-50"
                              value={row.internalMarks}
                              onChange={(e) =>
                                handleMarkChange(row.courseId, "internalMarks", e.target.value)
                              }
                              className="w-24 px-3 py-1.5 font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                                handleMarkChange(row.courseId, "externalMarks", e.target.value)
                              }
                              className="w-24 px-3 py-1.5 font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </td>
                          <td className="p-3.5 font-black text-slate-900 dark:text-white text-sm font-mono">
                            {isUnsaved ? "-" : gradeCalc.totalMarks}
                          </td>
                          <td className="p-3.5">
                            {isUnsaved ? (
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
                            {isUnsaved ? (
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
                              onClick={() => saveSingleSubject(row)}
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

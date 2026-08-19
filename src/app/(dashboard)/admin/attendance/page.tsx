"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { ACADEMIC_YEAR_OPTIONS, DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { getAcademicOptions } from "@/lib/clientOptionsCache";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteManagementPanel } from "@/components/ui/DeleteManagementPanel";
import {
  UserCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  AlertCircle,
  Save,
  Edit3,
  CheckSquare,
  Square,
  Sparkles,
  Trash2,
} from "lucide-react";

type AttendanceStatus = "PRESENT" | "ABSENT" | "OD" | "INTERNSHIP" | "MEDICAL_LEAVE" | "LATE" | "ML" | "LONG_ABSENT" | "UNMARKED";

export default function AdminTakeAttendancePage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  // Tab mode state
  const [attendanceMode, setAttendanceMode] = useState<"FULL_DAY" | "SUBJECT" | "ABSENTEES" | "HISTORY">("FULL_DAY");

  // Selection state
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(DEFAULT_ACADEMIC_YEAR);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // History tab state
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [absenteesSearchTerm, setAbsenteesSearchTerm] = useState<string>("");

  const loadHistory = React.useCallback(async () => {
    if (!selectedAcademicYear) return;
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        academicYear: selectedAcademicYear,
        departmentId: selectedDepartmentId,
        history: "true",
      });
      const res = await fetch(`/api/attendance/full-day?${params.toString()}`);
      const data = await res.json();
      setHistoryList(data.data?.history || data.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedAcademicYear, selectedDepartmentId]);

  useEffect(() => {
    if (attendanceMode === "HISTORY") {
      loadHistory();
    }
  }, [attendanceMode, loadHistory]);

  const handleOpenHistoryDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setAttendanceMode("FULL_DAY");
  };

  // Student list & status state
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Filter students based on search term
  const filteredStudents = students.filter((st) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase().trim();
    const fullName = (st.fullName || "").toLowerCase();
    const registerNo = (st.registerNo || "").toLowerCase();
    const rollNo = (st.rollNo || "").toLowerCase();
    const institutionalEmail = (st.institutionalEmail || st.email || "").toLowerCase();
    return (
      fullName.includes(term) ||
      registerNo.includes(term) ||
      rollNo.includes(term) ||
      institutionalEmail.includes(term)
    );
  });

  const absenteesList = students.filter((st) => {
    const status = attendanceState[st.id];
    return status === "ABSENT" || status === "LONG_ABSENT" || status === "ML" || status === "MEDICAL_LEAVE";
  });

  const filteredAbsentees = absenteesList.filter((st) => {
    if (!absenteesSearchTerm) return true;
    const term = absenteesSearchTerm.toLowerCase().trim();
    const fullName = (st.fullName || "").toLowerCase();
    const registerNo = (st.registerNo || "").toLowerCase();
    return fullName.includes(term) || registerNo.includes(term);
  });

  // Fetch initial options
  useEffect(() => {
    getAcademicOptions()
      .then((opts) => {
        const years = opts.academicYears || [];
        setAcademicYears(years);

        const savedAY = localStorage.getItem("selected_academic_year");
        if (savedAY && years.some((y: any) => y.yearCode === savedAY)) {
          setSelectedAcademicYear(savedAY);
        } else if (opts.currentYearCode && years.some((y: any) => y.yearCode === opts.currentYearCode)) {
          setSelectedAcademicYear(opts.currentYearCode);
        } else if (years.length > 0) {
          setSelectedAcademicYear(years[0].yearCode);
        }

        const bList = opts.batches || [];
        setBatches(bList);
        const dList = opts.departments || [];
        setDepartments(dList);
      })
      .catch((err) => {
        console.error("[Attendance Options Error]", err);
        setMessage({ text: `Failed to load options: ${err.message}`, type: "error" });
      });

    const handleAYChange = (e: any) => {
      if (e.detail?.academicYear) {
        setSelectedAcademicYear(e.detail.academicYear);
      }
    };
    window.addEventListener("academicYearChanged", handleAYChange);
    return () => window.removeEventListener("academicYearChanged", handleAYChange);
  }, []);

  // Background batch auto-matching removed to avoid silent narrowing filters

  // Fetch students and existing attendance when filters change
  const loadStudentsAndAttendance = React.useCallback(async () => {
    if (!selectedAcademicYear || attendanceMode === "HISTORY") return;
    setLoading(true);
    setMessage(null);
    try {
      if (attendanceMode === "SUBJECT") {
        const params = new URLSearchParams({
          academicYear: selectedAcademicYear,
          batchId: selectedBatchId,
          departmentId: selectedDepartmentId,
          date: selectedDate,
          courseId: selectedCourseId,
        });

        const res = await fetch(`/api/attendance?${params.toString()}`);
        const data = await res.json();
        const courseList = data.data?.courses || data.courses || [];
        const studentList = data.data?.students || data.students || [];

        setCourses(courseList);
        if (!selectedCourseId && courseList.length > 0) {
          setSelectedCourseId(courseList[0].id);
        }

        setStudents(studentList);

        const existingMap: Record<string, AttendanceStatus> = {};
        const existingRecords = data.data?.existingAttendance || data.existingAttendance || [];

        if (existingRecords.length > 0) {
          setIsEditMode(true);
          existingRecords.forEach((rec: any) => {
            existingMap[rec.studentId] = rec.status as AttendanceStatus;
          });
        } else {
          setIsEditMode(false);
          // Default all to PRESENT
          studentList.forEach((st: any) => {
            existingMap[st.id] = "PRESENT";
          });
        }

        setAttendanceState(existingMap);
      } else {
        // FULL_DAY mode
        const params = new URLSearchParams({
          academicYear: selectedAcademicYear,
          batchId: selectedBatchId,
          departmentId: selectedDepartmentId,
          date: selectedDate,
        });

        const res = await fetch(`/api/attendance/full-day?${params.toString()}`);
        const data = await res.json();
        const studentList = data.data?.students || data.students || [];

        setStudents(studentList);

        const existingMap: Record<string, AttendanceStatus> = {};
        const existingRecords = data.data?.existingAttendance || data.existingAttendance || [];

        // Set all to UNMARKED initially
        studentList.forEach((st: any) => {
          existingMap[st.id] = "UNMARKED";
        });

        if (existingRecords.length > 0) {
          setIsEditMode(true);
          existingRecords.forEach((rec: any) => {
            let statusVal = rec.status;
            if (statusVal === "MEDICAL_LEAVE") {
              statusVal = "ML";
            }
            existingMap[rec.studentId] = statusVal as AttendanceStatus;
          });
        } else {
          setIsEditMode(false);
        }

        setAttendanceState(existingMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedAcademicYear, selectedBatchId, selectedDepartmentId, selectedDate, selectedCourseId, attendanceMode]);

  useEffect(() => {
    loadStudentsAndAttendance();
  }, [loadStudentsAndAttendance]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    students.forEach((st) => {
      updated[st.id] = status;
    });
    setAttendanceState(updated);
  };

  const handleSave = async () => {
    if (attendanceMode === "SUBJECT") {
      if (!selectedCourseId || saving) {
        setMessage({ text: "Please select a Subject/Course before saving.", type: "error" });
        return;
      }

      setSaving(true);
      setMessage(null);

      try {
        const records = students.map((st) => ({
          studentId: st.id,
          status: attendanceState[st.id] || "PRESENT",
        }));

        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            academicYear: selectedAcademicYear,
            batchId: selectedBatchId,
            courseId: selectedCourseId,
            date: selectedDate,
            sessionName: "FN",
            attendanceRecords: records,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.success === false) {
          throw new Error(data.message || data.error || "Failed to save attendance");
        }

        setMessage({ text: "Attendance saved successfully! Student percentages updated.", type: "success" });
        setIsEditMode(true);
      } catch (err: any) {
        setMessage({ text: err.message, type: "error" });
      } finally {
        setSaving(false);
      }
    } else {
      // FULL_DAY mode
      if (saving) return;

      setSaving(true);
      setMessage(null);

      try {
        const records = students.map((st) => ({
          studentId: st.id,
          status: attendanceState[st.id] || "UNMARKED",
        }));

        const res = await fetch("/api/attendance/full-day", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: selectedDate,
            attendanceRecords: records,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.success === false) {
          throw new Error(data.message || data.error || "Failed to save full day attendance");
        }

        setMessage({ text: "Full day attendance saved successfully!", type: "success" });
        setIsEditMode(true);
      } catch (err: any) {
        setMessage({ text: err.message, type: "error" });
      } finally {
        setSaving(false);
      }
    }
  };

  // Summary counts
  const totalStudents = students.length;
  const markedCount = students.filter((st) => attendanceState[st.id] && attendanceState[st.id] !== "UNMARKED").length;
  const unmarkedCount = totalStudents - markedCount;
  const presentCount = students.filter((st) => attendanceState[st.id] === "PRESENT").length;
  const absentCount = students.filter((st) => attendanceState[st.id] === "ABSENT" || attendanceState[st.id] === "LONG_ABSENT").length;
  const odCount = students.filter((st) => attendanceState[st.id] === "OD").length;
  const internshipCount = students.filter((st) => attendanceState[st.id] === "INTERNSHIP").length;
  const medicalCount = students.filter((st) => attendanceState[st.id] === "MEDICAL_LEAVE").length;
  const lateCount = students.filter((st) => attendanceState[st.id] === "LATE").length;
  const mlCount = students.filter((st) => attendanceState[st.id] === "ML" || attendanceState[st.id] === "MEDICAL_LEAVE").length;
  const longAbsentCount = students.filter((st) => attendanceState[st.id] === "LONG_ABSENT").length;

  // Delete Management State
  const [isDeletePanelOpen, setIsDeletePanelOpen] = useState(false);
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);

  const fetchAttendanceSessions = async () => {
    try {
      const res = await fetch("/api/attendance/sessions");
      const d = await res.json();
      setAttendanceSessions(d.sessions || d.data?.sessions || []);
    } catch {
      // Fall back if endpoint isn't present
    }
  };

  useEffect(() => {
    fetchAttendanceSessions();
  }, []);
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="Take Attendance — AI & ML Department"
        subtitle={`Academic Year: ${selectedAcademicYear} | Department: AI & ML`}
        action={
          <div className="flex items-center gap-2">
            {(attendanceMode === "FULL_DAY" || attendanceMode === "SUBJECT") && (
              <button
                onClick={handleSave}
                disabled={saving || students.length === 0}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{saving ? "Saving..." : "Save Attendance"}</span>
              </button>
            )}

            {attendanceMode === "SUBJECT" && (
              <button
                onClick={() => {
                  fetchAttendanceSessions();
                  setIsDeletePanelOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Delete Attendance Session</span>
              </button>
            )}
          </div>
        }
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setAttendanceMode("FULL_DAY")}
            className={`py-3 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition ${
              attendanceMode === "FULL_DAY"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Full Day Attendance
          </button>
          <button
            onClick={() => setAttendanceMode("ABSENTEES")}
            className={`py-3 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition ${
              attendanceMode === "ABSENTEES"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Absentees
          </button>
          <button
            onClick={() => setAttendanceMode("HISTORY")}
            className={`py-3 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition ${
              attendanceMode === "HISTORY"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Attendance History
          </button>
          <button
            onClick={() => setAttendanceMode("SUBJECT")}
            className={`py-3 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition ${
              attendanceMode === "SUBJECT"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Subject Attendance
          </button>
        </div>

        {/* Top Control Bar */}
        <div className="ui-card p-6 rounded-2xl bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>
                {attendanceMode === "FULL_DAY"
                  ? "Full Day Attendance Selector"
                  : attendanceMode === "ABSENTEES"
                  ? "Absentees Log Selector"
                  : attendanceMode === "HISTORY"
                  ? "History Report Selector"
                  : "Attendance Selector (Single Class Context)"}
              </span>
            </h2>
            {(attendanceMode === "FULL_DAY" || attendanceMode === "SUBJECT") && (
              isEditMode ? (
                <Badge variant="warning">
                  <Edit3 className="w-3 h-3 mr-1" /> Editing Saved Attendance
                </Badge>
              ) : (
                <Badge variant="success">New Attendance Session</Badge>
              )
            )}
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${attendanceMode === "SUBJECT" ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4 text-xs`}>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Academic Year *
              </label>
              <select
                value={selectedAcademicYear}
                onChange={(e) => {
                  setSelectedAcademicYear(e.target.value);
                  localStorage.setItem("selected_academic_year", e.target.value);
                }}
                className="ui-input w-full p-2 font-bold text-indigo-600"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.yearCode}>
                    {ay.yearCode} {ay.isCurrent ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Department
              </label>
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="ui-input w-full p-2"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch filter dropdown removed */}

            {attendanceMode !== "HISTORY" && (
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="ui-input w-full p-2 font-semibold"
                />
              </div>
            )}

            {attendanceMode === "SUBJECT" && (
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Subject / Course *
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="ui-input w-full p-2"
                >
                  {courses.length === 0 ? (
                    <option value="">No active subjects found</option>
                  ) : (
                    courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.title} (Sem {c.semester})
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Summary Counter Bar */}
        {(attendanceMode === "FULL_DAY" || attendanceMode === "SUBJECT") && (
          <div className={`grid grid-cols-2 sm:grid-cols-3 ${attendanceMode === "SUBJECT" ? "md:grid-cols-7" : "md:grid-cols-8"} gap-3`}>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-500">Total</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{totalStudents}</div>
            </div>
            {attendanceMode === "FULL_DAY" && (
              <>
                <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 text-center">
                  <div className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">Marked</div>
                  <div className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{markedCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Unmarked</div>
                  <div className="text-lg font-bold text-slate-700 dark:text-slate-350">{unmarkedCount}</div>
                </div>
              </>
            )}
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-600">Present</div>
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{presentCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center">
              <div className="text-[10px] uppercase font-bold text-rose-600">Absent</div>
              <div className="text-lg font-bold text-rose-700 dark:text-rose-400">{absentCount}</div>
            </div>
            {attendanceMode === "FULL_DAY" ? (
              <>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-blue-600">OD</div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{odCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-amber-600">ML</div>
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-400">{mlCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-red-600">Long Absent</div>
                  <div className="text-lg font-bold text-red-700 dark:text-red-400">{longAbsentCount}</div>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-blue-600">OD</div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{odCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-purple-600">Internship</div>
                  <div className="text-lg font-bold text-purple-700 dark:text-purple-400">{internshipCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-amber-600">Medical</div>
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-400">{medicalCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-sky-600">Late</div>
                  <div className="text-lg font-bold text-sky-700 dark:text-sky-400">{lateCount}</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Quick Batch Actions & Student List */}
        {(attendanceMode === "FULL_DAY" || attendanceMode === "SUBJECT") && (
          <div className="ui-card rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm space-y-4 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Student Roster — AI & ML Class ({students.length} Students)</span>
            </h3>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={() => handleMarkAll("PRESENT")}
                className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-200 flex items-center gap-1"
              >
                <CheckSquare className="w-3.5 h-3.5" /> Mark All Present
              </button>
              <button
                onClick={() => handleMarkAll("ABSENT")}
                className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold hover:bg-rose-200 flex items-center gap-1"
              >
                <Square className="w-3.5 h-3.5" /> Clear / Mark All Absent
              </button>
            </div>
          </div>

          {/* Student Search Bar */}
          {students.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl">
              <div className="relative w-full sm:w-80 text-xs">
                <input
                  type="text"
                  placeholder="Search student by name, register number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1.5 text-slate-400 hover:text-slate-600 text-lg font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Showing {filteredStudents.length} of {students.length} students
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              title={`No students found for Academic Year ${selectedAcademicYear}.`}
              description="Ensure students have been added to this academic year in the Batches & Progression page."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">Register Number</th>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Current Overall %</th>
                    <th className="p-3.5">Mark Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 font-bold">
                        No students match the search query &quot;{searchTerm}&quot;
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st, idx) => {
                      const status = attendanceState[st.id] || "PRESENT";
                      return (
                        <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3.5 text-slate-400 font-mono">{students.indexOf(st) + 1}</td>
                          <td className="p-3.5 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                            {st.registerNo}
                          </td>
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                            {st.fullName}
                          </td>
                          <td className="p-3.5 font-medium">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                (st.attendancePercentage ?? 100.0) >= 75
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {(st.attendancePercentage ?? 100.0).toFixed(1)}%
                            </span>
                          </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(attendanceMode === "FULL_DAY"
                              ? ["PRESENT", "ABSENT", "OD", "ML", "LONG_ABSENT", "UNMARKED"]
                              : [
                                  "PRESENT",
                                  "ABSENT",
                                  "OD",
                                  "INTERNSHIP",
                                  "MEDICAL_LEAVE",
                                  "LATE",
                                ]
                            ).map((stKey) => {
                              const isSel = status === stKey;
                              const btnColor =
                                stKey === "PRESENT"
                                  ? isSel
                                    ? "bg-emerald-600 text-white"
                                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : stKey === "ABSENT"
                                  ? isSel
                                    ? "bg-rose-600 text-white"
                                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                                  : stKey === "OD"
                                  ? isSel
                                    ? "bg-blue-600 text-white"
                                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                  : (stKey === "MEDICAL_LEAVE" || stKey === "ML")
                                  ? isSel
                                    ? "bg-amber-600 text-white"
                                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  : stKey === "LONG_ABSENT"
                                  ? isSel
                                    ? "bg-red-600 text-white"
                                    : "bg-red-50 text-red-700 hover:bg-red-100"
                                  : stKey === "UNMARKED"
                                  ? isSel
                                    ? "bg-slate-600 text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  : stKey === "INTERNSHIP"
                                  ? isSel
                                    ? "bg-purple-600 text-white"
                                    : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                                  : isSel
                                  ? "bg-sky-600 text-white"
                                  : "bg-sky-50 text-sky-700 hover:bg-sky-100";

                              return (
                                <button
                                  key={stKey}
                                  type="button"
                                  onClick={() => handleStatusChange(st.id, stKey as AttendanceStatus)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border border-transparent ${btnColor}`}
                                >
                                  {stKey === "UNMARKED" ? "Unmarked" : stKey.replace("_", " ")}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom Save Action */}
          {students.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                {attendanceMode === "SUBJECT"
                  ? "Updating subject attendance automatically recalculates student percentages."
                  : "Updating full day attendance records independently."}
              </span>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving Attendance..." : "Save Attendance"}</span>
              </button>
            </div>
          )}
          </div>
        )}

        {/* Absentees Tab */}
        {attendanceMode === "ABSENTEES" && (
          <div className="ui-card rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm space-y-4 p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Absentees List ({filteredAbsentees.length} Records)</span>
              </h3>
              <div className="relative w-full sm:w-80 text-xs">
                <input
                  type="text"
                  placeholder="Search absentee by name or register number..."
                  value={absenteesSearchTerm}
                  onChange={(e) => setAbsenteesSearchTerm(e.target.value)}
                  className="ui-input w-full pl-9 pr-8 py-2 font-medium"
                />
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                {absenteesSearchTerm && (
                  <button
                    onClick={() => setAbsenteesSearchTerm("")}
                    className="absolute right-3 top-1.5 text-slate-400 hover:text-slate-650 text-lg font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Main Absentees Table (Absent & Long Absent) */}
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-3">Absentees & Long Absentees</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 font-bold uppercase tracking-wider border-b border-rose-100 dark:border-rose-900">
                        <th className="p-3.5">Register Number</th>
                        <th className="p-3.5">Student Name</th>
                        <th className="p-3.5">Department</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredAbsentees.filter(st => {
                        const status = attendanceState[st.id];
                        return status === "ABSENT" || status === "LONG_ABSENT";
                      }).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500 font-medium">
                            No absentees found for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredAbsentees
                          .filter(st => {
                            const status = attendanceState[st.id];
                            return status === "ABSENT" || status === "LONG_ABSENT";
                          })
                          .map((st) => (
                            <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="p-3.5 font-bold font-mono text-indigo-600 dark:text-indigo-400">{st.registerNo}</td>
                              <td className="p-3.5 font-bold text-slate-900 dark:text-white">{st.fullName}</td>
                              <td className="p-3.5 text-slate-600 dark:text-slate-400 font-semibold">{st.department?.code || selectedDepartmentId || "AI&ML"}</td>
                              <td className="p-3.5">
                                <Badge variant={attendanceState[st.id] === "LONG_ABSENT" ? "danger" : "warning"}>
                                  {attendanceState[st.id] === "LONG_ABSENT" ? "Long Absent" : "Absent"}
                                </Badge>
                              </td>
                              <td className="p-3.5 font-medium text-slate-500">{selectedDate}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Medical Leave (ML) Table */}
              <div>
                <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">Medical Leave (ML)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider border-b border-amber-100 dark:border-amber-900">
                        <th className="p-3.5">Register Number</th>
                        <th className="p-3.5">Student Name</th>
                        <th className="p-3.5">Department</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredAbsentees.filter(st => {
                        const status = attendanceState[st.id];
                        return status === "ML" || status === "MEDICAL_LEAVE";
                      }).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500 font-medium">
                            No students on Medical Leave (ML) for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredAbsentees
                          .filter(st => {
                            const status = attendanceState[st.id];
                            return status === "ML" || status === "MEDICAL_LEAVE";
                          })
                          .map((st) => (
                            <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="p-3.5 font-bold font-mono text-indigo-600 dark:text-indigo-400">{st.registerNo}</td>
                              <td className="p-3.5 font-bold text-slate-900 dark:text-white">{st.fullName}</td>
                              <td className="p-3.5 text-slate-600 dark:text-slate-400 font-semibold">{st.department?.code || selectedDepartmentId || "AI&ML"}</td>
                              <td className="p-3.5">
                                <Badge variant="warning">Medical Leave (ML)</Badge>
                              </td>
                              <td className="p-3.5 font-medium text-slate-500">{selectedDate}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {attendanceMode === "HISTORY" && (
          <div className="ui-card rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm space-y-4 p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Saved Attendance History</span>
            </h3>

            {historyLoading ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
            ) : historyList.length === 0 ? (
              <EmptyState
                title="No Attendance History Found"
                description="Save attendance records first to display history logs."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Total Marked</th>
                      <th className="p-3.5">Present</th>
                      <th className="p-3.5">Absent</th>
                      <th className="p-3.5">OD</th>
                      <th className="p-3.5">ML</th>
                      <th className="p-3.5">Long Absent</th>
                      <th className="p-3.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {historyList.map((item) => (
                      <tr key={item.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          {item.date}
                        </td>
                        <td className="p-3.5 font-bold text-indigo-600 dark:text-indigo-400">
                          {item.marked}
                        </td>
                        <td className="p-3.5 text-emerald-600 font-bold">{item.present}</td>
                        <td className="p-3.5 text-rose-600 font-bold">{item.absent}</td>
                        <td className="p-3.5 text-blue-600 font-bold">{item.od}</td>
                        <td className="p-3.5 text-amber-600 font-bold">{item.ml}</td>
                        <td className="p-3.5 text-red-600 font-bold">{item.longAbsent}</td>
                        <td className="p-3.5">
                          <button
                            onClick={() => handleOpenHistoryDate(item.date)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold transition text-[11px]"
                          >
                            Open / Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top-Level Delete Management Panel */}
      <DeleteManagementPanel
        isOpen={isDeletePanelOpen}
        onClose={() => setIsDeletePanelOpen(false)}
        title="Delete Attendance Session — Session Cancellation"
        moduleName="Attendance Session"
        academicYears={[...ACADEMIC_YEAR_OPTIONS]}
        reasons={["Class Cancelled", "Duplicate Session", "Faculty Leave", "Schedule Shift", "Wrong Date Entry"]}
        records={attendanceSessions.map((sess) => ({
          id: sess.id,
          name: `${sess.course?.code || "SUB"} — ${sess.course?.title || "Subject Session"}`,
          identifier: sess.date,
          subtext: `Students: ${sess.totalStudents || 0} | Present: ${sess.presentCount || 0} | Absent: ${sess.absentCount || 0}`,
          academicYear: sess.academicYear,
          batch: sess.batch?.name,
          status: sess.isArchived ? "CANCELLED" : "RECORDED",
          badge: sess.period ? `Period ${sess.period}` : "FN",
          isArchived: sess.isArchived,
          warningMsg: "Deleting an attendance session automatically recalculates affected student overall percentages across Central Reports.",
        }))}
        onConfirmDelete={async (sessionId) => {
          const res = await fetch(`/api/attendance/sessions/${sessionId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Failed to delete attendance session");
          loadStudentsAndAttendance();
          fetchAttendanceSessions();
        }}
        onConfirmArchive={async (sessionId, reason, notes) => {
          const res = await fetch(`/api/attendance/sessions/${sessionId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason, notes }),
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Failed to cancel attendance session");
          loadStudentsAndAttendance();
          fetchAttendanceSessions();
        }}
      />
    </div>
  );
}

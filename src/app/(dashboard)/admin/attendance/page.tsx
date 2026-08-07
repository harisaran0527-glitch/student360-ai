"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { ACADEMIC_YEAR_OPTIONS, DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
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

type AttendanceStatus = "PRESENT" | "ABSENT" | "OD" | "INTERNSHIP" | "MEDICAL_LEAVE" | "LATE";

export default function AdminTakeAttendancePage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  // Selection state
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(DEFAULT_ACADEMIC_YEAR);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  // Student list & status state
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Fetch initial options
  useEffect(() => {
    Promise.all([
      fetch("/api/academic-years", { credentials: "include", cache: "no-store" }).then(async (res) => {
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `Academic Years HTTP ${res.status}`);
        }
        return res.json();
      }),
      fetch("/api/batches", { credentials: "include", cache: "no-store" }).then(async (res) => {
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `Batches HTTP ${res.status}`);
        }
        return res.json();
      }),
    ])
      .then(([ayData, batchData]) => {
        const years = ayData.academicYears || [];
        setAcademicYears(years);

        const savedAY = localStorage.getItem("selected_academic_year");
        if (savedAY && years.some((y: any) => y.yearCode === savedAY)) {
          setSelectedAcademicYear(savedAY);
        } else if (ayData.currentYearCode && years.some((y: any) => y.yearCode === ayData.currentYearCode)) {
          setSelectedAcademicYear(ayData.currentYearCode);
        } else if (years.length > 0) {
          setSelectedAcademicYear(years[0].yearCode);
        }

        const bList = batchData.batches || [];
        setBatches(bList);
        if (bList.length > 0) {
          setSelectedBatchId(bList[0].id);
        }
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

  // Fetch students and existing attendance when filters change
  const loadStudentsAndAttendance = async () => {
    if (!selectedBatchId || !selectedAcademicYear) return;
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        academicYear: selectedAcademicYear,
        batchId: selectedBatchId,
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentsAndAttendance();
  }, [selectedAcademicYear, selectedBatchId, selectedDate, selectedCourseId]);

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
  };

  // Summary counts
  const totalStudents = students.length;
  const presentCount = Object.values(attendanceState).filter((s) => s === "PRESENT").length;
  const absentCount = Object.values(attendanceState).filter((s) => s === "ABSENT").length;
  const odCount = Object.values(attendanceState).filter((s) => s === "OD").length;
  const internshipCount = Object.values(attendanceState).filter((s) => s === "INTERNSHIP").length;
  const medicalCount = Object.values(attendanceState).filter((s) => s === "MEDICAL_LEAVE").length;
  const lateCount = Object.values(attendanceState).filter((s) => s === "LATE").length;

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
            <button
              onClick={handleSave}
              disabled={saving || students.length === 0}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? "Saving..." : "+ Save Attendance"}</span>
            </button>

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
          </div>
        }
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Control Bar */}
        <div className="ui-card p-6 rounded-2xl bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Attendance Selector (Single Class Context)</span>
            </h2>
            {isEditMode ? (
              <Badge variant="warning">
                <Edit3 className="w-3 h-3 mr-1" /> Editing Saved Attendance
              </Badge>
            ) : (
              <Badge variant="success">New Attendance Session</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
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
                Batch *
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="ui-input w-full p-2"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    Batch {b.name}
                  </option>
                ))}
              </select>
            </div>

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
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-500">Total</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{totalStudents}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
            <div className="text-[10px] uppercase font-bold text-emerald-600">Present</div>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{presentCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center">
            <div className="text-[10px] uppercase font-bold text-rose-600">Absent</div>
            <div className="text-lg font-bold text-rose-700 dark:text-rose-400">{absentCount}</div>
          </div>
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
        </div>

        {/* Quick Batch Actions & Student List */}
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

          {loading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              title={`No students found for Academic Year ${selectedAcademicYear} and Batch ${batches.find((b) => b.id === selectedBatchId)?.name || selectedBatchId}.`}
              description="Ensure students have been added to this batch and academic year in the Batches & Progression page."
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
                  {students.map((st, idx) => {
                    const status = attendanceState[st.id] || "PRESENT";
                    return (
                      <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3.5 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                          {st.registerNo}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          {st.fullName}
                        </td>
                        <td className="p-3.5 font-medium">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              st.attendancePercentage >= 75
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {st.attendancePercentage}%
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(
                              [
                                "PRESENT",
                                "ABSENT",
                                "OD",
                                "INTERNSHIP",
                                "MEDICAL_LEAVE",
                                "LATE",
                              ] as AttendanceStatus[]
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
                                  : stKey === "INTERNSHIP"
                                  ? isSel
                                    ? "bg-purple-600 text-white"
                                    : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                                  : stKey === "MEDICAL_LEAVE"
                                  ? isSel
                                    ? "bg-amber-600 text-white"
                                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  : isSel
                                  ? "bg-sky-600 text-white"
                                  : "bg-sky-50 text-sky-700 hover:bg-sky-100";

                              return (
                                <button
                                  key={stKey}
                                  type="button"
                                  onClick={() => handleStatusChange(st.id, stKey)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border border-transparent ${btnColor}`}
                                >
                                  {stKey.replace("_", " ")}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom Save Action */}
          {students.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Updating attendance automatically recalculates student percentages.
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

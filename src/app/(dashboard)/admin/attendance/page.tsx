"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { ACADEMIC_YEAR_OPTIONS, DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteManagementPanel } from "@/components/ui/DeleteManagementPanel";
import {
  shareStatusCardAsImage,
  ShareStatusReportParams,
} from "@/lib/nativeShare";
import {
  Calendar,
  CheckSquare,
  Square,
  Save,
  Trash2,
  Clock,
  UserCheck,
  Search,
  Filter,
  FileText,
  AlertCircle,
  Share2,
  Download,
  ArrowLeft,
  ChevronDown,
  XCircle,
  X,
  RefreshCw,
  CheckCircle2,
  Database,
  ShieldCheck,
} from "lucide-react";

type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "OD"
  | "MEDICAL_LEAVE"
  | "ML"
  | "LONG_ABSENT"
  | "INTERNSHIP"
  | "LATE"
  | "UNMARKED"
  | "NOT_MARKED";

export default function AdminAttendancePage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(DEFAULT_ACADEMIC_YEAR);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceMode, setAttendanceMode] = useState<"FULL_DAY" | "SUBJECT" | "ABSENTEES" | "HISTORY" | "RECOVERY">("FULL_DAY");
  const [isDeletePanelOpen, setIsDeletePanelOpen] = useState<boolean>(false);
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);

  // Recovery & Reconciliation state
  const [recoveryReport, setRecoveryReport] = useState<any | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState<boolean>(false);
  const [reconciling, setReconciling] = useState<boolean>(false);

  // Search filter
  const [searchTerm, setSearchTerm] = useState<string>("");

  // History tab state
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [absenteesSearchTerm, setAbsenteesSearchTerm] = useState<string>("");
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);
  const [historyDetailStudents, setHistoryDetailStudents] = useState<any[]>([]);
  const [historyDetailMap, setHistoryDetailMap] = useState<Record<string, string>>({});
  const [historyDetailLoading, setHistoryDetailLoading] = useState<boolean>(false);

  // Share modal / menu state for history list
  const [shareModalItem, setShareModalItem] = useState<any | null>(null);
  const [sharingKey, setSharingKey] = useState<string | null>(null);

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

  const loadRecoveryReport = React.useCallback(async () => {
    setRecoveryLoading(true);
    try {
      const res = await fetch("/api/admin/attendance/reconcile");
      const data = await res.json();
      if (data.success) {
        setRecoveryReport(data.data?.report || data.report || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRecoveryLoading(false);
    }
  }, []);

  const handleRunReconciliation = async () => {
    setReconciling(true);
    try {
      const res = await fetch("/api/admin/attendance/reconcile", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "Reconciliation failed");
      }
      setRecoveryReport(data.data?.report || data.report || null);
      setMessage({ text: "Safe reconciliation completed successfully! Attendance percentages updated.", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setReconciling(false);
    }
  };

  useEffect(() => {
    if (attendanceMode === "HISTORY") {
      loadHistory();
    } else if (attendanceMode === "RECOVERY") {
      loadRecoveryReport();
    }
  }, [attendanceMode, loadHistory, loadRecoveryReport]);

  // Load detailed historical attendance records when a specific history date is selected (READ-ONLY)
  useEffect(() => {
    if (selectedHistoryDate && attendanceMode === "HISTORY") {
      setHistoryDetailLoading(true);
      const params = new URLSearchParams({
        academicYear: selectedAcademicYear,
        departmentId: selectedDepartmentId,
        date: selectedHistoryDate,
      });
      fetch(`/api/attendance/full-day?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          const studentList = data.data?.students || data.students || [];
          const existingRecords = data.data?.existingAttendance || data.existingAttendance || [];
          const map: Record<string, string> = {};
          existingRecords.forEach((rec: any) => {
            let st = rec.status;
            if (st === "MEDICAL_LEAVE") st = "ML";
            map[rec.studentId] = st;
          });
          setHistoryDetailStudents(studentList);
          setHistoryDetailMap(map);
        })
        .catch((err) => console.error(err))
        .finally(() => setHistoryDetailLoading(false));
    }
  }, [selectedHistoryDate, selectedAcademicYear, selectedDepartmentId, attendanceMode]);

  // Status-Wise Canvas PNG Image Generator + Direct WhatsApp / Web Share API Handler
  const handleShareHistoryStatus = async (
    dateStr: string,
    statusType: "Present" | "Absent" | "OD" | "Medical Leave" | "Long Absent" | "Internship" | "Late"
  ) => {
    const key = `${dateStr}_${statusType}`;
    setSharingKey(key);
    try {
      const params = new URLSearchParams({
        academicYear: selectedAcademicYear,
        departmentId: selectedDepartmentId,
        date: dateStr,
      });
      const res = await fetch(`/api/attendance/full-day?${params.toString()}`);
      const data = await res.json();
      const studentList: any[] = data.data?.students || data.students || [];
      const existingRecords: any[] = data.data?.existingAttendance || data.existingAttendance || [];

      const existingMap: Record<string, string> = {};
      existingRecords.forEach((rec: any) => {
        let st = rec.status;
        if (st === "MEDICAL_LEAVE") st = "ML";
        existingMap[rec.studentId] = st;
      });

      const filtered = studentList.filter((st: any) => {
        const s = existingMap[st.id];
        if (statusType === "Present") return s === "PRESENT";
        if (statusType === "Absent") return s === "ABSENT";
        if (statusType === "OD") return s === "OD";
        if (statusType === "Medical Leave") return s === "ML" || s === "MEDICAL_LEAVE";
        if (statusType === "Long Absent") return s === "LONG_ABSENT";
        if (statusType === "Internship") return s === "INTERNSHIP";
        if (statusType === "Late") return s === "LATE";
        return false;
      });

      if (filtered.length === 0) {
        alert(`No students marked as '${statusType}' for ${dateStr}.`);
        return;
      }

      const reportStudents = filtered.map((st: any) => ({
        id: st.id,
        studentName: st.fullName || "Student",
        registerNumber: st.registerNo || "N/A",
        status: statusType,
      }));

      const fileName = `${statusType.replace(/\s+/g, "_")}_Attendance_${dateStr}.png`;

      await shareStatusCardAsImage({
        date: dateStr,
        subject: "Full-Day Session",
        status: statusType,
        totalStudentsCount: reportStudents.length,
        studentList: reportStudents,
        fileName,
      });
    } catch (err: any) {
      console.error("[Share Error]", err);
      setMessage({ text: err.message || "Failed to share attendance report image", type: "error" });
    } finally {
      setSharingKey(null);
      setShareModalItem(null);
    }
  };

  // Student list & status state for marking mode
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
    return status === "ABSENT" || status === "LONG_ABSENT";
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
    fetch("/api/departments")
      .then((res) => res.json())
      .then((data) => {
        const dList: any[] = data.departments || data.data?.departments || [];
        const formatted = dList.map((d: any) => {
          let displayCode = d.code === "AIDS" ? "AI&DS" : d.code;
          let displayName = d.name;
          if (d.code === "AIML" || d.name === "AI & ML" || (d.name && d.name.includes("Artificial Intelligence & Machine"))) {
            displayName = "Artificial Intelligence & Machine Learning";
          }
          return {
            ...d,
            displayCode,
            displayName,
          };
        });

        if (formatted.length === 0) {
          formatted.push({
            id: "aiml-default",
            code: "AIML",
            name: "Artificial Intelligence & Machine Learning",
            displayName: "Artificial Intelligence & Machine Learning",
          });
        }

        setDepartments(formatted);

        const aimlDept = formatted.find(
          (d: any) => d.code === "AIML" || d.displayName.includes("Artificial Intelligence") || d.name === "AI & ML"
        ) || formatted[0];

        if (aimlDept) {
          setSelectedDepartmentId(aimlDept.id);
        }
      })
      .catch((err: any) => console.error("[Departments Options Error]", err));

    fetch("/api/batches")
      .then((res) => res.json())
      .then((data) => {
        const bList = data.batches || data.data?.batches || [];
        setBatches(bList);
      })
      .catch((err: any) => console.error("[Batches Options Error]", err));

    fetch("/api/academic-years")
      .then((res) => res.json())
      .then((data) => {
        const years = data.data?.academicYears || data.academicYears || [];
        setAcademicYears(years);
        const savedAY = typeof window !== "undefined" ? localStorage.getItem("selected_academic_year") : null;
        if (savedAY && years.some((y: any) => y.yearCode === savedAY)) {
          setSelectedAcademicYear(savedAY);
        } else if (data.currentYearCode && years.some((y: any) => y.yearCode === data.currentYearCode)) {
          setSelectedAcademicYear(data.currentYearCode);
        } else if (years.length > 0) {
          setSelectedAcademicYear(years[0].yearCode);
        }
      })
      .catch((err: any) => console.error("[Academic Years Error]", err));

    const handleAYChange = (e: any) => {
      if (e.detail?.academicYear) {
        setSelectedAcademicYear(e.detail.academicYear);
      }
    };
    window.addEventListener("academicYearChanged", handleAYChange);
    return () => window.removeEventListener("academicYearChanged", handleAYChange);
  }, []);

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

        if (existingRecords.length > 0) {
          setIsEditMode(true);
          existingRecords.forEach((rec: any) => {
            let st = rec.status;
            if (st === "MEDICAL_LEAVE") st = "ML";
            existingMap[rec.studentId] = st as AttendanceStatus;
          });
        } else {
          setIsEditMode(false);
          studentList.forEach((st: any) => {
            existingMap[st.id] = "UNMARKED";
          });
        }

        setAttendanceState(existingMap);
      }
    } catch (err: any) {
      console.error("[Load Attendance Error]", err);
      setMessage({ text: `Failed to load attendance roster: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedAcademicYear, selectedBatchId, selectedDepartmentId, selectedDate, selectedCourseId, attendanceMode]);

  const fetchAttendanceSessions = React.useCallback(async () => {
    try {
      const res = await fetch("/api/attendance/sessions");
      const data = await res.json();
      if (data.success) {
        setAttendanceSessions(data.data?.sessions || data.sessions || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadStudentsAndAttendance();
    fetchAttendanceSessions();
  }, [loadStudentsAndAttendance, fetchAttendanceSessions]);

  // Attendance Status Toggle Handlers for Marking Mode (Including Individual Student Clear)
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    students.forEach((st) => {
      updated[st.id] = status;
    });
    setAttendanceState(updated);
  };

  const handleSave = async () => {
    if (saving) return; // Immediate double-click prevention

    if (attendanceMode === "SUBJECT") {
      if (!selectedCourseId) {
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
  const absentCount = students.filter((st) => attendanceState[st.id] === "ABSENT").length;
  const odCount = students.filter((st) => attendanceState[st.id] === "OD").length;
  const mlCount = students.filter((st) => attendanceState[st.id] === "ML" || attendanceState[st.id] === "MEDICAL_LEAVE").length;
  const longAbsentCount = students.filter((st) => attendanceState[st.id] === "LONG_ABSENT").length;
  const internshipCount = students.filter((st) => attendanceState[st.id] === "INTERNSHIP").length;
  const lateCount = students.filter((st) => attendanceState[st.id] === "LATE").length;
  const medicalCount = mlCount;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="Student Attendance & Daily Logging"
        subtitle={`Department: AI & ML | Academic Year: ${selectedAcademicYear}`}
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Navigation Tabs */}
        <div className="ui-card p-2 rounded-2xl bg-white dark:bg-slate-900 flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setAttendanceMode("FULL_DAY");
              setSelectedHistoryDate(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              attendanceMode === "FULL_DAY"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Full-Day Attendance</span>
          </button>

          <button
            onClick={() => {
              setAttendanceMode("SUBJECT");
              setSelectedHistoryDate(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              attendanceMode === "SUBJECT"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Subject-Wise Period Marking</span>
          </button>

          <button
            onClick={() => {
              setAttendanceMode("ABSENTEES");
              setSelectedHistoryDate(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              attendanceMode === "ABSENTEES"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>Absentees List</span>
          </button>

          <button
            onClick={() => {
              setAttendanceMode("HISTORY");
              setSelectedHistoryDate(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              attendanceMode === "HISTORY"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Attendance History (Read Only)</span>
          </button>

          <button
            onClick={() => {
              setAttendanceMode("RECOVERY");
              setSelectedHistoryDate(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              attendanceMode === "RECOVERY"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Recovery & Reconciliation Report</span>
          </button>
        </div>

        {/* Global Filter Toolbar */}
        <div className="ui-card p-4 rounded-2xl bg-white dark:bg-slate-900 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Academic Year
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
              className="ui-input w-full p-2 font-bold text-indigo-600"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.displayCode || (d.code === "AIDS" ? "AI&DS" : d.code)} — {d.displayName || (d.code === "AIML" || d.name === "AI & ML" ? "Artificial Intelligence & Machine Learning" : d.name)}
                </option>
              ))}
            </select>
          </div>

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
                className="ui-input w-full p-2 font-bold text-indigo-600"
              >
                {courses.length === 0 ? (
                  <option value="">No active subjects found</option>
                ) : (
                  courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}: {c.title} (Sem {c.semester})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between ${
              message.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
            }`}
          >
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

        {/* Quick Batch Actions & Student List (MARKING MODE) */}
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
                  onClick={() => handleMarkAll("UNMARKED")}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 flex items-center gap-1 border border-slate-300 dark:border-slate-700"
                >
                  <XCircle className="w-3.5 h-3.5 text-slate-500" /> Clear All / Reset
                </button>
                <button
                  onClick={() => handleMarkAll("ABSENT")}
                  className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold hover:bg-rose-200 flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5" /> Mark All Absent
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
            ) : filteredStudents.length === 0 ? (
              <EmptyState
                title="No Students Found"
                description="Try adjusting your search query or academic filters."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3.5">Register No</th>
                      <th className="p-3.5">Student Name</th>
                      <th className="p-3.5">Attendance Status Marking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredStudents.map((st) => {
                      const currentStatus = attendanceState[st.id] || "UNMARKED";
                      return (
                        <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3.5 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                            {st.registerNo || st.rollNo || "N/A"}
                          </td>
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                            {st.fullName}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(["PRESENT", "ABSENT", "OD", "ML", "LONG_ABSENT", "UNMARKED"] as AttendanceStatus[]).map((stKey) => {
                                const isUnmarkedKey = stKey === "UNMARKED";
                                const active = isUnmarkedKey
                                  ? (currentStatus === "UNMARKED" || currentStatus === "NOT_MARKED")
                                  : (currentStatus === stKey || (stKey === "ML" && currentStatus === "MEDICAL_LEAVE"));

                                let btnStyle = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200";
                                if (active) {
                                  if (stKey === "PRESENT") btnStyle = "bg-emerald-600 text-white shadow-md shadow-emerald-500/20 font-bold";
                                  if (stKey === "ABSENT") btnStyle = "bg-rose-600 text-white shadow-md shadow-rose-500/20 font-bold";
                                  if (stKey === "OD") btnStyle = "bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold";
                                  if (stKey === "ML") btnStyle = "bg-amber-600 text-white shadow-md shadow-amber-500/20 font-bold";
                                  if (stKey === "LONG_ABSENT") btnStyle = "bg-red-700 text-white shadow-md shadow-red-500/20 font-bold";
                                  if (isUnmarkedKey) btnStyle = "bg-slate-700 text-white shadow-md font-bold dark:bg-slate-600 border border-slate-800";
                                }

                                return (
                                  <button
                                    key={stKey}
                                    type="button"
                                    onClick={() => handleStatusChange(st.id, isUnmarkedKey ? "UNMARKED" : stKey)}
                                    className={`px-3 py-1.5 rounded-lg transition text-[11px] flex items-center gap-1 ${btnStyle}`}
                                    title={isUnmarkedKey ? "Clear unsaved status selection for this student only" : undefined}
                                  >
                                    {isUnmarkedKey && <XCircle className="w-3 h-3 text-slate-300" />}
                                    {stKey === "PRESENT" && "Present"}
                                    {stKey === "ABSENT" && "Absent"}
                                    {stKey === "OD" && "OD"}
                                    {stKey === "ML" && "Medical Leave"}
                                    {stKey === "LONG_ABSENT" && "Long Absent"}
                                    {isUnmarkedKey && "Clear"}
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
                  {filteredAbsentees.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500 font-medium">
                        No absentees found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAbsentees.map((st) => (
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
        )}

        {/* History Tab — STRICTLY READ-ONLY VIEW WITH STATUS SHARE */}
        {attendanceMode === "HISTORY" && (
          <div className="space-y-6">
            {selectedHistoryDate ? (
              /* DETAILED HISTORICAL ATTENDANCE RECORD (STRICTLY READ-ONLY) */
              <div className="ui-card rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm space-y-6 p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <button
                      onClick={() => setSelectedHistoryDate(null)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mb-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to History Logs
                    </button>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span>Historical Attendance Sheet — {selectedHistoryDate}</span>
                    </h3>
                  </div>
                  <Badge variant="purple">STRICTLY READ-ONLY</Badge>
                </div>

                {historyDetailLoading ? (
                  <div className="space-y-3 py-4">
                    <Skeleton className="h-12 rounded-xl" />
                    <Skeleton className="h-12 rounded-xl" />
                    <Skeleton className="h-12 rounded-xl" />
                  </div>
                ) : (
                  <>
                    {/* Summary Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Total Enrolled</div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white">{historyDetailStudents.length}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                        <div className="text-[10px] uppercase font-bold text-emerald-600">Present</div>
                        <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                          {historyDetailStudents.filter((st) => historyDetailMap[st.id] === "PRESENT").length}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center">
                        <div className="text-[10px] uppercase font-bold text-rose-600">Absent</div>
                        <div className="text-lg font-bold text-rose-700 dark:text-rose-400">
                          {historyDetailStudents.filter((st) => historyDetailMap[st.id] === "ABSENT").length}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center">
                        <div className="text-[10px] uppercase font-bold text-blue-600">OD</div>
                        <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
                          {historyDetailStudents.filter((st) => historyDetailMap[st.id] === "OD").length}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                        <div className="text-[10px] uppercase font-bold text-amber-600">Medical Leave</div>
                        <div className="text-lg font-bold text-amber-700 dark:text-amber-400">
                          {historyDetailStudents.filter((st) => historyDetailMap[st.id] === "ML" || historyDetailMap[st.id] === "MEDICAL_LEAVE").length}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center">
                        <div className="text-[10px] uppercase font-bold text-red-600">Long Absent</div>
                        <div className="text-lg font-bold text-red-700 dark:text-red-400">
                          {historyDetailStudents.filter((st) => historyDetailMap[st.id] === "LONG_ABSENT").length}
                        </div>
                      </div>
                    </div>

                    {/* Status-Wise PNG Share Bar */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Share2 className="w-4 h-4 text-indigo-600" />
                        <span>Status-Wise Image Generator & WhatsApp Native Share:</span>
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {[
                          { label: "Share Absent PNG", type: "Absent", count: historyDetailStudents.filter((s) => historyDetailMap[s.id] === "ABSENT").length, bg: "bg-rose-600 text-white" },
                          { label: "Share OD PNG", type: "OD", count: historyDetailStudents.filter((s) => historyDetailMap[s.id] === "OD").length, bg: "bg-blue-600 text-white" },
                          { label: "Share Medical Leave PNG", type: "Medical Leave", count: historyDetailStudents.filter((s) => historyDetailMap[s.id] === "ML" || historyDetailMap[s.id] === "MEDICAL_LEAVE").length, bg: "bg-amber-600 text-white" },
                          { label: "Share Long Absent PNG", type: "Long Absent", count: historyDetailStudents.filter((s) => historyDetailMap[s.id] === "LONG_ABSENT").length, bg: "bg-red-700 text-white" },
                          { label: "Share Present PNG", type: "Present", count: historyDetailStudents.filter((s) => historyDetailMap[s.id] === "PRESENT").length, bg: "bg-emerald-600 text-white" },
                          { label: "Share Internship PNG", type: "Internship", count: historyDetailStudents.filter((s) => historyDetailMap[s.id] === "INTERNSHIP").length, bg: "bg-purple-600 text-white" },
                          { label: "Share Late PNG", type: "Late", count: historyDetailStudents.filter((s) => historyDetailMap[s.id] === "LATE").length, bg: "bg-sky-600 text-white" },
                        ].map((btn) => (
                          <button
                            key={btn.type}
                            disabled={btn.count === 0 || sharingKey === `${selectedHistoryDate}_${btn.type}`}
                            onClick={() => handleShareHistoryStatus(selectedHistoryDate, btn.type as any)}
                            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${btn.bg} disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>{btn.label} ({btn.count})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Historical Student Table — Strictly Read-Only */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                            <th className="p-3.5">Register Number</th>
                            <th className="p-3.5">Student Name</th>
                            <th className="p-3.5">Saved Attendance Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {historyDetailStudents.map((st) => {
                            const status = historyDetailMap[st.id] || "UNMARKED";
                            let badgeVariant: any = "info";
                            let badgeLabel = status;
                            if (status === "PRESENT") { badgeVariant = "success"; badgeLabel = "Present"; }
                            else if (status === "ABSENT") { badgeVariant = "danger"; badgeLabel = "Absent"; }
                            else if (status === "OD") { badgeVariant = "info"; badgeLabel = "OD"; }
                            else if (status === "ML" || status === "MEDICAL_LEAVE") { badgeVariant = "warning"; badgeLabel = "Medical Leave"; }
                            else if (status === "LONG_ABSENT") { badgeVariant = "danger"; badgeLabel = "Long Absent"; }
                            else if (status === "INTERNSHIP") { badgeVariant = "purple"; badgeLabel = "Internship"; }
                            else if (status === "LATE") { badgeVariant = "warning"; badgeLabel = "Late"; }

                            return (
                              <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="p-3.5 font-bold font-mono text-indigo-600 dark:text-indigo-400">{st.registerNo || st.rollNo}</td>
                                <td className="p-3.5 font-bold text-slate-900 dark:text-white">{st.fullName}</td>
                                <td className="p-3.5">
                                  <Badge variant={badgeVariant}>{badgeLabel}</Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* HISTORY LIST VIEW CARD */
              <div className="ui-card rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-4 p-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Saved Attendance History Records (Read-Only)</span>
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
                              <div className="flex items-center gap-2">
                                {/* Read-Only View Details Button */}
                                <button
                                  onClick={() => setSelectedHistoryDate(item.date)}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold transition text-[11px] flex items-center gap-1"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>View Details</span>
                                </button>

                                {/* Visible Share Button triggering Status Share Modal */}
                                <button
                                  onClick={() => setShareModalItem(item)}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition text-[11px] flex items-center gap-1.5 shadow-sm shadow-indigo-500/20"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>Share</span>
                                </button>
                              </div>
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
        )}

        {/* RECOVERY & RECONCILIATION TAB */}
        {attendanceMode === "RECOVERY" && (
          <div className="space-y-6">
            <div className="ui-card p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <span>Historical Attendance Reconciliation & Recovery Report</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Scans database models (Attendance, AttendanceSession, FullDayAttendance, StudentSemesterHistory) to verify integrity, resolve exact duplicates, and recalculate aggregate percentages.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={loadRecoveryReport}
                    disabled={recoveryLoading}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-2 transition"
                  >
                    <RefreshCw className={`w-4 h-4 ${recoveryLoading ? "animate-spin" : ""}`} />
                    <span>Scan Database</span>
                  </button>

                  <button
                    onClick={handleRunReconciliation}
                    disabled={reconciling}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
                  >
                    <Database className="w-4 h-4" />
                    <span>{reconciling ? "Reconciling..." : "Run Safe Reconciliation"}</span>
                  </button>
                </div>
              </div>

              {recoveryLoading ? (
                <Skeleton className="h-64 rounded-xl" />
              ) : recoveryReport ? (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Total Found</span>
                      <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1 block">{recoveryReport.totalRecordsFound}</span>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Students</span>
                      <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1 block">{recoveryReport.totalStudentsWithAttendance}</span>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Duplicates</span>
                      <span className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1 block">{recoveryReport.duplicateRecordsDetected}</span>
                    </div>

                    <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Conflicts</span>
                      <span className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1 block">{recoveryReport.conflictsDetected}</span>
                    </div>

                    <div className="p-4 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40">
                      <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">Reconciled</span>
                      <span className="text-2xl font-black text-sky-700 dark:text-sky-300 mt-1 block">{recoveryReport.recordsReconciled}</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Skipped</span>
                      <span className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1 block">{recoveryReport.recordsSkipped}</span>
                    </div>
                  </div>

                  {/* Scanned Database Tables breakdown */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Scanned Database Table Summary
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      <div><span className="text-slate-500 font-medium">Attendance:</span> <span className="font-bold text-indigo-600">{recoveryReport.tablesScanned.Attendance}</span></div>
                      <div><span className="text-slate-500 font-medium">Sessions:</span> <span className="font-bold text-indigo-600">{recoveryReport.tablesScanned.AttendanceSession}</span></div>
                      <div><span className="text-slate-500 font-medium">Full Day:</span> <span className="font-bold text-indigo-600">{recoveryReport.tablesScanned.FullDayAttendance}</span></div>
                      <div><span className="text-slate-500 font-medium">Semester History:</span> <span className="font-bold text-indigo-600">{recoveryReport.tablesScanned.StudentSemesterHistory}</span></div>
                      <div><span className="text-slate-500 font-medium">Approved ODs:</span> <span className="font-bold text-indigo-600">{recoveryReport.tablesScanned.ODRecord}</span></div>
                    </div>
                  </div>

                  {/* Detected Conflicts Table */}
                  {recoveryReport.conflictDetails && recoveryReport.conflictDetails.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Detected Conflicts ({recoveryReport.conflictDetails.length}) — Flagged for Review</span>
                      </h4>
                      <div className="overflow-x-auto border border-rose-200 dark:border-rose-900/40 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-bold uppercase tracking-wider border-b border-rose-200 dark:border-rose-900/40">
                              <th className="p-3">Student Name</th>
                              <th className="p-3">Date</th>
                              <th className="p-3">Session / Course</th>
                              <th className="p-3">Conflicting Statuses</th>
                              <th className="p-3">Action Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-rose-100 dark:divide-rose-900/20">
                            {recoveryReport.conflictDetails.map((c: any, idx: number) => (
                              <tr key={idx} className="hover:bg-rose-50/50 dark:hover:bg-rose-950/20">
                                <td className="p-3 font-bold text-slate-900 dark:text-white">{c.studentName || c.studentId}</td>
                                <td className="p-3 font-semibold">{c.date}</td>
                                <td className="p-3 font-medium">{c.sessionOrCourse}</td>
                                <td className="p-3 font-bold text-rose-600">{c.existingStatuses?.join(", ")}</td>
                                <td className="p-3 text-slate-600 dark:text-slate-400">{c.details}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState title="No Reconciliation Report Available" description="Click 'Scan Database' to generate a dry-run attendance recovery report." />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status-Wise Share Modal for History Record */}
      {shareModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Share Attendance Status Image — {shareModalItem.date}
                </h3>
              </div>
              <button
                onClick={() => setShareModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Select a status to generate a separate PNG report image and share via WhatsApp / Web Share API:
            </p>

            <div className="space-y-2 text-xs">
              {[
                { label: "Share Absent Students", type: "Absent", count: shareModalItem.absent, color: "text-rose-600 bg-rose-50 border-rose-200" },
                { label: "Share OD Students", type: "OD", count: shareModalItem.od, color: "text-blue-600 bg-blue-50 border-blue-200" },
                { label: "Share Medical Leave Students", type: "Medical Leave", count: shareModalItem.ml, color: "text-amber-600 bg-amber-50 border-amber-200" },
                { label: "Share Long Absent Students", type: "Long Absent", count: shareModalItem.longAbsent, color: "text-red-700 bg-red-50 border-red-200" },
                { label: "Share Present Students", type: "Present", count: shareModalItem.present, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
              ].map((opt) => (
                <button
                  key={opt.type}
                  disabled={opt.count === 0 || sharingKey === `${shareModalItem.date}_${opt.type}`}
                  onClick={() => handleShareHistoryStatus(shareModalItem.date, opt.type as any)}
                  className={`w-full p-3 rounded-xl border font-bold flex items-center justify-between transition ${opt.color} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span className="flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    <span>{opt.label}</span>
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md font-extrabold bg-white/80 dark:bg-slate-800">
                    {opt.count === 0 ? "No Students (0)" : `${opt.count} Student(s)`}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShareModalItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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

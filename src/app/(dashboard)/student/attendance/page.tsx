"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Briefcase,
  BookOpen,
  Calendar,
  Filter,
  User,
} from "lucide-react";

export default function StudentAttendancePage() {
  const [studentData, setStudentData] = useState<any | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [allAttendances, setAllAttendances] = useState<any[]>([]);
  const [fullDaySummary, setFullDaySummary] = useState<any | null>(null);
  const [fullDayRecords, setFullDayRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<"SUBJECT" | "FULL_DAY">("SUBJECT");

  // Filters
  const [selectedSem, setSelectedSem] = useState<number | null>(null);

  const fetchAttendance = useCallback(async (semToFetch?: number | null) => {
    setLoading(true);
    try {
      const timestamp = Date.now();
      const querySem = semToFetch !== undefined ? semToFetch : selectedSem;
      const semParam = querySem ? `semester=${querySem}&` : "";
      const res = await fetch(`/api/reports/attendance/student?${semParam}t=${timestamp}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
      });
      const data = await res.json();

      if (data.success && data.student) {
        setStudentData(data.student);
        setSubjects(data.subjects || []);
        setAllAttendances(data.allAttendances || []);
        setFullDaySummary(data.fullDayAttendanceSummary || null);
        setFullDayRecords(data.fullDayRecords || []);
        if (data.student.selectedSemester) {
          setSelectedSem(data.student.selectedSemester);
        } else if (data.student.currentSemester) {
          setSelectedSem(data.student.currentSemester);
        }
      }
    } catch (err) {
      console.error("Failed to load student attendance data", err);
    } finally {
      setLoading(false);
    }
  }, [selectedSem]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleSemesterChange = (newSem: number) => {
    setSelectedSem(newSem);
    fetchAttendance(newSem);
  };

  if (loading && !studentData) {
    return (
      <div className="flex-1 p-8 space-y-6">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const minRequired = 75.0; // Institutional policy threshold
  const overallPct = studentData?.overallAttendancePercentage ?? 100.0;
  const isOverallShortage = overallPct < minRequired;

  // Helper to map saved attendance status string to badge variant and display label
  const renderStatusBadge = (statusStr: string) => {
    const s = (statusStr || "").toUpperCase();
    if (s === "PRESENT") return <Badge variant="success">Present</Badge>;
    if (s === "ABSENT") return <Badge variant="danger">Absent</Badge>;
    if (s === "OD") return <Badge variant="purple">OD</Badge>;
    if (s === "MEDICAL_LEAVE" || s === "ML") return <Badge variant="warning">Medical Leave</Badge>;
    if (s === "LONG_ABSENT") return <Badge variant="danger">Long Absent</Badge>;
    if (s === "INTERNSHIP") return <Badge variant="info">Internship</Badge>;
    if (s === "LATE") return <Badge variant="warning">Late</Badge>;
    if (s === "UNMARKED" || s === "NOT_MARKED") return <Badge variant="default">Not Marked</Badge>;
    return <Badge variant="info">{statusStr}</Badge>;
  };

  // Timezone-safe date formatter
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "N/A";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${day} ${monthNames[monthIdx] || parts[1]} ${year}`;
  };

  const getDayOfWeek = (dateStr: string): string => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return "";
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[date.getDay()];
  };

  // Full day calculation metrics
  const totalWorkingDays = fullDaySummary?.totalWorkingDays || 0;
  const fullDayPct = fullDaySummary?.fullDayPercentage || 0.0;
  const presentOnly = fullDaySummary?.present || 0;
  const absentOnly = fullDaySummary?.absent || 0;
  const odDays = fullDaySummary?.od || 0;
  const mlDays = fullDaySummary?.medicalLeave || 0;
  const longAbsentDays = fullDaySummary?.longAbsent || 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="My Institutional Attendance Center"
        subtitle={`Department: ${studentData?.department?.name || "AI & ML"} (${studentData?.department?.code || "AIML"}) | Semester ${selectedSem}`}
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab("SUBJECT")}
            className={`py-3 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition ${
              activeTab === "SUBJECT"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Subject Attendance
          </button>
          <button
            onClick={() => setActiveTab("FULL_DAY")}
            className={`py-3 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition ${
              activeTab === "FULL_DAY"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Full Day Attendance
          </button>
        </div>

        {activeTab === "SUBJECT" ? (
          <>
            {/* Shortage Alert Banner */}
            {isOverallShortage && (
              <div className="ui-card p-4 border-l-4 border-l-rose-600 bg-rose-50/60 dark:bg-rose-950/30 flex items-center gap-3 text-xs">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <span className="font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider block">
                    ATTENTION REQUIRED — ATTENDANCE SHORTAGE
                  </span>
                  <p className="text-rose-600 dark:text-rose-400 mt-0.5">
                    Your overall attendance ({overallPct}%) is currently below the mandatory institutional threshold ({minRequired}%). Please consult your course advisor.
                  </p>
                </div>
              </div>
            )}

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Overall Attendance Aggregate"
                value={`${overallPct}%`}
                subtitle={`Threshold Minimum: ${minRequired}%`}
                icon={Clock}
                color={isOverallShortage ? "rose" : "emerald"}
              />
              <StatCard
                title="Total Sessions Conducted"
                value={allAttendances.length}
                subtitle={`Present: ${allAttendances.filter((a: any) => a.status === "PRESENT").length} | Absent: ${allAttendances.filter((a: any) => a.status === "ABSENT").length}`}
                icon={BookOpen}
                color="indigo"
              />
              <StatCard
                title="Approved OD & Internship"
                value={allAttendances.filter((a: any) => a.status === "OD" || a.status === "INTERNSHIP").length}
                subtitle={`OD: ${allAttendances.filter((a: any) => a.status === "OD").length} | Internship: ${allAttendances.filter((a: any) => a.status === "INTERNSHIP").length}`}
                icon={FileCheck}
                color="purple"
              />
              <StatCard
                title="Medical & Late Sessions"
                value={allAttendances.filter((a: any) => a.status === "MEDICAL_LEAVE" || a.status === "ML" || a.status === "LATE").length}
                subtitle={`Medical: ${allAttendances.filter((a: any) => a.status === "MEDICAL_LEAVE" || a.status === "ML").length} | Late: ${allAttendances.filter((a: any) => a.status === "LATE").length}`}
                icon={Briefcase}
                color="sky"
              />
            </div>

            {/* Semester Filter Toolbar */}
            <div className="ui-card p-4 space-y-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-600" />
                  <span>Filter Subject Attendance Records</span>
                </h3>
                <span className="text-xs text-slate-500 font-semibold">Institutional Policy Minimum: {minRequired}%</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Select Semester</label>
                  <select
                    value={selectedSem || 3}
                    onChange={(e) => handleSemesterChange(parseInt(e.target.value, 10))}
                    className="ui-input w-full p-2 font-bold text-indigo-600"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Applicable Subjects Attendance Summary Table (Source of Truth) */}
            <div className="ui-card overflow-hidden space-y-4 p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Semester {selectedSem || 3} Course Attendance Breakdown ({subjects.length} Subjects Configured)</span>
              </h3>

              {subjects.length === 0 ? (
                <EmptyState
                  title="No Subjects Configured"
                  description={`No active subjects are configured for Semester ${selectedSem} in this department.`}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <th className="p-3.5">Subject Code</th>
                        <th className="p-3.5">Subject Name</th>
                        <th className="p-3.5">Credits</th>
                        <th className="p-3.5">Assigned Faculty</th>
                        <th className="p-3.5">Conducted</th>
                        <th className="p-3.5">Present</th>
                        <th className="p-3.5">Absent / OD</th>
                        <th className="p-3.5">Percentage</th>
                        <th className="p-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {subjects.map((sub: any) => {
                        const summary = sub.attendanceSummary || {};
                        const hasAtt = summary.hasAttendance;
                        const pct = summary.attendancePercentage ?? 0;
                        const isLow = hasAtt && pct < minRequired;

                        return (
                          <tr key={sub.courseId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                            <td className="p-3.5 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                              {sub.code}
                            </td>
                            <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                              {sub.name || sub.title}
                            </td>
                            <td className="p-3.5 font-semibold text-slate-600 dark:text-slate-400">
                              {sub.credits} Credits
                            </td>
                            <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                              {sub.assignedFaculty ? (
                                <div className="flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{sub.assignedFaculty.fullName}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )}
                            </td>
                            <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                              {summary.classesConducted}
                            </td>
                            <td className="p-3.5 font-semibold text-emerald-600 dark:text-emerald-400">
                              {summary.present}
                            </td>
                            <td className="p-3.5 font-semibold text-slate-600 dark:text-slate-400">
                              <span className="text-rose-600 dark:text-rose-400">{summary.absent}</span>
                              {summary.od > 0 && <span className="text-blue-600 dark:text-blue-400 ml-1">+{summary.od} OD</span>}
                            </td>
                            <td className="p-3.5 font-mono font-bold text-sm">
                              {hasAtt ? (
                                <span className={isLow ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                                  {pct}%
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">N/A</span>
                              )}
                            </td>
                            <td className="p-3.5">
                              {!hasAtt ? (
                                <Badge variant="default">Not Marked</Badge>
                              ) : isLow ? (
                                <Badge variant="danger">Shortage Warning</Badge>
                              ) : (
                                <Badge variant="success">Good Standing</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Subject Attendance Record Log Table */}
            <div className="ui-card overflow-hidden space-y-4 p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Logged Subject Session History (Semester {selectedSem}) — {allAttendances.length} Records</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Subject / Course</th>
                      <th className="p-3.5">Session / Period</th>
                      <th className="p-3.5">Exact Saved Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {allAttendances.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6">
                          <EmptyState title="No Attendance Session Logs" description={`No attendance session logs recorded yet for Semester ${selectedSem}.`} />
                        </td>
                      </tr>
                    ) : (
                      allAttendances.map((att: any) => (
                        <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                            {formatDate(att.date)}
                          </td>
                          <td className="p-3.5 font-bold text-indigo-600 dark:text-indigo-400">
                            {att.course ? `${att.course.code}: ${att.course.title}` : "Subject Session"}
                          </td>
                          <td className="p-3.5 font-medium text-slate-600 dark:text-slate-400">
                            {att.session || "FN"}
                          </td>
                          <td className="p-3.5">
                            {renderStatusBadge(att.status)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Metric Cards Grid for Full Day Attendance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Overall Full Day Attendance %"
                value={totalWorkingDays > 0 ? `${fullDayPct}%` : "No Data"}
                subtitle={`Total Saved Days: ${totalWorkingDays}`}
                icon={Clock}
                color={totalWorkingDays > 0 && fullDayPct < minRequired ? "rose" : "emerald"}
              />
              <StatCard
                title="Total Saved Days"
                value={totalWorkingDays}
                subtitle={`Present: ${presentOnly} | Absent: ${absentOnly}`}
                icon={Calendar}
                color="indigo"
              />
              <StatCard
                title="Approved OD & ML"
                value={odDays + mlDays}
                subtitle={`OD: ${odDays} | ML: ${mlDays}`}
                icon={CheckCircle2}
                color="purple"
              />
              <StatCard
                title="Long Absent"
                value={longAbsentDays}
                subtitle={`Denom: ${totalWorkingDays} days`}
                icon={AlertTriangle}
                color="rose"
              />
            </div>

            {/* Day-Wise Full Day Attendance Log Table */}
            <div className="ui-card overflow-hidden space-y-4 p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Day-Wise Full Day Attendance Log — {fullDayRecords.length} Records</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Day</th>
                      <th className="p-3.5">Exact Saved Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {fullDayRecords.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-6">
                          <EmptyState title="No Full Day Attendance" description="No full day attendance has been recorded for you yet." />
                        </td>
                      </tr>
                    ) : (
                      fullDayRecords.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                            {formatDate(r.date)}
                          </td>
                          <td className="p-3.5 font-medium text-slate-600 dark:text-slate-400">
                            {getDayOfWeek(r.date)}
                          </td>
                          <td className="p-3.5">
                            {renderStatusBadge(r.status)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

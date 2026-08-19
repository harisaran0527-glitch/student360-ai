"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";

export default function StudentAttendancePage() {
  const [studentData, setStudentData] = useState<any | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<"SUBJECT" | "FULL_DAY">("SUBJECT");

  // Filters
  const [selectedSem, setSelectedSem] = useState(1);
  const [selectedCourse, setSelectedCourse] = useState("");

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      const meData = await res.json();

      if (meData.user?.studentProfile) {
        const sRes = await fetch(`/api/students/${meData.user.studentProfile.id}`);
        const sData = await sRes.json();
        setStudentData(sData.student);
        setSelectedSem(sData.student.currentSemester || 1);
      }

      const cRes = await fetch("/api/courses");
      const cData = await cRes.json();
      setCourses(cData.courses || []);
    } catch (err) {
      console.error("Failed to load student attendance", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-8 space-y-6">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const attendances = studentData?.attendances || [];
  const minRequired = 75.0; // Institutional policy threshold

  // Helper to derive daily status from multiple periods
  const deriveDailyStatus = (statuses: string[]): string => {
    if (statuses.includes("ABSENT") || statuses.includes("LONG_ABSENT")) {
      return "Absent";
    }
    if (statuses.includes("MEDICAL_LEAVE")) {
      return "Medical";
    }
    if (statuses.includes("INTERNSHIP")) {
      return "Internship";
    }
    if (statuses.includes("OD")) {
      return "OD";
    }
    return "Present";
  };

  // Timezone-safe date formatter
  const formatDate = (dateStr: string): string => {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${day} ${monthNames[monthIdx] || parts[1]} ${year}`;
  };

  // Group attendance by date for the selected semester
  const filteredAttendances = attendances.filter((att: any) => att.course?.semester === selectedSem);

  const dailyMap: Record<string, string[]> = {};
  filteredAttendances.forEach((att: any) => {
    const d = att.date;
    if (!dailyMap[d]) {
      dailyMap[d] = [];
    }
    dailyMap[d].push(att.status);
  });

  const dailyRows = Object.keys(dailyMap)
    .sort((a, b) => b.localeCompare(a)) // Sort descending (newest first)
    .map((dateStr) => {
      const statuses = dailyMap[dateStr];
      const status = deriveDailyStatus(statuses);
      return {
        date: dateStr,
        status,
      };
    });

  const overallPct = studentData?.attendancePercentage || 100.0;
  const isOverallShortage = overallPct < minRequired;

  // Full Day Calculations
  const fullDayRecords = studentData?.fullDayAttendances || [];
  const totalWorkingDays = fullDayRecords.length;
  const presentDays = fullDayRecords.filter((r: any) => {
    const s = r.status.toUpperCase();
    return s === "PRESENT" || s === "OD" || s === "MEDICAL_LEAVE" || s === "ML";
  }).length;
  const absentDays = fullDayRecords.filter((r: any) => {
    const s = r.status.toUpperCase();
    return s === "ABSENT" || s === "LONG_ABSENT";
  }).length;
  const fullDayPct = totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 0;

  const getDayOfWeek = (dateStr: string): string => {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return "";
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[date.getDay()];
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="My Institutional Attendance Center"
        subtitle="Subject-wise attendance breakdown, approved OD/Internship logs & shortage alerts"
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
                    ATTENTION REQUIRED - ATTENDANCE SHORTAGE
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
                value={attendances.length}
                subtitle={`Present: ${attendances.filter((a: any) => a.status === "PRESENT").length} | Absent: ${attendances.filter((a: any) => a.status === "ABSENT").length}`}
                icon={BookOpen}
                color="indigo"
              />
              <StatCard
                title="Approved OD & Internship"
                value={attendances.filter((a: any) => a.status === "OD" || a.status === "INTERNSHIP").length}
                subtitle={`OD: ${attendances.filter((a: any) => a.status === "OD").length} | Internship: ${attendances.filter((a: any) => a.status === "INTERNSHIP").length}`}
                icon={FileCheck}
                color="purple"
              />
              <StatCard
                title="Medical & Late Sessions"
                value={attendances.filter((a: any) => a.status === "MEDICAL_LEAVE" || a.status === "LATE").length}
                subtitle={`Medical: ${attendances.filter((a: any) => a.status === "MEDICAL_LEAVE").length} | Late: ${attendances.filter((a: any) => a.status === "LATE").length}`}
                icon={Briefcase}
                color="sky"
              />
            </div>

            {/* Filters */}
            <div className="ui-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-600" />
                  <span>Filter Attendance Records</span>
                </h3>
                <span className="text-xs text-slate-500 font-semibold">Institutional Policy Minimum: {minRequired}%</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Semester</label>
                  <select
                    value={selectedSem}
                    onChange={(e) => setSelectedSem(parseInt(e.target.value, 10))}
                    className="ui-input w-full p-2"
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

            {/* Day-Wise Attendance Log Table */}
            <div className="ui-card overflow-hidden space-y-4 p-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Day-Wise Attendance Log</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="p-3">Date</th>
                      <th className="p-3">Daily Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {dailyRows.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-6">
                          <EmptyState title="No Attendance Records" description={`No attendance records are logged for Semester ${selectedSem}.`} />
                        </td>
                      </tr>
                    ) : (
                      dailyRows.map((r) => (
                        <tr key={r.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">
                            {formatDate(r.date)}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                r.status === "Present"
                                  ? "success"
                                  : r.status === "Absent"
                                  ? "danger"
                                  : r.status === "OD"
                                  ? "purple"
                                  : r.status === "Internship"
                                  ? "info"
                                  : "warning" // Medical
                              }
                            >
                              {r.status}
                            </Badge>
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
                subtitle={`Total Working Days: ${totalWorkingDays}`}
                icon={Clock}
                color={totalWorkingDays > 0 && fullDayPct < minRequired ? "rose" : "emerald"}
              />
              <StatCard
                title="Total Working Days"
                value={totalWorkingDays}
                subtitle={`Present: ${presentDays} | Absent: ${absentDays}`}
                icon={Calendar}
                color="indigo"
              />
              <StatCard
                title="Present Days"
                value={presentDays}
                subtitle="Fully attended school days"
                icon={CheckCircle2}
                color="emerald"
              />
              <StatCard
                title="Absent Days"
                value={absentDays}
                subtitle="Missed / unmarked school days"
                icon={AlertTriangle}
                color="rose"
              />
            </div>

            {/* Day-Wise Full Day Attendance Log Table */}
            <div className="ui-card overflow-hidden space-y-4 p-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Day-Wise Full Day Attendance Log</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="p-3">Date</th>
                      <th className="p-3">Day</th>
                      <th className="p-3">Attendance Status</th>
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
                      [...fullDayRecords]
                        .sort((a: any, b: any) => b.date.localeCompare(a.date))
                        .map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                            <td className="p-3 font-semibold text-slate-900 dark:text-white">
                              {formatDate(r.date)}
                            </td>
                            <td className="p-3 font-medium text-slate-600 dark:text-slate-400">
                              {getDayOfWeek(r.date)}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={
                                  (() => {
                                    const s = r.status.toUpperCase();
                                    if (s === "PRESENT") return "success";
                                    if (s === "ABSENT" || s === "LONG_ABSENT") return "danger";
                                    if (s === "OD") return "purple";
                                    return "warning"; // MEDICAL_LEAVE / ML
                                  })()
                                }
                              >
                                {(() => {
                                  const s = r.status.toUpperCase();
                                  if (s === "PRESENT") return "Present";
                                  if (s === "ABSENT") return "Absent";
                                  if (s === "OD") return "OD";
                                  if (s === "MEDICAL_LEAVE" || s === "ML") return "ML";
                                  if (s === "LONG_ABSENT") return "Long Absent";
                                  return r.status;
                                })()}
                              </Badge>
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

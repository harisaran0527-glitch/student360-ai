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

  // Group attendance by course code
  const subjectMap: Record<string, { title: string; conducted: number; attended: number; od: number; internship: number; medical: number }> = {};

  attendances.forEach((att: any) => {
    const code = att.course?.code || "GENERAL";
    const title = att.course?.title || "Subject Course";
    if (!subjectMap[code]) {
      subjectMap[code] = { title, conducted: 0, attended: 0, od: 0, internship: 0, medical: 0 };
    }

    subjectMap[code].conducted += 1;
    if (att.status === "PRESENT" || att.status === "LATE") subjectMap[code].attended += 1;
    else if (att.status === "OD") {
      subjectMap[code].od += 1;
      subjectMap[code].attended += 1; // policy counts OD as present
    } else if (att.status === "INTERNSHIP") {
      subjectMap[code].internship += 1;
      subjectMap[code].attended += 1; // policy counts Internship as present
    } else if (att.status === "MEDICAL_LEAVE") {
      subjectMap[code].medical += 1;
    }
  });

  const subjectRows = Object.keys(subjectMap).map((code) => {
    const data = subjectMap[code];
    const pct = data.conducted > 0 ? Number(((data.attended / data.conducted) * 100).toFixed(1)) : 100.0;
    return {
      code,
      title: data.title,
      conducted: data.conducted,
      attended: data.attended,
      od: data.od,
      internship: data.internship,
      medical: data.medical,
      percentage: pct,
      isShortage: pct < minRequired,
    };
  });

  const overallPct = studentData?.attendancePercentage || 100.0;
  const isOverallShortage = overallPct < minRequired;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="My Institutional Attendance Center"
        subtitle="Subject-wise attendance breakdown, approved OD/Internship logs & shortage alerts"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
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

            <div>
              <label className="block text-slate-500 font-semibold mb-1">Filter Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="ui-input w-full p-2"
              >
                <option value="">All Subjects</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code}: {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Subject-Wise Attendance Breakdown Table */}
        <div className="ui-card overflow-hidden space-y-4 p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Subject-Wise Attendance Breakdown</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="p-3">Course Code & Title</th>
                  <th className="p-3">Conducted</th>
                  <th className="p-3">Attended</th>
                  <th className="p-3">Approved OD</th>
                  <th className="p-3">Internship</th>
                  <th className="p-3">Attendance %</th>
                  <th className="p-3">Shortage Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {subjectRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6">
                      <EmptyState title="No Attendance Records" description="No attendance records are available yet." />
                    </td>
                  </tr>
                ) : (
                  subjectRows.map((r) => (
                    <tr key={r.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3">
                        <span className="font-bold text-slate-900 dark:text-white block">{r.code}</span>
                        <span className="text-slate-500 text-[11px]">{r.title}</span>
                      </td>
                      <td className="p-3 font-semibold">{r.conducted}</td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{r.attended}</td>
                      <td className="p-3">{r.od}</td>
                      <td className="p-3">{r.internship}</td>
                      <td className="p-3 font-black text-sm text-indigo-600 dark:text-indigo-400">{r.percentage}%</td>
                      <td className="p-3">
                        {r.isShortage ? (
                          <Badge variant="danger">ATTENTION REQUIRED</Badge>
                        ) : (
                          <Badge variant="success">Satisfactory ({minRequired}%)</Badge>
                        )}
                      </td>
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

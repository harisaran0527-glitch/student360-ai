"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Users,
  UserCheck,
  GraduationCap,
  Building2,
  CalendarDays,
  Briefcase,
  Clock,
  FileCheck,
  FolderGit2,
  Sparkles,
  Activity,
  ArrowUpRight,
  Shield,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { AdminLoginForm } from "@/components/auth/AdminLoginForm";

export default function AdminDashboardPage() {
  const [sessionUser, setSessionUser] = useState<any | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        setSessionUser(null);
      } else {
        const resData = await res.json();
        setSessionUser(resData.user);
      }
    } catch {
      setSessionUser(null);
    } finally {
      setAuthChecked(true);
    }
  };

  const fetchDashboardData = async () => {
    const selectedYear = typeof window !== "undefined" ? localStorage.getItem("selected_academic_year") || DEFAULT_ACADEMIC_YEAR : DEFAULT_ACADEMIC_YEAR;
    setLoading(true);
    try {
      const statsRes = await fetch(`/api/admin/stats?academicYear=${selectedYear}`).then((res) => res.json());
      setData(statsRes);
      const studRes = await fetch(`/api/students?academicYear=${selectedYear}`).then((res) => res.json());
      setStudents(studRes.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (sessionUser && (sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN")) {
      fetchDashboardData();

      const handleYearChange = () => fetchDashboardData();
      window.addEventListener("academicYearChanged", handleYearChange);
      return () => window.removeEventListener("academicYearChanged", handleYearChange);
    }
  }, [sessionUser]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <Skeleton className="h-64 w-96 rounded-3xl" />
      </div>
    );
  }

  if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "SUPER_ADMIN")) {
    return <AdminLoginForm />;
  }

  const stats = data?.stats || {};
  const recentAuditLogs = data?.recentAuditLogs || [];

  // Batch chart data
  const batchCounts: Record<string, number> = {};
  students.forEach((s) => {
    const name = s.batch?.name || "Other";
    batchCounts[name] = (batchCounts[name] || 0) + 1;
  });
  const batchChartData = Object.keys(batchCounts).map((k) => ({
    name: k,
    students: batchCounts[k],
  }));

  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="AI & ML Department Executive Dashboard"
        subtitle={`Department: AI & ML | Current Selected Academic Year: ${stats.currentAcademicYear || DEFAULT_ACADEMIC_YEAR}`}
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* KPI Metrics Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Academic Year"
              value={stats.currentAcademicYear || DEFAULT_ACADEMIC_YEAR}
              subtitle="Active Context"
              icon={CalendarDays}
              color="indigo"
            />
            <StatCard
              title="AI & ML Students"
              value={students.length || stats.activeStudents || 0}
              subtitle="Selected Year Cohort"
              icon={UserCheck}
              color="emerald"
            />
            <StatCard
              title="Department"
              value="AI & ML"
              subtitle="Fixed Single Context"
              icon={Building2}
              color="sky"
            />
            <StatCard
              title="Alumni Network"
              value={stats.alumniCount || 0}
              subtitle="Graduated Cohorts"
              icon={GraduationCap}
              color="purple"
            />
            <StatCard
              title="Active Batches"
              value={stats.activeBatchesCount || 0}
              subtitle="4-Year Batches Enrolled"
              icon={CalendarDays}
              color="indigo"
            />
            <StatCard
              title="Avg Attendance"
              value={`${stats.avgAttendance || 100}%`}
              subtitle="Marked via Take Attendance"
              icon={Clock}
              color="emerald"
            />
            <StatCard
              title="Placements Recorded"
              value={stats.placementsCount || 0}
              subtitle="Selected Year Offers"
              icon={Briefcase}
              color="amber"
            />
            <StatCard
              title="Certificates Vault"
              value={stats.certificatesCount || 0}
              subtitle="Uploaded Documents"
              icon={FileCheck}
              color="purple"
            />
          </div>
        )}

        {/* Dynamic Visual Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="ui-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Batch Student Distribution (AI & ML)</span>
              </h2>
            </div>
            <div className="h-64 w-full">
              {batchChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-medium">
                  No student records registered for current academic year.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={batchChartData}
                      dataKey="students"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {batchChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--bg-card)",
                        borderColor: "var(--border-color)",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="ui-card p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Quick Action Control Hub</span>
            </h2>

            <div className="space-y-2 text-xs">
              <Link
                href="/admin/attendance"
                className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 font-semibold text-emerald-700 dark:text-emerald-300 transition border border-emerald-200 dark:border-emerald-800"
              >
                <span>Take Attendance (Mark & Edit)</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/admin/master-records"
                className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 font-semibold text-indigo-700 dark:text-indigo-300 transition border border-indigo-200 dark:border-indigo-800"
              >
                <span>Student Master Directory</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/admin/reports"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 border border-slate-200 dark:border-slate-700/50 font-semibold text-slate-800 dark:text-slate-200 transition"
              >
                <span>Central Report Center</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/admin/academics"
                className="flex items-center justify-between p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 font-semibold text-purple-700 dark:text-purple-300 transition"
              >
                <span>Semester Subjects & Syllabus</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

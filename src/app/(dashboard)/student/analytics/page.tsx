"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  TrendingUp,
  UserCheck,
  Briefcase,
  Award,
  FileCheck,
  FolderGit2,
  Sparkles,
  Layers,
  Clock,
} from "lucide-react";

export default function StudentAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/ai/student-insights")
      .then((res) => res.json())
      .then((data) => setStudentData(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Personal Student Progress Analytics" subtitle="Evidence-based growth timeline & portfolio journey" />
        <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const { studentInfo, supportAttention, skillGap, careerPrep, historicalSnapshots } = studentData || {};

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="Personal Student Progress Analytics"
        subtitle="Private, evidence-based academic growth timeline & skill progress tracking"
      />

      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Banner */}
        <div className="ui-card p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl shadow-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
              {studentInfo?.department} • Semester {studentInfo?.currentSemester}
            </span>
            <Badge variant="success">Personal Private Analytics</Badge>
          </div>
          <h2 className="text-2xl font-bold">{studentInfo?.fullName} ({studentInfo?.registerNo})</h2>
          <p className="text-xs text-indigo-200">
            Self-contained individual progress analytics tracking verified skills, certificates, projects, and academic attendance.
          </p>
        </div>

        {/* Core Personal Progress Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="ui-card p-5 space-y-1">
            <span className="text-2xl font-black text-indigo-600">{careerPrep?.summaryMetrics?.verifiedSkillsCount || 0}</span>
            <span className="text-xs font-bold text-slate-500 block">Verified Skills</span>
          </div>
          <div className="ui-card p-5 space-y-1">
            <span className="text-2xl font-black text-emerald-600">{careerPrep?.summaryMetrics?.verifiedProjectsCount || 0}</span>
            <span className="text-xs font-bold text-slate-500 block">Verified Projects</span>
          </div>
          <div className="ui-card p-5 space-y-1">
            <span className="text-2xl font-black text-sky-600">{careerPrep?.summaryMetrics?.verifiedInternshipsCount || 0}</span>
            <span className="text-xs font-bold text-slate-500 block">Verified Internships</span>
          </div>
          <div className="ui-card p-5 space-y-1">
            <span className="text-2xl font-black text-purple-600">{careerPrep?.summaryMetrics?.verifiedCertificatesCount || 0}</span>
            <span className="text-xs font-bold text-slate-500 block">Certificates</span>
          </div>
        </div>

        {/* Verified Skills vs Self Reported Skills */}
        <div className="ui-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Verified Skills Passport Breakdown</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-2">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                Verified Existing Competencies ({skillGap?.verifiedExistingSkills?.length || 0})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {skillGap?.verifiedExistingSkills?.map((s: any) => (
                  <span key={s.name} className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 text-emerald-800 dark:text-emerald-300 font-bold">
                    ★ {s.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2">
              <span className="font-bold text-amber-800 dark:text-amber-300 block">
                Self-Reported Skills ({skillGap?.selfReportedSkills?.length || 0})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {skillGap?.selfReportedSkills?.map((s: any) => (
                  <span key={s.name} className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 text-amber-800 dark:text-amber-300 font-semibold">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Snapshot History */}
        <div className="ui-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Semester AI Support & Intelligence History</span>
          </h3>

          <div className="space-y-2 text-xs">
            {historicalSnapshots?.map((snap: any) => (
              <div key={snap.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">{snap.insightType} — Sem {snap.semester}</span>
                  <span className="text-slate-400 font-mono text-[10px]">{snap.engineVersion}</span>
                </div>
                <span className="text-slate-400">{new Date(snap.generatedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

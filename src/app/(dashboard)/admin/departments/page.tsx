"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Building2, UserCheck, Calendar, BookOpen, Layers } from "lucide-react";

export default function DepartmentsPage() {
  const [deptData, setDeptData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/departments")
      .then((res) => res.json())
      .then((data) => {
        const depts = data.departments || [];
        setDeptData(depts[0] || null);
      });
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="Department Setup — AI & ML Department"
        subtitle="Fixed Single Department Context & Institutional Configuration"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <div className="ui-card p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-500/20">
                AIML
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Department of Artificial Intelligence & Machine Learning
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Primary Institutional Department Code: AIML
                </p>
              </div>
            </div>
            <Badge variant="success">ACTIVE DEPARTMENT</Badge>
          </div>

          {/* Department Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Department Name
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                AI & ML
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Department Code
              </span>
              <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">
                AIML
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Course Duration
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                4 Years (8 Semesters)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Academic Year Start Date
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                June 1 (Annual Session Start)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Academic Year End Date
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                May 31 (Annual Session End)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Department Status
              </span>
              <span className="text-sm font-bold text-emerald-600">
                Operational & Configured
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 font-medium">
            <strong>Single Department Institutional Scope:</strong> Multi-department creation and department switching have been removed across all Admin Panel workflows. All student records, batches, attendance, syllabus, internships, certificates, projects, and placement drives belong strictly to the <strong>AI & ML</strong> department.
          </div>
        </div>
      </div>
    </div>
  );
}

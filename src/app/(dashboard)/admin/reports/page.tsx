"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { REPORT_CATALOG, ReportCategory } from "@/lib/reports/reportTypes";
import {
  FileText,
  Download,
  Printer,
  Filter,
  Bookmark,
  Calendar,
  Search,
  CheckCircle2,
  Users,
  Briefcase,
  Award,
  BookOpen,
  Layers,
  Sparkles,
} from "lucide-react";

import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";

export default function AdminReportingCenterPage() {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>("STUDENT_MASTER");
  const [selectedReportId, setSelectedReportId] = useState<string>("STUDENT_MASTER_FULL");

  const [loading, setLoading] = useState(true);
  const [reportResult, setReportResult] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Primary Academic Year Filter
  const [academicYear, setAcademicYear] = useState<string>(DEFAULT_ACADEMIC_YEAR);
  const [batchId, setBatchId] = useState("");
  const [semester, setSemester] = useState("");

  const [batches, setBatches] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);

  const currentReportDef = REPORT_CATALOG.find((r) => r.id === selectedReportId) || REPORT_CATALOG[0];

  const fetchOptions = async () => {
    try {
      const [ayRes, batchRes] = await Promise.all([
        fetch("/api/academic-years", { credentials: "include", cache: "no-store" }),
        fetch("/api/batches", { credentials: "include", cache: "no-store" }),
      ]);
      const ayData = await ayRes.json();
      const batchData = await batchRes.json();

      const years = ayData.academicYears || [];
      setAcademicYears(years);
      const savedAY = typeof window !== "undefined" ? localStorage.getItem("selected_academic_year") : null;
      if (savedAY && years.some((y: any) => y.yearCode === savedAY)) {
        setAcademicYear(savedAY);
      } else if (ayData.currentYearCode && years.some((y: any) => y.yearCode === ayData.currentYearCode)) {
        setAcademicYear(ayData.currentYearCode);
      } else if (years.length > 0) {
        setAcademicYear(years[0].yearCode);
      }

      setBatches(batchData.batches || []);
    } catch (err) {
      console.error("[Reports Fetch Options Error]", err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("reportId", selectedReportId);
      params.append("academicYear", academicYear);
      if (batchId) params.append("batchId", batchId);
      if (semester) params.append("semester", semester);

      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();
      setReportResult(data.reportResult || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();

    const handleAYChange = (e: any) => {
      if (e.detail?.academicYear) setAcademicYear(e.detail.academicYear);
    };
    window.addEventListener("academicYearChanged", handleAYChange);
    return () => window.removeEventListener("academicYearChanged", handleAYChange);
  }, []);

  useEffect(() => {
    fetchReport();
  }, [selectedReportId, academicYear, batchId, semester]);

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const filters = {
        academicYear,
        batchId,
        semester: semester ? parseInt(semester, 10) : undefined,
      };

      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: selectedReportId, format, filters }),
      });

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedReportId.toLowerCase()}_AY${academicYear}_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Specific AI & ML Categories requested
  const categories: { key: ReportCategory; label: string; icon: any }[] = [
    { key: "STUDENT_MASTER", label: "Student Master Report", icon: Users },
    { key: "ATTENDANCE", label: "Attendance Reports", icon: CheckCircle2 },
    { key: "INTERNSHIP", label: "Internship Report", icon: Briefcase },
    { key: "CERTIFICATE", label: "Certificate Report", icon: FileText },
    { key: "PROJECT", label: "Project Report", icon: Layers },
    { key: "PLACEMENT", label: "Placement Report", icon: Briefcase },
    { key: "ALUMNI", label: "Alumni Report", icon: Users },
  ];

  const filteredReports = REPORT_CATALOG.filter((r) => r.category === selectedCategory);

  const displayedRows = (reportResult?.rows || []).filter((row: any) =>
    Object.values(row).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="Central Report Center — AI & ML Department"
        subtitle={`Academic Year: ${academicYear} | Department: AI & ML (Single Class Context)`}
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full print:p-0 print:max-w-none">
        {/* Category Selector Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 print:hidden">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSel = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => {
                  setSelectedCategory(cat.key);
                  const firstInCat = REPORT_CATALOG.find((r) => r.category === cat.key);
                  if (firstInCat) setSelectedReportId(firstInCat.id);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                  isSel
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-report Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 print:hidden">
          {filteredReports.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelectedReportId(r.id)}
              className={`p-3.5 rounded-2xl border cursor-pointer transition space-y-1 ${
                selectedReportId === r.id
                  ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-slate-900 dark:text-white">{r.name}</span>
                {selectedReportId === r.id && <Badge variant="info">Selected</Badge>}
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2">{r.description}</p>
            </div>
          ))}
        </div>

        {/* Dynamic Filter Bar — Primary Filter: Academic Year */}
        <div className="ui-card p-4 rounded-2xl bg-white dark:bg-slate-900 space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-indigo-600" />
              Primary Report Context (Academic Year & AI & ML Scope)
            </span>
            <span className="text-[11px] text-slate-400">
              Department: AI & ML • Single Class
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Primary Academic Year Filter */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Academic Year *</label>
              <select
                value={academicYear}
                onChange={(e) => {
                  setAcademicYear(e.target.value);
                  localStorage.setItem("selected_academic_year", e.target.value);
                }}
                className="ui-input py-1.5 px-3 font-bold text-indigo-600"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.yearCode}>
                    {ay.yearCode} {ay.isCurrent ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Batch</label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="ui-input py-1.5 px-3"
              >
                <option value="">All Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="ui-input py-1.5 px-3"
              >
                <option value="">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Export & Actions Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search inside report..."
              className="ui-input pl-9 pr-4 py-2 w-full text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport("csv")}
              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs hover:bg-slate-800 flex items-center gap-1.5 shadow-md"
            >
              <Download className="w-3.5 h-3.5" /> CSV Export
            </button>
            <button
              onClick={() => handleExport("xlsx")}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
            >
              <Download className="w-3.5 h-3.5" /> Excel (.xlsx)
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Print PDF View
            </button>
          </div>
        </div>

        {/* Printable Institutional Header (Visible in Print & Preview) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Department of AI & ML — Central Report
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {currentReportDef.name} — Academic Year {academicYear}
            </h2>
          </div>
          <Badge variant="purple">Academic Year: {academicYear}</Badge>
        </div>

        {/* Data Table Preview */}
        <div className="ui-card rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          ) : displayedRows.length === 0 ? (
            <EmptyState
              title={`No records found for Academic Year ${academicYear}`}
              description="Adjust academic year or add student/attendance records to view detailed reports."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    {reportResult?.columns?.map((col: any) => (
                      <th key={col.key} className="p-3.5 whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {displayedRows.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      {reportResult?.columns?.map((col: any) => (
                        <td key={col.key} className="p-3.5 text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap">
                          {row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

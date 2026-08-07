"use client";

import React, { useState, useEffect } from "react";
import { CalendarDays, AlertTriangle } from "lucide-react";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";

export function AcademicYearSelector() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(DEFAULT_ACADEMIC_YEAR);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/academic-years", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setFetchError(null);
        const years = data.academicYears || [];
        setAcademicYears(years);
        const saved = typeof window !== "undefined" ? localStorage.getItem("selected_academic_year") : null;
        if (saved && years.some((y: any) => y.yearCode === saved)) {
          setSelectedYear(saved);
        } else if (data.currentYearCode && years.some((y: any) => y.yearCode === data.currentYearCode)) {
          setSelectedYear(data.currentYearCode);
          localStorage.setItem("selected_academic_year", data.currentYearCode);
          document.cookie = `selected_academic_year=${data.currentYearCode}; path=/; max-age=31536000`;
        } else if (years.length > 0) {
          setSelectedYear(years[0].yearCode);
        }
      })
      .catch((err) => {
        console.error("[AcademicYearSelector Error]", err);
        setFetchError(err.message);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedYear(val);
    localStorage.setItem("selected_academic_year", val);
    document.cookie = `selected_academic_year=${val}; path=/; max-age=31536000`;

    // Dispatch global event so active Admin page re-queries data
    window.dispatchEvent(new CustomEvent("academicYearChanged", { detail: { academicYear: val } }));
  };

  if (fetchError) {
    return (
      <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl px-2.5 py-1 text-xs text-rose-600 dark:text-rose-300">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
        <span className="font-bold">Year: {selectedYear}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 py-1 text-xs print:hidden">
      <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
      <span className="font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">Year:</span>
      <select
        value={selectedYear}
        onChange={handleChange}
        className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer text-xs"
      >
        {academicYears.map((ay) => (
          <option key={ay.id} value={ay.yearCode}>
            {ay.yearCode} {ay.isCurrent ? "(Current)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { CalendarDays, AlertTriangle } from "lucide-react";
import { useAcademicOptions } from "@/lib/clientOptionsCache";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";

export function AcademicYearSelector() {
  const { academicYears, currentYearCode, loading, error } = useAcademicOptions();
  const [selectedYear, setSelectedYear] = useState<string>(DEFAULT_ACADEMIC_YEAR);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("selected_academic_year") : null;
    if (saved && academicYears.some((y) => y.yearCode === saved)) {
      setSelectedYear(saved);
    } else if (currentYearCode && academicYears.some((y) => y.yearCode === currentYearCode)) {
      setSelectedYear(currentYearCode);
      localStorage.setItem("selected_academic_year", currentYearCode);
      document.cookie = `selected_academic_year=${currentYearCode}; path=/; max-age=31536000`;
    } else if (academicYears.length > 0) {
      setSelectedYear(academicYears[0].yearCode);
    }
  }, [academicYears, currentYearCode]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedYear(val);
    localStorage.setItem("selected_academic_year", val);
    document.cookie = `selected_academic_year=${val}; path=/; max-age=31536000`;

    // Dispatch global event so active Admin page re-queries data
    window.dispatchEvent(new CustomEvent("academicYearChanged", { detail: { academicYear: val } }));
  };

  if (error && academicYears.length === 0) {
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
        disabled={loading && academicYears.length === 0}
        className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer text-xs disabled:opacity-50"
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

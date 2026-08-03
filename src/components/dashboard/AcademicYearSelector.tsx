"use client";

import React, { useState, useEffect } from "react";
import { CalendarDays } from "lucide-react";

export function AcademicYearSelector() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("2025-2026");

  useEffect(() => {
    fetch("/api/academic-years")
      .then((res) => res.json())
      .then((data) => {
        const years = data.academicYears || [];
        setAcademicYears(years);
        const saved = localStorage.getItem("selected_academic_year");
        if (saved && years.some((y: any) => y.yearCode === saved)) {
          setSelectedYear(saved);
        } else if (data.currentYearCode) {
          setSelectedYear(data.currentYearCode);
          localStorage.setItem("selected_academic_year", data.currentYearCode);
          document.cookie = `selected_academic_year=${data.currentYearCode}; path=/; max-age=31536000`;
        } else if (years.length > 0) {
          setSelectedYear(years[0].yearCode);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedYear(val);
    localStorage.setItem("selected_academic_year", val);
    document.cookie = `selected_academic_year=${val}; path=/; max-age=31536000`;

    // Dispatch global event so active Admin page re-queries data
    window.dispatchEvent(new CustomEvent("academicYearChanged", { detail: { academicYear: val } }));
  };

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

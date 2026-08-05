"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface AcademicYearOption {
  id: string;
  yearCode: string;
  name: string;
  status: string;
  isCurrent: boolean;
}

export interface BatchOption {
  id: string;
  name: string;
  admissionYear: number;
  graduationYear: number;
  expectedGraduationYear?: number;
  admissionAcademicYear?: string;
  departmentId?: string | null;
  departmentCode?: string;
  currentSemester: number;
  status: string;
  studentCount?: number;
  _count?: { students: number };
}

export function useAcademicOptions() {
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYearState] = useState<string>("");
  const [selectedBatchId, setSelectedBatchIdState] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  const fetchOptions = useCallback(async (isRetry = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    isFetchingRef.current = true;

    try {
      setError(null);

      const res = await fetch("/api/academic-options", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) {
        if (!isRetry && (res.status === 500 || res.status === 503 || res.status === 504)) {
          // Retry once on transient error
          await new Promise((r) => setTimeout(r, 600));
          return fetchOptions(true);
        }
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();

      if (!data.success || !Array.isArray(data.academicYears)) {
        throw new Error(data.error || "Failed to load academic options");
      }

      setAcademicYears(data.academicYears);
      const bList: BatchOption[] = data.batches || [];
      setBatches(bList);

      // Determine initial selected academic year from localStorage, active item, or first item
      const storedYear = typeof window !== "undefined" ? localStorage.getItem("selected_academic_year") : null;
      let initialYear = "";

      if (storedYear && data.academicYears.some((y: AcademicYearOption) => y.yearCode === storedYear)) {
        initialYear = storedYear;
      } else {
        const activeYear = data.academicYears.find((y: AcademicYearOption) => y.isCurrent);
        initialYear = activeYear ? activeYear.yearCode : (data.academicYears[0]?.yearCode || "2025-2026");
      }

      setSelectedAcademicYearState((prev) => prev || initialYear);
      if (typeof window !== "undefined" && initialYear) {
        localStorage.setItem("selected_academic_year", initialYear);
      }

      // Auto-select first batch if none currently selected
      if (bList.length > 0) {
        setSelectedBatchIdState((prev) => (bList.some((b) => b.id === prev) ? prev : bList[0].id));
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return; // Ignore aborted requests
      }
      console.error("[useAcademicOptions Error]", err);
      setError(err.message || "Unable to load Academic Year and Batch.");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const setSelectedAcademicYear = useCallback((yearCode: string) => {
    setSelectedAcademicYearState(yearCode);
    if (typeof window !== "undefined") {
      localStorage.setItem("selected_academic_year", yearCode);
      window.dispatchEvent(new CustomEvent("academicYearChanged", { detail: { yearCode, academicYear: yearCode } }));
    }
  }, []);

  const setSelectedBatchId = useCallback((batchId: string) => {
    setSelectedBatchIdState(batchId);
  }, []);

  useEffect(() => {
    fetchOptions();

    const handleSync = (e: any) => {
      const stored = e.detail?.yearCode || e.detail?.academicYear || (typeof window !== "undefined" ? localStorage.getItem("selected_academic_year") : null);
      if (stored) {
        setSelectedAcademicYearState(stored);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("academicYearChanged", handleSync);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("academicYearChanged", handleSync);
      }
    };
  }, [fetchOptions]);

  return {
    academicYears,
    batches,
    selectedAcademicYear,
    setSelectedAcademicYear,
    selectedBatchId,
    setSelectedBatchId,
    selectedBatch: selectedBatchId,
    setSelectedBatch: setSelectedBatchId,
    loading,
    error,
    refresh: () => fetchOptions(false),
  };
}

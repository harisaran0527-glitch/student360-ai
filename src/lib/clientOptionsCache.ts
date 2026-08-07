/**
 * Client-Side In-Memory Cache & Shared Loader for Academic Metadata
 * Standardizes Academic Years, Batches, and Departments options fetching.
 * Features:
 * - 5-minute TTL in-memory cache
 * - Request deduplication (single network call for concurrent component mounts)
 * - Support for manual cache invalidation
 */

import { useState, useEffect } from "react";

export interface AcademicYearOption {
  id: string;
  yearCode: string;
  name: string;
  isCurrent: boolean;
  status?: string;
}

export interface BatchOption {
  id: string;
  name: string;
  admissionYear: number;
  expectedGraduationYear: number;
  graduationYear?: number;
  studentCount?: number;
  departmentId?: string | null;
}

export interface DepartmentOption {
  id: string;
  code: string;
  name: string;
  hodName?: string | null;
}

export interface AcademicOptionsData {
  academicYears: AcademicYearOption[];
  batches: BatchOption[];
  departments: DepartmentOption[];
  currentYearCode: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 Minutes

let cachedData: AcademicOptionsData | null = null;
let cacheTimestamp = 0;
let pendingFetchPromise: Promise<AcademicOptionsData> | null = null;

/**
 * Fetch or reuse cached academic options metadata.
 */
export async function getAcademicOptions(forceRefresh = false): Promise<AcademicOptionsData> {
  const now = Date.now();

  if (!forceRefresh && cachedData && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedData;
  }

  if (pendingFetchPromise && !forceRefresh) {
    return pendingFetchPromise;
  }

  pendingFetchPromise = (async () => {
    try {
      // First try unified fast endpoint /api/academic-options
      const res = await fetch("/api/academic-options", {
        credentials: "include",
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.academicYears && data.batches) {
          cachedData = {
            academicYears: data.academicYears || [],
            batches: data.batches || [],
            departments: data.departments || [],
            currentYearCode: data.currentYearCode || "2025-2029",
          };
          cacheTimestamp = Date.now();
          return cachedData;
        }
      }

      // Fallback: Parallel fetch to individual routes
      const [ayRes, batchRes, deptRes] = await Promise.all([
        fetch("/api/academic-years", { credentials: "include", cache: "no-store" }),
        fetch("/api/batches", { credentials: "include", cache: "no-store" }),
        fetch("/api/departments", { credentials: "include", cache: "no-store" }),
      ]);

      const ayData = ayRes.ok ? await ayRes.json() : {};
      const batchData = batchRes.json ? await batchRes.json() : {};
      const deptData = deptRes.ok ? await deptRes.json() : {};

      cachedData = {
        academicYears: ayData.academicYears || [],
        batches: batchData.batches || [],
        departments: deptData.departments || [],
        currentYearCode: ayData.currentYearCode || "2025-2029",
      };
      cacheTimestamp = Date.now();
      return cachedData;
    } catch (err) {
      console.error("[AcademicOptionsCache Error]", err);
      if (cachedData) return cachedData;
      throw err;
    } finally {
      pendingFetchPromise = null;
    }
  })();

  return pendingFetchPromise;
}

/**
 * Manually invalidate the client options cache.
 */
export function invalidateOptionsCache(): void {
  cachedData = null;
  cacheTimestamp = 0;
  pendingFetchPromise = null;
}

/**
 * React Hook for consuming shared academic options safely with loading state.
 */
export function useAcademicOptions() {
  const [data, setData] = useState<AcademicOptionsData | null>(cachedData);
  const [loading, setLoading] = useState<boolean>(!cachedData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getAcademicOptions()
      .then((opts) => {
        if (isMounted) {
          setData(opts);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load options");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const opts = await getAcademicOptions(true);
      setData(opts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    academicYears: data?.academicYears || [],
    batches: data?.batches || [],
    departments: data?.departments || [],
    currentYearCode: data?.currentYearCode || "2025-2029",
    loading,
    error,
    refresh,
  };
}

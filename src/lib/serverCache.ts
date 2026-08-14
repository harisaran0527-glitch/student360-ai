/**
 * Server-Side In-Memory Cache for Academic Options & Metadata
 * Eliminates database queries for rarely changing options like Academic Years, Batches, and Departments.
 * TTL of 60 seconds.
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

let academicOptionsCache: CacheEntry<any> | null = null;
let academicYearsCache: CacheEntry<any> | null = null;
let batchesCache: CacheEntry<any> | null = null;
let departmentsCache: CacheEntry<any> | null = null;
let studentOptionsCache: Map<string, CacheEntry<any>> = new Map();

const CACHE_TTL_MS = 60 * 1000; // 60 Seconds

export function getCachedAcademicOptions(): any | null {
  const now = Date.now();
  if (academicOptionsCache && now - academicOptionsCache.timestamp < CACHE_TTL_MS) {
    return academicOptionsCache.data;
  }
  return null;
}

export function setCachedAcademicOptions(data: any): void {
  academicOptionsCache = { data, timestamp: Date.now() };
}

export function getCachedAcademicYears(): any | null {
  const now = Date.now();
  if (academicYearsCache && now - academicYearsCache.timestamp < CACHE_TTL_MS) {
    return academicYearsCache.data;
  }
  return null;
}

export function setCachedAcademicYears(data: any): void {
  academicYearsCache = { data, timestamp: Date.now() };
}

export function getCachedBatches(): any | null {
  const now = Date.now();
  if (batchesCache && now - batchesCache.timestamp < CACHE_TTL_MS) {
    return batchesCache.data;
  }
  return null;
}

export function setCachedBatches(data: any): void {
  batchesCache = { data, timestamp: Date.now() };
}

export function getCachedDepartments(): any | null {
  const now = Date.now();
  if (departmentsCache && now - departmentsCache.timestamp < CACHE_TTL_MS) {
    return departmentsCache.data;
  }
  return null;
}

export function setCachedDepartments(data: any): void {
  departmentsCache = { data, timestamp: Date.now() };
}

export function getCachedStudentOptions(key: string): any | null {
  const now = Date.now();
  const entry = studentOptionsCache.get(key);
  if (entry && now - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  return null;
}

export function setCachedStudentOptions(key: string, data: any): void {
  studentOptionsCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Invalidate all metadata caches when any write operations (POST, PUT, DELETE) occur.
 */
export function invalidateServerMetadataCache(): void {
  academicOptionsCache = null;
  academicYearsCache = null;
  batchesCache = null;
  departmentsCache = null;
  studentOptionsCache.clear();
}

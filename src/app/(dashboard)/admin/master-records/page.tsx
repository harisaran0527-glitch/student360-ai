"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Drawer } from "@/components/ui/Drawer";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { DeleteManagementPanel } from "@/components/ui/DeleteManagementPanel";
import {
  Users,
  Search,
  Plus,
  FileSpreadsheet,
  Eye,
  Archive,
  RotateCcw,
  Edit,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Upload,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Download,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useAcademicOptions } from "@/hooks/useAcademicOptions";

export default function MasterRecordsPage() {
  const {
    academicYears,
    batches,
    selectedAcademicYear: selectedYear,
    setSelectedAcademicYear: setSelectedYear,
    loading: optionsLoading,
    error: optionsError,
    refresh: refreshOptions,
  } = useAcademicOptions();

  const [students, setStudents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedQuota, setSelectedQuota] = useState("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<"registerNo" | "fullName" | "cgpa">("registerNo");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const saved = localStorage.getItem("selected_academic_year");
    if (saved) setSelectedYear(saved);

    const handleAYChange = (e: any) => {
      if (e.detail?.academicYear) setSelectedYear(e.detail.academicYear);
    };
    window.addEventListener("academicYearChanged", handleAYChange);
    return () => window.removeEventListener("academicYearChanged", handleAYChange);
  }, []);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected Student Drawers & Modals
  const [quickViewStudent, setQuickViewStudent] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeletePanelOpen, setIsDeletePanelOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<any | null>(null);

  // Excel Bulk Import Wizard State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [importTab, setImportTab] = useState("valid");
  const [selectedRowIndices, setSelectedRowIndices] = useState<number[]>([]);

  // Add / Edit Form State
  const [formData, setFormData] = useState<any>({
    registerNo: "",
    rollNo: "",
    admissionNo: "",
    fullName: "",
    gender: "Male",
    dob: "2005-06-15",
    bloodGroup: "O+",
    email: "",
    password: "Student@360",
    phone: "9876543210",
    aadharNo: "",
    fatherName: "",
    motherName: "",
    guardianPhone: "",
    emergencyPhone: "",
    addressLine1: "",
    addressLine2: "",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600001",
    departmentId: "",
    batchId: "",
    sectionId: "",
    academicYear: "2025-2026",
    currentSemester: 1,
    entryType: "REGULAR",
    admissionQuota: "GQ",
    residenceType: "DAY_SCHOLAR",
    admissionDate: new Date().toISOString().split("T")[0],
    academicStatus: "PURSUING",
  });

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const activeYear = selectedYear || (typeof window !== "undefined" ? localStorage.getItem("selected_academic_year") || "ALL" : "ALL");
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (selectedBatch) query.set("batchId", selectedBatch);
      if (selectedSection) query.set("sectionId", selectedSection);
      if (activeYear && activeYear !== "ALL") query.set("academicYear", activeYear);
      if (selectedSemester) query.set("currentSemester", selectedSemester);
      if (selectedStatus) query.set("academicStatus", selectedStatus);
      if (selectedQuota && selectedQuota !== "ALL") query.set("admissionQuota", selectedQuota);
      if (showArchived) query.set("isArchived", "true");

      const res = await fetch(`/api/students?${query.toString()}`);
      const data = await res.json();
      setStudents(data.data?.students || data.students || []);
    } catch (err) {
      console.error("Failed to fetch students", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const deptRes = await fetch("/api/departments");
      const deptData = await deptRes.json();
      setDepartments(deptData.departments || []);

      if (deptData.departments?.length > 0) {
        setFormData((prev: any) => ({ ...prev, departmentId: deptData.departments[0].id }));
      }
      if (batches.length > 0) {
        setFormData((prev: any) => ({ ...prev, batchId: batches[0].id }));
      }
    } catch (err) {
      console.error("Failed to fetch metadata", err);
    }
  };

  useEffect(() => {
    fetchMetadata();

    const handleYearChange = () => fetchStudents();
    window.addEventListener("academicYearChanged", handleYearChange);
    return () => window.removeEventListener("academicYearChanged", handleYearChange);
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [search, selectedBatch, selectedSection, selectedYear, selectedSemester, selectedStatus, selectedQuota, showArchived]);

  // Handle Add Student
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create student profile");

      setIsAddModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Edit Student Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    try {
      const res = await fetch(`/api/students/${editStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update student profile");

      setEditStudent(null);
      fetchStudents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Open Edit Modal
  const openEditModal = (st: any) => {
    setEditStudent(st);
    setFormData({
      registerNo: st.registerNo || "",
      rollNo: st.rollNo || "",
      admissionNo: st.admissionNo || "",
      fullName: st.fullName || "",
      gender: st.gender || "Male",
      dob: st.dob || "2004-06-15",
      bloodGroup: st.bloodGroup || "O+",
      email: st.email || "",
      phone: st.phone || "",
      aadharNo: st.aadharNo || "",
      fatherName: st.fatherName || "",
      motherName: st.motherName || "",
      guardianPhone: st.guardianPhone || "",
      emergencyPhone: st.emergencyPhone || "",
      addressLine1: st.addressLine1 || "",
      addressLine2: st.addressLine2 || "",
      city: st.city || "Chennai",
      state: st.state || "Tamil Nadu",
      pincode: st.pincode || "600001",
      departmentId: st.departmentId || "",
      batchId: st.batchId || "",
      sectionId: st.sectionId || "",
      academicYear: st.academicYear || "2025-2026",
      currentSemester: st.currentSemester || 1,
      entryType: st.entryType || "REGULAR",
      admissionQuota: st.admissionQuota || "GOVERNMENT",
      residenceType: st.residenceType || "DAY_SCHOLAR",
      admissionDate: st.admissionDate || new Date().toISOString().split("T")[0],
      academicStatus: st.academicStatus || "PURSUING",
    });
  };

  // Archive Student
  const handleArchiveStudent = async (studentId: string, reason?: string) => {
    try {
      const res = await fetch(`/api/students/${studentId}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "Administrative Soft Archival" }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message || data.error || "Archival failed");
      alert("Student profile moved to Archive!");
      setQuickViewStudent(null);
      fetchStudents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Restore Student
  const handleRestoreStudent = async (studentId: string) => {
    if (!confirm("Restore this student profile back to active status?")) return;
    try {
      const res = await fetch(`/api/students/${studentId}/restore`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message || data.error || "Restore failed");
      alert("Student profile successfully restored!");
      setQuickViewStudent(null);
      fetchStudents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Excel Upload Preview Request
  const handleExcelPreview = async (file: File) => {
    setImportLoading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/students/import-preview", {
        method: "POST",
        body: uploadData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");

      setPreviewData(data);
      // Select all valid row indices by default
      setSelectedRowIndices((data.validRows || []).map((r: any) => r.rowIndex));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setImportLoading(false);
    }
  };

  // Confirm Excel Bulk Import
  const handleConfirmImport = async () => {
    if (!previewData || selectedRowIndices.length === 0) return;
    const selectedRows = previewData.validRows.filter((r: any) =>
      selectedRowIndices.includes(r.rowIndex)
    );

    setImportLoading(true);
    try {
      const res = await fetch("/api/students/import-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedRows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      alert(data.message);
      setIsImportModalOpen(false);
      setPreviewData(null);
      setImportFile(null);
      fetchStudents();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setImportLoading(false);
    }
  };

  // Sort and Paginate
  const sortedStudents = [...students].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];
    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedStudents.length / itemsPerPage) || 1;
  const paginatedStudents = sortedStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Student Master Directory"
        subtitle="Institutional student lifecycle management, Excel bulk import wizard & 360° record inspection"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Controls Bar */}
        <div className="ui-card p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Register No, Roll No, Admission No, Name, Email..."
                className="ui-input w-full pl-9 pr-4 py-2 text-xs"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <a
                href="/api/students/import-template"
                download
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition flex items-center gap-1.5"
                title="Download Standard Student Master Excel Template"
              >
                <Download className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="hidden sm:inline">Excel Template</span>
              </a>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>Bulk Import Excel</span>
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Student</span>
              </button>

              <button
                onClick={() => setIsDeletePanelOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition flex items-center gap-1.5"
                title="Open Top-Level Delete Student Management Selector"
              >
                <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Delete Student</span>
              </button>

              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                  showArchived
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900 hover:bg-amber-100"
                }`}
              >
                <Archive className="w-4 h-4" />
                <span>{showArchived ? "Active Roster" : "Archived Students"}</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">

            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="ui-input px-2.5 py-1.5"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="ui-input px-2.5 py-1.5"
            >
              <option value="">All Academic Years</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
            </select>

            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="ui-input px-2.5 py-1.5"
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={String(s)}>
                  Sem {s}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="ui-input px-2.5 py-1.5"
            >
              <option value="">All Statuses</option>
              <option value="PURSUING">Pursuing</option>
              <option value="GRADUATED">Graduated</option>
              <option value="ALUMNI">Alumni</option>
            </select>

            <select
              value={selectedQuota}
              onChange={(e) => setSelectedQuota(e.target.value)}
              className="ui-input px-2.5 py-1.5 font-bold text-indigo-600 dark:text-indigo-400"
            >
              <option value="ALL">All Quotas</option>
              <option value="GQ">Government Quota (GQ)</option>
              <option value="MQ">Management Quota (MQ)</option>
            </select>

            <button
              onClick={() => {
                if (sortBy === "registerNo") setSortBy("fullName");
                else if (sortBy === "fullName") setSortBy("cgpa");
                else setSortBy("registerNo");
              }}
              className="ui-input px-2.5 py-1.5 flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold"
            >
              <span>Sort: {sortBy}</span>
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-2.5 py-1.5 rounded-lg font-semibold border transition text-center ${
                showArchived
                  ? "bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400"
                  : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              {showArchived ? "Viewing Archived" : "View Active"}
            </button>
          </div>
        </div>

        {/* Directory Table */}
        <div className="ui-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Register & Roll No</th>
                  <th className="p-4">Dept & Batch</th>
                  <th className="p-4">Quota & Residence</th>
                  <th className="p-4">CGPA</th>
                  <th className="p-4">Attendance</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="p-4">
                        <Skeleton className="h-10 rounded-lg" />
                      </td>
                    </tr>
                  ))
                ) : paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8">
                      <EmptyState
                        title="No students found"
                        description="Try clearing your filters or search keywords."
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {st.fullName[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-xs">
                              {st.fullName}
                            </div>
                            <div className="text-[11px] text-slate-400">{st.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                          {st.registerNo}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Roll: {st.rollNo} | Adm: {st.admissionNo}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {st.department?.code}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Batch {st.batch?.name} (Sem {st.currentSemester})
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="info">{st.admissionQuota}</Badge>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {st.residenceType}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {st.cgpa}
                      </td>
                      <td className="p-4 font-semibold text-sky-600 dark:text-sky-400">
                        {st.attendancePercentage}%
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            st.isArchived
                              ? "purple"
                              : st.academicStatus === "PURSUING"
                              ? "success"
                              : "warning"
                          }
                        >
                          {st.isArchived ? "10+ YR ARCHIVED" : st.academicStatus}
                        </Badge>
                      </td>
                      <td className="p-4 text-right space-x-1.5">
                        <button
                          onClick={() => setQuickViewStudent(st)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                          title="Quick Inspection Drawer"
                        >
                          <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </button>

                        <button
                          onClick={() => openEditModal(st)}
                          className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition"
                          title="Edit Student Record"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {st.isArchived ? (
                          <button
                            onClick={() => handleRestoreStudent(st.id)}
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
                            title="Restore Student Profile"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchiveStudent(st.id)}
                            className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition"
                            title="Soft Archive Student"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}

                        <Link
                          href={`/admin/students/${st.id}`}
                          className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition inline-flex"
                          title="Full 360° Profile View"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, sortedStudents.length)} of{" "}
              {sortedStudents.length} entries
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-900 dark:text-white px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick View Drawer */}
      {quickViewStudent && (
        <Drawer
          isOpen={Boolean(quickViewStudent)}
          onClose={() => setQuickViewStudent(null)}
          title={`Quick Inspection: ${quickViewStudent.fullName}`}
          subtitle={`Register: ${quickViewStudent.registerNo} | Roll: ${quickViewStudent.rollNo}`}
        >
          <div className="space-y-6 text-xs text-slate-800 dark:text-slate-200">
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex justify-between items-center">
              <div>
                <div className="text-base font-bold text-slate-900 dark:text-white">
                  {quickViewStudent.fullName}
                </div>
                <div className="text-slate-500 font-mono mt-0.5">
                  Dept: {quickViewStudent.department?.code} | Batch: {quickViewStudent.batch?.name}
                </div>
              </div>
              <Link
                href={`/admin/students/${quickViewStudent.id}`}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold flex items-center gap-1"
              >
                <span>Full 360° Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">CGPA</span>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{quickViewStudent.cgpa}</div>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Attendance</span>
                <div className="text-xl font-bold text-sky-600 dark:text-sky-400">{quickViewStudent.attendancePercentage}%</div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-900 dark:text-white uppercase text-[10px] block border-b pb-1">Personal Details</span>
              <div>Email: <strong>{quickViewStudent.email}</strong></div>
              <div>Phone: <strong>{quickViewStudent.phone}</strong></div>
              <div>Gender: <strong>{quickViewStudent.gender}</strong></div>
              <div>DOB: <strong>{quickViewStudent.dob}</strong></div>
              <div>Blood Group: <strong>{quickViewStudent.bloodGroup}</strong></div>
              <div>Aadhar: <strong>{quickViewStudent.aadharNo}</strong></div>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-900 dark:text-white uppercase text-[10px] block border-b pb-1">Family & Emergency</span>
              <div>Father: <strong>{quickViewStudent.fatherName}</strong></div>
              <div>Mother: <strong>{quickViewStudent.motherName}</strong></div>
              <div>Emergency: <strong>{quickViewStudent.emergencyPhone}</strong></div>
              <div>Address: <strong>{quickViewStudent.addressLine1}, {quickViewStudent.city}, {quickViewStudent.state}</strong></div>
            </div>
          </div>
        </Drawer>
      )}

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isAddModalOpen || Boolean(editStudent)}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditStudent(null);
        }}
        title={editStudent ? `Edit Student: ${editStudent.fullName}` : "Create Permanent Student Profile"}
        maxWidth="4xl"
      >
        <form onSubmit={editStudent ? handleEditSubmit : handleAddSubmit} className="space-y-4 text-xs">
          {/* Section 1: Permanent Identifiers */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-3">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">
              1. Permanent Institutional Identifiers
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Register No *</label>
                <input
                  type="text"
                  required
                  value={formData.registerNo}
                  onChange={(e) => setFormData({ ...formData, registerNo: e.target.value })}
                  className="ui-input w-full p-2 font-mono"
                  placeholder="7376221CS101"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Roll No *</label>
                <input
                  type="text"
                  required
                  value={formData.rollNo}
                  onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                  className="ui-input w-full p-2 font-mono"
                  placeholder="22CS101"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Admission No *</label>
                <input
                  type="text"
                  required
                  value={formData.admissionNo}
                  onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                  className="ui-input w-full p-2 font-mono"
                  placeholder="ADM2022CS01"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Personal Information */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-3">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">
              2. Personal Profile
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="ui-input w-full p-2"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Institutional Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="ui-input w-full p-2"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="ui-input w-full p-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <PasswordInput
                label={editStudent ? "New Password (Leave blank to keep existing)" : "Portal Login Password *"}
                value={formData.password || ""}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editStudent}
                autoComplete="new-password"
                placeholder={editStudent ? "Leave blank to keep existing password" : "Enter login password"}
              />
              <PasswordInput
                label={editStudent ? "Confirm New Password" : "Confirm Password *"}
                value={formData.confirmPassword || ""}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required={!editStudent && Boolean(formData.password)}
                autoComplete="new-password"
                placeholder="Confirm password"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="ui-input w-full p-2"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="ui-input w-full p-2"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Blood Group</label>
                <input
                  type="text"
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="ui-input w-full p-2"
                  placeholder="O+"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Aadhar Number</label>
                <input
                  type="text"
                  value={formData.aadharNo}
                  onChange={(e) => setFormData({ ...formData, aadharNo: e.target.value })}
                  className="ui-input w-full p-2"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Family & Emergency */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-3">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">
              3. Family & Contact Address
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Father&apos;s Name</label>
                <input
                  type="text"
                  value={formData.fatherName}
                  onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                  className="ui-input w-full p-2"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Mother&apos;s Name</label>
                <input
                  type="text"
                  value={formData.motherName}
                  onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                  className="ui-input w-full p-2"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Emergency Phone</label>
                <input
                  type="text"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  className="ui-input w-full p-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  className="ui-input w-full p-2"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">City & State</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="ui-input w-full p-2"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Institutional & Status */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-3">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">
              4. Institutional Academic Setup
            </span>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Department</label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="ui-input w-full p-2"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Batch</label>
                <select
                  value={formData.batchId}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                  className="ui-input w-full p-2"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Semester</label>
                <select
                  value={formData.currentSemester}
                  onChange={(e) => setFormData({ ...formData, currentSemester: parseInt(e.target.value, 10) })}
                  className="ui-input w-full p-2"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Academic Status</label>
                <select
                  value={formData.academicStatus}
                  onChange={(e) => setFormData({ ...formData, academicStatus: e.target.value })}
                  className="ui-input w-full p-2"
                >
                  <option value="PURSUING">Pursuing</option>
                  <option value="GRADUATED">Graduated</option>
                  <option value="ALUMNI">Alumni</option>
                  <option value="DISCONTINUED">Discontinued</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditStudent(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md"
            >
              {editStudent ? "Save Changes (Audit Tracked)" : "Save Master Profile"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Excel Bulk Import Wizard Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setPreviewData(null);
          setImportFile(null);
        }}
        title="Excel Bulk Import Wizard (Zero Auto-Import Verification)"
        maxWidth="4xl"
      >
        <div className="space-y-6 text-xs">
          {!previewData ? (
            /* Upload Step */
            <div className="space-y-4 text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
              <Upload className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Upload Institutional Excel Master File (.xlsx / .csv)
                </h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-md mx-auto">
                  Files are analyzed and validated first. Zero records will be stored in the database until you inspect the preview and confirm.
                </p>
              </div>

              <input
                type="file"
                accept=".xlsx, .csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setImportFile(e.target.files[0]);
                    handleExcelPreview(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="excel-upload-input"
              />
              <label
                htmlFor="excel-upload-input"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md inline-block cursor-pointer"
              >
                {importLoading ? "Parsing & Validating Excel..." : "Select Excel File"}
              </label>
            </div>
          ) : (
            /* Preview Step */
            <div className="space-y-4">
              {/* Summary Header */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Rows</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">{previewData.totalRows}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold block">Valid Rows</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{previewData.validRows?.length || 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800">
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-bold block">Invalid Rows</span>
                  <span className="text-lg font-black text-rose-600 dark:text-rose-400">{previewData.invalidRows?.length || 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold block">Duplicate Rows</span>
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400">{previewData.duplicateRows?.length || 0}</span>
                </div>
              </div>

              {/* Tabs for Rows */}
              <Tabs
                tabs={[
                  { id: "valid", label: "Valid Records", count: previewData.validRows?.length || 0 },
                  { id: "invalid", label: "Invalid Format", count: previewData.invalidRows?.length || 0 },
                  { id: "duplicates", label: "Duplicates Detected", count: previewData.duplicateRows?.length || 0 },
                ]}
                activeTab={importTab}
                onChange={setImportTab}
              />

              {/* Tab 1: Valid Rows Table */}
              {importTab === "valid" && (
                <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 border-b font-semibold text-slate-500">
                        <th className="p-2">Import</th>
                        <th className="p-2">Reg No</th>
                        <th className="p-2">Roll No</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Dept</th>
                        <th className="p-2">Batch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {previewData.validRows?.map((r: any) => (
                        <tr key={r.rowIndex}>
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={selectedRowIndices.includes(r.rowIndex)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedRowIndices([...selectedRowIndices, r.rowIndex]);
                                else setSelectedRowIndices(selectedRowIndices.filter((id) => id !== r.rowIndex));
                              }}
                            />
                          </td>
                          <td className="p-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">{r.registerNo}</td>
                          <td className="p-2 font-mono">{r.rollNo}</td>
                          <td className="p-2 font-semibold text-slate-900 dark:text-white">{r.fullName}</td>
                          <td className="p-2">{r.email}</td>
                          <td className="p-2">{r.departmentCode}</td>
                          <td className="p-2">{r.batchName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Invalid Rows Table */}
              {importTab === "invalid" && (
                <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 border-b font-semibold text-rose-500">
                        <th className="p-2">Row #</th>
                        <th className="p-2">Register No</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Validation Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {previewData.invalidRows?.map((r: any) => (
                        <tr key={r.rowIndex}>
                          <td className="p-2 font-mono">Row {r.rowIndex}</td>
                          <td className="p-2 font-mono">{r.registerNo || "N/A"}</td>
                          <td className="p-2">{r.fullName || "N/A"}</td>
                          <td className="p-2 font-semibold text-rose-600 dark:text-rose-400">{r.errors?.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Duplicates Table */}
              {importTab === "duplicates" && (
                <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 border-b font-semibold text-amber-500">
                        <th className="p-2">Row #</th>
                        <th className="p-2">Register No</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Duplicate Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {previewData.duplicateRows?.map((r: any) => (
                        <tr key={r.rowIndex}>
                          <td className="p-2 font-mono">Row {r.rowIndex}</td>
                          <td className="p-2 font-mono font-bold text-amber-600">{r.registerNo}</td>
                          <td className="p-2">{r.email}</td>
                          <td className="p-2 font-semibold text-amber-600">{r.duplicateReason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Confirm Import Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewData(null);
                    setImportFile(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel & Reset
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={selectedRowIndices.length === 0 || importLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold shadow-md flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {importLoading
                      ? "Saving Records..."
                      : `Confirm Import of ${selectedRowIndices.length} Selected Records`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Top-Level Delete Management Panel */}
      <DeleteManagementPanel
        isOpen={isDeletePanelOpen}
        onClose={() => setIsDeletePanelOpen(false)}
        title="Student Delete & Archive Management — Dedicated Selector"
        moduleName="Student"
        academicYears={["2025-2026", "2024-2025"]}
        reasons={["Duplicate Record", "Discontinued", "Transfer", "Wrong Entry", "Other"]}
        records={students.map((st) => ({
          id: st.id,
          name: st.fullName,
          identifier: st.registerNo,
          subtext: `Roll: ${st.rollNo || "N/A"} | Adm: ${st.admissionNo || "N/A"} | Quota: ${st.admissionQuota || "N/A"}`,
          academicYear: st.academicYear,
          batch: st.batch?.name,
          status: st.academicStatus || "PURSUING",
          badge: st.admissionQuota === "GQ" ? "Government Quota" : st.admissionQuota === "MQ" ? "Management Quota" : "Regular",
          isArchived: st.isArchived,
        }))}
        onConfirmArchive={async (studentId, reason, notes) => {
          await handleArchiveStudent(studentId, reason);
        }}
        onConfirmRestore={async (studentId) => {
          await handleRestoreStudent(studentId);
        }}
      />
    </div>
  );
}

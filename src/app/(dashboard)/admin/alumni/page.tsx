"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { DEFAULT_BATCH } from "@/lib/academicYearConstants";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteManagementPanel } from "@/components/ui/DeleteManagementPanel";
import {
  GraduationCap,
  Search,
  Plus,
  Users,
  Briefcase,
  Building,
  Trash2,
  Archive,
} from "lucide-react";

export default function AlumniDirectoryPage() {
  const [alumni, setAlumni] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [pursuingStudents, setPursuingStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [graduationYear, setGraduationYear] = useState("2029");
  const [currentCompany, setCurrentCompany] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [higherStudiesInst, setHigherStudiesInst] = useState("");

  const fetchAlumni = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (selectedBatchId) query.set("batchId", selectedBatchId);
      if (selectedYear) query.set("graduationYear", selectedYear);

      const res = await fetch(`/api/alumni?${query.toString()}`);
      const data = await res.json();
      setAlumni(data.data?.alumni || data.alumni || []);
    } catch (err) {
      console.error("Failed to fetch alumni", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [bRes, sRes] = await Promise.all([
        fetch("/api/batches"),
        fetch("/api/students/options"),
      ]);
      const bData = await bRes.json();
      const sData = await sRes.json();
      const batchList = bData.data?.batches || bData.batches || [];
      const studentList = sData.data?.students || sData.students || [];

      setBatches(batchList);
      setPursuingStudents(studentList);

      if (studentList.length > 0) {
        setSelectedStudentId(studentList[0].id);
      }
    } catch (err) {
      console.error("Failed to load metadata", err);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchAlumni();
  }, [search, selectedBatchId, selectedYear]);

  const handleAddAlumni = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || submitting) {
      alert("Please select a student to move to Alumni.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          graduationYear: parseInt(graduationYear, 10),
          currentCompany,
          currentRole,
          higherStudiesInst,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "Failed to convert student to alumni");
      }

      alert("Student successfully moved to Alumni directory while preserving master records!");
      setIsModalOpen(false);
      fetchAlumni();
      fetchMetadata();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Management State
  const [isDeletePanelOpen, setIsDeletePanelOpen] = useState<boolean>(false);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="Alumni Directory — AI & ML Department"
        subtitle="Grouped by 4-Year Batches (2025–2029, 2026–2030...), Graduation Records & Historical Dossiers"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Alumni</span>
            </button>

            <button
              onClick={() => setIsDeletePanelOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Delete Alumni</span>
            </button>

            <button
              onClick={() => (window.location.href = "/admin/archive")}
              className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Archive className="w-4 h-4" />
              <span>Archived Alumni</span>
            </button>
          </div>
        }
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Filters & Add Action */}
        <div className="ui-card p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Alumni Name, Register No, Email..."
                className="ui-input w-full pl-9 pr-4 py-2 text-xs"
              />
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Alumni / Convert Graduating Student</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="ui-input px-2.5 py-1.5"
            >
              <option value="">All 4-Year Batches (2025–2029, 2026–2030...)</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  Batch {b.name} (Graduation {b.expectedGraduationYear})
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="ui-input px-2.5 py-1.5"
            >
              <option value="">All Graduation Years</option>
              <option value="2029">Graduation Year 2029</option>
              <option value="2030">Graduation Year 2030</option>
              <option value="2031">Graduation Year 2031</option>
            </select>
          </div>
        </div>

        {/* Alumni Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))
          ) : alumni.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="No Alumni Found"
                description="No graduated students match your search or batch criteria. Click '+ Add Alumni' below to convert students to alumni."
                action={
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Alumni</span>
                  </button>
                }
              />
            </div>
          ) : (
            alumni.map((st) => (
              <div key={st.id} className="ui-card p-5 space-y-3 relative flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                        {st.fullName[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                          {st.fullName}
                        </h3>
                        <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                          {st.registerNo}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="purple">ALUMNI</Badge>
                      <button
                        onClick={async () => {
                          if (!confirm("Are you sure you want to permanently delete this record?\nThis action cannot be undone.")) return;
                          try {
                            const res = await fetch(`/api/alumni/${st.alumniRecord?.id || st.id}`, { method: "DELETE" });
                            const d = await res.json();
                            if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Delete failed");
                            alert("Alumni record permanently deleted.");
                            fetchAlumni();
                          } catch (err: any) {
                            alert(err.message);
                          }
                        }}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete Alumni Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>Batch: <strong className="text-slate-800 dark:text-slate-200">Batch {st.batch?.name || DEFAULT_BATCH}</strong></div>
                    <div>Graduation Year: <strong className="text-emerald-600 font-bold">{st.alumniRecord?.graduationYear || 2029}</strong></div>
                    <div>Company / Role: <strong className="text-indigo-600 dark:text-indigo-400">{st.alumniRecord?.currentCompany || "Placed"} ({st.alumniRecord?.currentRole || "AI Engineer"})</strong></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Convert Alumni Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Convert Student to Alumni" maxWidth="md">
        <form onSubmit={handleAddAlumni} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Pursuing Student *
            </label>
            <select
              required
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="ui-input w-full p-2"
            >
              <option value="">-- Choose Student --</option>
              {pursuingStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.registerNo} — {s.fullName} (Batch {s.batch?.name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Graduation Year *</label>
              <input
                type="number"
                required
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                className="ui-input w-full p-2 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
              <input
                type="text"
                value={currentCompany}
                onChange={(e) => setCurrentCompany(e.target.value)}
                placeholder="e.g. OpenAI / Google"
                className="ui-input w-full p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Job Role</label>
              <input
                type="text"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                placeholder="e.g. AI Engineer"
                className="ui-input w-full p-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Higher Studies Institution</label>
              <input
                type="text"
                value={higherStudiesInst}
                onChange={(e) => setHigherStudiesInst(e.target.value)}
                placeholder="e.g. IIT Madras / Carnegie Mellon"
                className="ui-input w-full p-2"
              />
            </div>
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 font-semibold">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-purple-600 text-white font-bold shadow-md">
              {submitting ? "Converting..." : "Confirm Alumni Status"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Top-Level Delete Management Panel */}
      <DeleteManagementPanel
        isOpen={isDeletePanelOpen}
        onClose={() => setIsDeletePanelOpen(false)}
        title="Alumni Delete & Archive Management — Dedicated Selector"
        moduleName="Alumni Record"
        reasons={["Status Corrected", "Duplicate Alumni Record", "Re-enrolled Student", "Wrong Entry", "Other"]}
        records={alumni.map((item) => ({
          id: item.id,
          name: `${item.studentProfile?.fullName || "Alumni"}`,
          identifier: item.studentProfile?.registerNo || item.id.slice(0, 8),
          subtext: `Grad Year: ${item.graduationYear || "N/A"} | Company: ${item.currentCompany || "N/A"} | Role: ${item.currentRole || "N/A"}`,
          batch: item.studentProfile?.batch?.name,
          status: "ALUMNI",
          badge: `Class of ${item.graduationYear || "2029"}`,
          isArchived: item.isArchived,
          warningMsg: "Archiving an alumni record soft-deletes only the AlumniRecord dossier while keeping the student's original master profile & history safe.",
        }))}
        onConfirmDelete={async (recordId) => {
          const res = await fetch(`/api/alumni/${recordId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Delete failed");
          fetchAlumni();
        }}
        onConfirmArchive={async (recordId, reason) => {
          const res = await fetch(`/api/alumni/${recordId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "archive", reason }),
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Archive failed");
          fetchAlumni();
        }}
        onConfirmRestore={async (recordId) => {
          const res = await fetch(`/api/alumni/${recordId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "restore" }),
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Restore failed");
          fetchAlumni();
        }}
      />
    </div>
  );
}

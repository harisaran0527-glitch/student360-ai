"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { ACADEMIC_YEAR_OPTIONS, DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { getAcademicOptions } from "@/lib/clientOptionsCache";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { DeleteManagementPanel } from "@/components/ui/DeleteManagementPanel";
import { Briefcase, Plus, DollarSign, Building, Trash2, Archive } from "lucide-react";

export default function AdminPlacementPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(DEFAULT_ACADEMIC_YEAR);

  const [placements, setPlacements] = useState<any[]>([]);
  const [yearStudents, setYearStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("AI / Software Engineer");
  const [packageLpa, setPackageLpa] = useState(8.5);
  const [status, setStatus] = useState("SELECTED");
  const [offerDate, setOfferDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [placeRes, studRes] = await Promise.all([
        fetch(`/api/placement?academicYear=${selectedAcademicYear}`),
        fetch(`/api/students/options?academicYear=${selectedAcademicYear}`),
      ]);
      const pData = await placeRes.json();
      const sData = await studRes.json();
      const recordsList = pData.data?.records || pData.records || [];
      const studentsList = sData.data?.students || sData.students || [];

      setPlacements(recordsList);
      setYearStudents(studentsList);

      if (studentsList.length > 0) {
        setSelectedStudentId(studentsList[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAcademicOptions()
      .then((opts) => {
        const years = opts.academicYears || [];
        setAcademicYears(years);
        const saved = typeof window !== "undefined" ? localStorage.getItem("selected_academic_year") : null;
        if (saved && years.some((y: any) => y.yearCode === saved)) {
          setSelectedAcademicYear(saved);
        } else if (opts.currentYearCode && years.some((y: any) => y.yearCode === opts.currentYearCode)) {
          setSelectedAcademicYear(opts.currentYearCode);
        } else if (years.length > 0) {
          setSelectedAcademicYear(years[0].yearCode);
        }
      })
      .catch((err) => console.error(err));

    const handleAYChange = (e: any) => {
      if (e.detail?.academicYear) setSelectedAcademicYear(e.detail.academicYear);
    };
    window.addEventListener("academicYearChanged", handleAYChange);
    return () => window.removeEventListener("academicYearChanged", handleAYChange);
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedAcademicYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || submitting) {
      alert("Please select a student belonging to Academic Year " + selectedAcademicYear);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          companyName,
          jobTitle,
          packageLpa: Number(packageLpa),
          offerDate,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "Failed to record placement offer");
      }

      alert("Placement record added successfully!");
      setIsModalOpen(false);
      setCompanyName("");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const avgLpa =
    placements.length > 0
      ? (placements.reduce((acc, p) => acc + (p.packageLpa || 0), 0) / placements.length).toFixed(2)
      : "0.00";

  // Delete Management State
  const [isDeletePanelOpen, setIsDeletePanelOpen] = useState<boolean>(false);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="Placement Portal — AI & ML Department"
        subtitle={`Academic Year: ${selectedAcademicYear} Context | Showing Placement Offers & Pipeline Records`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Placement</span>
            </button>

            <button
              onClick={() => setIsDeletePanelOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Delete Placement</span>
            </button>

            <button
              onClick={() => (window.location.href = "/admin/archive")}
              className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Archive className="w-4 h-4" />
              <span>Archived Placements</span>
            </button>
          </div>
        }
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Academic Year Selector Bar */}
        <div className="ui-card p-4 rounded-2xl bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-slate-500">Selected Academic Year:</span>
            <select
              value={selectedAcademicYear}
              onChange={(e) => {
                setSelectedAcademicYear(e.target.value);
                localStorage.setItem("selected_academic_year", e.target.value);
              }}
              className="ui-input py-1.5 px-3 font-bold text-indigo-600"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.yearCode}>
                  Academic Year {ay.yearCode} {ay.isCurrent ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Placement</span>
          </button>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StatCard title="Total Year Offers" value={placements.length} icon={Briefcase} color="emerald" />
          <StatCard title="Average Package" value={`₹${avgLpa} LPA`} icon={DollarSign} color="indigo" />
          <StatCard title="Department Scope" value="AI & ML" icon={Building} color="sky" />
        </div>

        {/* Placements Directory Table */}
        <div className="ui-card rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <span>Placement Records — AY {selectedAcademicYear} ({placements.length} Records)</span>
            </h3>
            <Badge variant="purple">Year-Wise Context</Badge>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ) : placements.length === 0 ? (
            <EmptyState
              title={`No Placement Offers Recorded for Academic Year ${selectedAcademicYear}`}
              description="Click '+ Add Placement' below to add job offers or pipeline records for students in this academic year."
              action={
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Placement</span>
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3.5">Register No</th>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Company Name</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Package (LPA)</th>
                    <th className="p-3.5">Offer Date</th>
                    <th className="p-3.5">Placement Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {placements.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {p.student?.registerNo || "N/A"}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {p.student?.fullName || "N/A"}
                      </td>
                      <td className="p-3.5 font-bold">{p.companyName}</td>
                      <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200">
                        {p.jobTitle}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{p.packageLpa} LPA
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">{p.offerDate}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <Badge variant={p.status === "SELECTED" || p.status === "JOINED" ? "success" : "info"}>
                            {p.status}
                          </Badge>
                          <button
                            onClick={async () => {
                              if (!confirm("Are you sure you want to permanently delete this record?\nThis action cannot be undone.")) return;
                              try {
                                const res = await fetch(`/api/placement/records/${p.id}`, { method: "DELETE" });
                                const d = await res.json();
                                if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Delete failed");
                                alert("Placement record permanently deleted.");
                                fetchData();
                              } catch (err: any) {
                                alert(err.message);
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Delete Placement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Placement Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Add Placement Offer — AY ${selectedAcademicYear}`} maxWidth="md">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Student (Academic Year {selectedAcademicYear} ONLY) *
            </label>
            <select
              required
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="ui-input w-full p-2"
            >
              <option value="">-- Choose Student --</option>
              {yearStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.registerNo} — {s.fullName} ({s.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. OpenAI / TCS / Microsoft"
                className="ui-input w-full p-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Job Designation *</label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. AI Research Engineer"
                className="ui-input w-full p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Package (LPA) *</label>
              <input
                type="number"
                step="0.1"
                required
                value={packageLpa}
                onChange={(e) => setPackageLpa(Number(e.target.value))}
                className="ui-input w-full p-2 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Placement Status *</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="ui-input w-full p-2 font-bold text-indigo-600">
                <option value="Eligible">Eligible</option>
                <option value="Applied">Applied</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Aptitude">Aptitude</option>
                <option value="Technical Round">Technical Round</option>
                <option value="HR Round">HR Round</option>
                <option value="SELECTED">Selected</option>
                <option value="OFFER_RECEIVED">Offer Received</option>
                <option value="JOINED">Joined</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Offer Date *</label>
            <input
              type="date"
              required
              value={offerDate}
              onChange={(e) => setOfferDate(e.target.value)}
              className="ui-input w-full p-2"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 font-semibold">
              Cancel
            </button>
            <button type="submit" disabled={submitting || yearStudents.length === 0} className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-md">
              {submitting ? "Saving..." : "Save Placement Offer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Top-Level Delete Management Panel */}
      <DeleteManagementPanel
        isOpen={isDeletePanelOpen}
        onClose={() => setIsDeletePanelOpen(false)}
        title="Placement Delete & Archive Management — Dedicated Selector"
        moduleName="Placement Record"
        academicYears={[...ACADEMIC_YEAR_OPTIONS]}
        reasons={["Offer Rescinded", "Duplicate Entry", "Candidate Declined", "Wrong Company Assignment", "Other"]}
        records={placements.map((item) => {
          const isHighStatus = item.status === "SELECTED" || item.status === "OFFER_RECEIVED" || item.status === "JOINED";
          return {
            id: item.id,
            name: `${item.studentProfile?.fullName || "Student"} — ${item.companyName}`,
            identifier: item.studentProfile?.registerNo || item.id.slice(0, 8),
            subtext: `Role: ${item.jobTitle || "Engineer"} | Package: ${item.packageLpa || 0} LPA | Status: ${item.status}`,
            academicYear: item.academicYearCode || selectedAcademicYear,
            status: item.status,
            badge: `${item.packageLpa || 0} LPA`,
            isArchived: item.isArchived,
            warningMsg: isHighStatus
              ? `STRONG WARNING: This placement record is marked as '${item.status}'. Archiving this offer will adjust batch placement statistics across Central Reports.`
              : undefined,
          };
        })}
        onConfirmDelete={async (recordId) => {
          const res = await fetch(`/api/placement/records/${recordId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Delete failed");
          fetchData();
        }}
        onConfirmArchive={async (recordId, reason) => {
          const res = await fetch(`/api/placement/records/${recordId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "archive", reason }),
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Archive failed");
          fetchData();
        }}
        onConfirmRestore={async (recordId) => {
          const res = await fetch(`/api/placement/records/${recordId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "restore" }),
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Restore failed");
          fetchData();
        }}
      />
    </div>
  );
}

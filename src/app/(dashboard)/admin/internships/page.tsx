"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteManagementPanel } from "@/components/ui/DeleteManagementPanel";
import {
  Briefcase,
  Plus,
  Building2,
  Calendar,
  MapPin,
  ExternalLink,
  Sparkles,
  Trash2,
  Archive,
} from "lucide-react";

export default function AdminInternshipsPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("2025-2029");

  const [internships, setInternships] = useState<any[]>([]);
  const [yearStudents, setYearStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form fields
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [domain, setDomain] = useState<string>("Artificial Intelligence / ML");
  const [role, setRole] = useState<string>("AI / ML Intern");
  const [mode, setMode] = useState<string>("ONLINE");
  const [location, setLocation] = useState<string>("Chennai / Remote");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [status, setStatus] = useState<string>("COMPLETED");

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch internships for selected academic year
      const intRes = await fetch(`/api/internships?academicYear=${selectedAcademicYear}`);
      const intData = await intRes.json();
      setInternships(intData.data?.internships || intData.internships || []);

      // 2. Fetch students options ONLY for selected academic year using lightweight endpoint
      const studRes = await fetch(`/api/students/options?academicYear=${selectedAcademicYear}`);
      const studData = await studRes.json();
      setYearStudents(studData.data?.students || studData.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/academic-years", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const years = data.data?.academicYears || data.academicYears || [];
        setAcademicYears(years);
        const saved = typeof window !== "undefined" ? localStorage.getItem("selected_academic_year") : null;
        if (saved && years.some((y: any) => y.yearCode === saved)) {
          setSelectedAcademicYear(saved);
        } else if (data.currentYearCode && years.some((y: any) => y.yearCode === data.currentYearCode)) {
          setSelectedAcademicYear(data.currentYearCode);
        } else if (years.length > 0) {
          setSelectedAcademicYear(years[0].yearCode);
        }
      })
      .catch((e) => console.error(e));

    const handleAYChange = (e: any) => {
      if (e.detail?.academicYear) setSelectedAcademicYear(e.detail.academicYear);
    };
    window.addEventListener("academicYearChanged", handleAYChange);
    return () => window.removeEventListener("academicYearChanged", handleAYChange);
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedAcademicYear]);

  const handleAddInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || submitting) {
      alert("Please select a student belonging to Academic Year " + selectedAcademicYear);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/internships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          academicYearCode: selectedAcademicYear,
          companyName,
          domain,
          role,
          mode,
          location,
          startDate: startDate || new Date().toISOString().split("T")[0],
          endDate: endDate || new Date().toISOString().split("T")[0],
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "Failed to add internship");
      }

      alert("Internship record added successfully!");
      setModalOpen(false);
      setCompanyName("");
      fetchData();
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
        title="Internship Directory — AI & ML Department"
        subtitle={`Academic Year: ${selectedAcademicYear} Context | Showing Year-wise Internship Submissions`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Internship</span>
            </button>

            <button
              onClick={() => setIsDeletePanelOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Delete Internship</span>
            </button>

            <button
              onClick={() => (window.location.href = "/admin/archive")}
              className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Archive className="w-4 h-4" />
              <span>Archived Internships</span>
            </button>
          </div>
        }
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Academic Year Selector & Action Bar */}
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
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Internship</span>
          </button>
        </div>

        {/* Internships Table */}
        <div className="ui-card rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <span>Internships for Academic Year {selectedAcademicYear} ({internships.length} Records)</span>
            </h3>
            <Badge variant="info">Year-Wise Isolation</Badge>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ) : internships.length === 0 ? (
            <EmptyState
              title={`No Internship Records for Academic Year ${selectedAcademicYear}`}
              description="Click '+ Add Internship' below to record internship details for students in this academic year."
              action={
                <button
                  onClick={() => setModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Internship</span>
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
                    <th className="p-3.5">Company</th>
                    <th className="p-3.5">Role & Domain</th>
                    <th className="p-3.5">Mode / Location</th>
                    <th className="p-3.5">Dates</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {internships.map((int) => (
                    <tr key={int.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {int.student?.registerNo || "N/A"}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {int.student?.fullName || "N/A"}
                      </td>
                      <td className="p-3.5 font-bold">{int.companyName}</td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{int.role}</div>
                        <div className="text-[11px] text-slate-500">{int.domain}</div>
                      </td>
                      <td className="p-3.5 font-medium">
                        <Badge variant="purple">{int.mode}</Badge>
                        {int.location && <div className="text-[10px] text-slate-400">{int.location}</div>}
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {int.startDate} to {int.endDate}
                      </td>
                      <td className="p-3.5">
                        <Badge variant={int.status === "COMPLETED" ? "success" : "info"}>
                          {int.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Internship Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Add Internship — AY ${selectedAcademicYear}`} maxWidth="lg">
        <form onSubmit={handleAddInternship} className="space-y-4 text-xs">
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
              {yearStudents.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.registerNo} — {st.fullName} ({st.email})
                </option>
              ))}
            </select>
            {yearStudents.length === 0 && (
              <p className="text-[11px] text-rose-500 mt-1">
                No students enrolled under Academic Year {selectedAcademicYear}. Add students first in Batches & Progression page.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. OpenAI / Google / Microsoft"
                className="ui-input w-full p-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Internship Role *</label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Machine Learning Engineer Intern"
                className="ui-input w-full p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Domain</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="ui-input w-full p-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} className="ui-input w-full p-2">
                <option value="ONLINE">ONLINE</option>
                <option value="OFFLINE">OFFLINE</option>
                <option value="HYBRID">HYBRID</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="ui-input w-full p-2">
                <option value="COMPLETED">COMPLETED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="SUBMITTED_FOR_APPROVAL">SUBMITTED_FOR_APPROVAL</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="ui-input w-full p-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">End Date *</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="ui-input w-full p-2"
              />
            </div>
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || yearStudents.length === 0}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-md"
            >
              {submitting ? "Saving..." : "Save Internship Record"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Top-Level Delete Management Panel */}
      <DeleteManagementPanel
        isOpen={isDeletePanelOpen}
        onClose={() => setIsDeletePanelOpen(false)}
        title="Internship Delete & Archive Management — Dedicated Selector"
        moduleName="Internship"
        academicYears={["2025-2029", "2026-2030", "2027-2031"]}
        reasons={["Offer Cancelled", "Duplicate Submission", "Student Opted Out", "Wrong Dates Entry", "Other"]}
        records={internships.map((item) => ({
          id: item.id,
          name: `${item.studentProfile?.fullName || "Student"} — ${item.companyName}`,
          identifier: item.studentProfile?.registerNo || item.id.slice(0, 8),
          subtext: `Role: ${item.role || "Intern"} | Start: ${item.startDate || "N/A"} | End: ${item.endDate || "N/A"}`,
          academicYear: item.academicYearCode || selectedAcademicYear,
          status: item.verificationStatus || item.status || "COMPLETED",
          badge: item.verificationStatus === "APPROVED" ? "Verified" : "Pending",
          isArchived: item.isArchived,
          warningMsg: item.verificationStatus === "APPROVED" ? "This internship record has been VERIFIED. Archiving will hide it from the active roster while preserving proof documents." : undefined,
        }))}
        onConfirmArchive={async (internshipId, reason) => {
          const res = await fetch(`/api/internships/${internshipId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "archive", reason }),
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Archive failed");
          fetchData();
        }}
        onConfirmRestore={async (internshipId) => {
          const res = await fetch(`/api/internships/${internshipId}`, {
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

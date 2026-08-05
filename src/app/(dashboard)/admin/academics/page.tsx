"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteManagementPanel } from "@/components/ui/DeleteManagementPanel";
import {
  GraduationCap,
  BookOpen,
  Plus,
  FileText,
  Trash2,
  Upload,
  Archive,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";

export default function AdminSyllabusPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("2025-2026");
  const [selectedSemester, setSelectedSemester] = useState<string>("");

  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [isDeletePanelOpen, setIsDeletePanelOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form Fields
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [semester, setSemester] = useState("1");
  const [credits, setCredits] = useState("3");
  const [subjectType, setSubjectType] = useState("CORE");
  const [syllabusTitle, setSyllabusTitle] = useState("");
  const [syllabusUrl, setSyllabusUrl] = useState("");
  const [notes, setNotes] = useState("");

  const fetchSyllabus = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAcademicYear) params.append("academicYear", selectedAcademicYear);
      if (selectedSemester) params.append("semester", selectedSemester);

      const res = await fetch(`/api/academics/syllabus?${params.toString()}`);
      const data = await res.json();
      setCourses(data.data?.courses || data.courses || []);
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
    fetchSyllabus();
  }, [selectedAcademicYear, selectedSemester]);

  const handleAddSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/academics/syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          title,
          semester: parseInt(semester, 10),
          credits: parseInt(credits, 10),
          subjectType,
          academicYearCode: selectedAcademicYear,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "Failed to add syllabus record");
      }

      alert("Semester subject & syllabus record added successfully!");
      setModalOpen(false);
      setCode("");
      setTitle("");
      setSyllabusTitle("");
      setSyllabusUrl("");
      setNotes("");
      fetchSyllabus();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this syllabus record?")) return;
    try {
      const res = await fetch(`/api/academics/syllabus?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove syllabus record");
      fetchSyllabus();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="Semester Subjects & Syllabus Upload"
        subtitle={`Department: AI & ML | Academic Year: ${selectedAcademicYear}`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Subject</span>
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>+ Upload Syllabus</span>
            </button>
          </div>
        }
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Filter & Action Toolbar */}
        <div className="ui-card p-4 rounded-2xl bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Academic Year</label>
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
                    {ay.yearCode} {ay.isCurrent ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Filter Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="ui-input py-1.5 px-3"
              >
                <option value="">All Semesters (1 to 8)</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mandatory Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Subject</span>
            </button>

            <button
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Upload Syllabus</span>
            </button>

            <button
              onClick={() => setIsDeletePanelOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Delete Subject</span>
            </button>

            <button
              onClick={() => (window.location.href = "/admin/archive")}
              className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Archive className="w-4 h-4" />
              <span>Archived Subjects</span>
            </button>
          </div>
        </div>

        {/* Subjects & Syllabus Grid */}
        <div className="ui-card rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Syllabus Repository — Department of AI & ML ({courses.length} Records)</span>
            </h3>
            <Badge variant="info">Fixed Scope: AI & ML</Badge>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ) : courses.length === 0 ? (
            <EmptyState
              title={`No Syllabus Records for Academic Year ${selectedAcademicYear}`}
              description="Click '+ Add Subject' or '+ Upload Syllabus' to add curriculum records for AI & ML."
              action={
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Subject</span>
                  </button>
                  <button
                    onClick={() => setModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span>+ Upload Syllabus</span>
                  </button>
                </div>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3.5">Semester</th>
                    <th className="p-3.5">Subject Code</th>
                    <th className="p-3.5">Subject Name</th>
                    <th className="p-3.5">Credits</th>
                    <th className="p-3.5">Subject Type</th>
                    <th className="p-3.5">Academic Year</th>
                    <th className="p-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {courses.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold">Semester {c.semester}</td>
                      <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {c.code}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {c.title}
                      </td>
                      <td className="p-3.5 font-medium">{c.credits} Credits</td>
                      <td className="p-3.5">
                        <Badge variant="purple">{c.subjectType}</Badge>
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">{c.academicYearCode}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={async () => {
                              if (!confirm(`Are you sure you want to archive subject '${c.title}'?`)) return;
                              try {
                                const res = await fetch(`/api/courses/${c.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "archive", reason: "Admin Archive" }),
                                });
                                const data = await res.json();
                                if (!res.ok || data.success === false) {
                                  throw new Error(data.message || data.error || "Archive failed");
                                }
                                alert("Subject archived successfully.");
                                fetchSyllabus();
                              } catch (err: any) {
                                alert(err.message);
                              }
                            }}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition flex items-center gap-1 text-[11px] font-bold"
                            title="Archive Subject"
                          >
                            <Archive className="w-3.5 h-3.5" /> Archive
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

      {/* Add Subject / Upload Syllabus Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Semester Subject & Upload Syllabus" maxWidth="lg">
        <form onSubmit={handleAddSyllabus} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subject Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. AI3501"
                className="ui-input w-full p-2 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subject Name *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Machine Learning Algorithms"
                className="ui-input w-full p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Semester *</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
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
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Credits</label>
              <select
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                className="ui-input w-full p-2"
              >
                {[1, 2, 3, 4, 6].map((cr) => (
                  <option key={cr} value={cr}>
                    {cr} Credits
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select
                value={subjectType}
                onChange={(e) => setSubjectType(e.target.value)}
                className="ui-input w-full p-2"
              >
                <option value="CORE">CORE</option>
                <option value="ELECTIVE">ELECTIVE</option>
                <option value="LAB">LAB</option>
                <option value="PROJECT">PROJECT</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
            <span className="font-bold block text-slate-800 dark:text-slate-200">Department Assignment:</span>
            Department is automatically set to <strong>AI & ML</strong>. Academic Year: <strong>{selectedAcademicYear}</strong>.
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20"
            >
              {submitting ? "Saving..." : "Save Subject Record"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Top-Level Delete Management Panel */}
      <DeleteManagementPanel
        isOpen={isDeletePanelOpen}
        onClose={() => setIsDeletePanelOpen(false)}
        title="Semester Subject Delete & Archive Management — Dedicated Selector"
        moduleName="Subject"
        academicYears={["2025-2026", "2024-2025"]}
        reasons={["Curriculum Revised", "Subject Deprecated", "Duplicate Code", "Wrong Semester", "Other"]}
        records={courses.map((c) => ({
          id: c.id,
          name: c.title,
          identifier: c.code,
          subtext: `Semester ${c.semester} | Credits: ${c.credits} | Type: ${c.subjectType}`,
          academicYear: c.academicYearCode,
          status: c.isActive ? "ACTIVE" : "INACTIVE",
          badge: `Sem ${c.semester}`,
          isArchived: c.isArchived,
          warningMsg: "If attendance records are linked to this subject, permanent delete is blocked and only Archive Subject is permitted.",
        }))}
        onConfirmArchive={async (courseId, reason) => {
          const res = await fetch(`/api/courses/${courseId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "archive", reason }),
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Archive failed");
          fetchSyllabus();
        }}
        onConfirmRestore={async (courseId) => {
          const res = await fetch(`/api/courses/${courseId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "restore" }),
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Restore failed");
          fetchSyllabus();
        }}
      />
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { ACADEMIC_YEAR_OPTIONS, DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { getAcademicOptions } from "@/lib/clientOptionsCache";
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
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(DEFAULT_ACADEMIC_YEAR);
  const [selectedSemester, setSelectedSemester] = useState<string>("");

  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Timetable State
  const [timetable, setTimetable] = useState<any | null>(null);
  const [timetableLoading, setTimetableLoading] = useState<boolean>(false);

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

  const fetchTimetable = async () => {
    if (!selectedAcademicYear || !selectedSemester) {
      setTimetable(null);
      return;
    }
    setTimetableLoading(true);
    try {
      const res = await fetch(`/api/academics/timetable?academicYear=${selectedAcademicYear}&semester=${selectedSemester}`);
      const data = await res.json();
      setTimetable(data.data?.timetable || data.timetable || null);
    } catch (err) {
      console.error(err);
    } finally {
      setTimetableLoading(false);
    }
  };

  const handleTimetableUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAcademicYear || !selectedSemester) return;

    const formData = new FormData();
    formData.append("file", file);

    setTimetableLoading(true);
    try {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

      const res = await fetch("/api/academics/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearCode: selectedAcademicYear,
          semester: parseInt(selectedSemester, 10),
          documentUrl: uploadData.url,
          fileName: file.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to save timetable");

      alert("Timetable uploaded successfully!");
      fetchTimetable();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTimetableLoading(false);
    }
  };

  const handleTimetableDelete = async () => {
    if (!timetable || !confirm("Are you sure you want to delete this timetable?")) return;
    setTimetableLoading(true);
    try {
      const res = await fetch(`/api/academics/timetable?id=${timetable.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete timetable");
      alert("Timetable deleted successfully!");
      setTimetable(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTimetableLoading(false);
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
      .catch((e) => console.error(e));

    const handleAYChange = (e: any) => {
      if (e.detail?.academicYear) setSelectedAcademicYear(e.detail.academicYear);
    };
    window.addEventListener("academicYearChanged", handleAYChange);
    return () => window.removeEventListener("academicYearChanged", handleAYChange);
  }, []);

  useEffect(() => {
    fetchSyllabus();
    fetchTimetable();
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
          syllabusUrl: syllabusUrl || null,
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
    if (!confirm("Are you sure you want to permanently delete this record?\nThis action cannot be undone.")) return;
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
              <span>Add Subject</span>
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Upload Syllabus</span>
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
              <span>Add Subject</span>
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

        {/* Class Timetable Card */}
        {selectedSemester ? (
          <div className="ui-card p-6 bg-gradient-to-r from-indigo-50/50 dark:from-indigo-950/20 to-slate-50 dark:to-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Class Timetable — Semester {selectedSemester} ({selectedAcademicYear})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload the primary schedule / class timetable PDF or image for this specific semester.
                </p>
              </div>

              {timetableLoading ? (
                <div className="text-xs font-semibold text-slate-500 animate-pulse">Processing...</div>
              ) : timetable ? (
                <div className="flex items-center gap-2">
                  <a
                    href={timetable.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Class Timetable</span>
                  </a>
                  <button
                    onClick={handleTimetableDelete}
                    className="p-1.5 rounded-lg border border-rose-300 hover:bg-rose-50 text-rose-600 dark:border-rose-900 dark:hover:bg-rose-950/30 transition"
                    title="Delete Timetable"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Class Timetable</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={handleTimetableUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
            {timetable && (
              <p className="text-[11px] text-slate-500">
                Current timetable: <span className="font-mono text-indigo-600 dark:text-indigo-400">{timetable.fileName || "timetable_document.pdf"}</span> (Uploaded {new Date(timetable.updatedAt).toLocaleDateString()})
              </p>
            )}
          </div>
        ) : (
          <div className="ui-card p-4 bg-slate-50 dark:bg-slate-900/50 text-center text-xs text-slate-500">
            Select a specific semester in the filter above to view and manage the Class Timetable.
          </div>
        )}

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
                    <span>Add Subject</span>
                  </button>
                  <button
                    onClick={() => setModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span>Upload Syllabus</span>
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
                    <th className="p-3.5">Syllabus</th>
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
                        {c.syllabusUrl ? (
                          <a
                            href={c.syllabusUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-100 transition flex items-center gap-1 w-fit"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Syllabus</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No document</span>
                        )}
                      </td>
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

                          <button
                            onClick={async () => {
                              if (!confirm("Are you sure you want to permanently delete this record?\nThis action cannot be undone.")) return;
                              try {
                                const res = await fetch(`/api/courses/${c.id}`, {
                                  method: "DELETE",
                                  headers: { "Content-Type": "application/json" },
                                });
                                const data = await res.json();
                                if (!res.ok || data.success === false) {
                                  throw new Error(data.message || data.error || "Delete failed");
                                }
                                alert("Subject permanently deleted.");
                                fetchSyllabus();
                              } catch (err: any) {
                                alert(err.message);
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1 text-[11px] font-bold"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
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

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Syllabus PDF / Document (Optional)</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  const formData = new FormData();
                  formData.append("file", file);
                  
                  try {
                    setSubmitting(true);
                    const res = await fetch("/api/upload", {
                      method: "POST",
                      body: formData,
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Upload failed");
                    setSyllabusUrl(data.url);
                    setSyllabusTitle(file.name);
                    alert("Syllabus uploaded successfully!");
                  } catch (err: any) {
                    alert(err.message);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="ui-input w-full p-1.5"
              />
              {syllabusUrl && (
                <a
                  href={syllabusUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 font-bold shrink-0 text-[11px]"
                >
                  View
                </a>
              )}
            </div>
            {syllabusTitle && <p className="text-[11px] text-slate-500 mt-1">Uploaded: {syllabusTitle}</p>}
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
        academicYears={[...ACADEMIC_YEAR_OPTIONS]}
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
        onConfirmDelete={async (courseId) => {
          const res = await fetch(`/api/courses/${courseId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Delete failed");
          fetchSyllabus();
        }}
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

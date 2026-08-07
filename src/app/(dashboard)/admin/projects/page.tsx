"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteManagementPanel } from "@/components/ui/DeleteManagementPanel";
import {
  FolderGit2,
  Plus,
  Github,
  ExternalLink,
  Camera,
  Code2,
  Cpu,
  Trash2,
  Archive,
} from "lucide-react";

export default function AdminProjectsPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("2025-2029");

  const [projects, setProjects] = useState<any[]>([]);
  const [yearStudents, setYearStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form Fields
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [projectType, setProjectType] = useState<"SOFTWARE" | "HARDWARE">("SOFTWARE");
  const [completionStatus, setCompletionStatus] = useState<string>("COMPLETED");
  const [completionDate, setCompletionDate] = useState<string>("");
  const [techStack, setTechStack] = useState<string>("Python, PyTorch, Next.js");

  // Conditional Fields
  const [liveUrl, setLiveUrl] = useState<string>("");
  const [githubUrl, setGithubUrl] = useState<string>("");
  const [screenshots, setScreenshots] = useState<string>("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const projRes = await fetch(`/api/projects?academicYear=${selectedAcademicYear}`);
      const projData = await projRes.json();
      setProjects(projData.data?.projects || projData.projects || []);

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

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || submitting) {
      alert("Please select a student belonging to Academic Year " + selectedAcademicYear);
      return;
    }

    if (projectType === "SOFTWARE" && !liveUrl && !githubUrl) {
      alert("Software / Live Project Link or GitHub URL is required for SOFTWARE projects.");
      return;
    }

    if (projectType === "HARDWARE" && !screenshots) {
      alert("Hardware Project Photo Upload URL is required for HARDWARE projects.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          academicYearCode: selectedAcademicYear,
          title,
          description,
          projectType,
          techStack: techStack || (projectType === "SOFTWARE" ? "Software Stack" : "Embedded / Hardware"),
          liveUrl: projectType === "SOFTWARE" ? liveUrl : undefined,
          githubUrl: projectType === "SOFTWARE" ? githubUrl : undefined,
          screenshots: projectType === "HARDWARE" ? screenshots : undefined,
          completionDate: completionDate || new Date().toISOString().split("T")[0],
          status: completionStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "Failed to add project");
      }

      alert("Project record added successfully!");
      setModalOpen(false);
      setTitle("");
      setDescription("");
      setLiveUrl("");
      setGithubUrl("");
      setScreenshots("");
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
        title="Projects Showcase — AI & ML Department"
        subtitle={`Academic Year: ${selectedAcademicYear} Context | Showing Year-Wise Software & Hardware Projects`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Project</span>
            </button>

            <button
              onClick={() => setIsDeletePanelOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Delete Project</span>
            </button>

            <button
              onClick={() => (window.location.href = "/admin/archive")}
              className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Archive className="w-4 h-4" />
              <span>Archived Projects</span>
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
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Project</span>
          </button>
        </div>

        {/* Projects Table */}
        <div className="ui-card rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-indigo-600" />
              <span>Projects for Academic Year {selectedAcademicYear} ({projects.length} Records)</span>
            </h3>
            <Badge variant="purple">Year-Wise Context</Badge>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              title={`No Projects Recorded for Academic Year ${selectedAcademicYear}`}
              description="Click '+ Add Project' below to register software or hardware projects for students in this academic year."
              action={
                <button
                  onClick={() => setModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Project</span>
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
                    <th className="p-3.5">Project Title</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Tech Stack / Details</th>
                    <th className="p-3.5">Completion Date</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {projects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {proj.student?.registerNo || "N/A"}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {proj.student?.fullName || "N/A"}
                      </td>
                      <td className="p-3.5 font-bold">{proj.title}</td>
                      <td className="p-3.5">
                        <Badge variant={proj.projectType === "SOFTWARE" ? "info" : "purple"}>
                          {proj.projectType === "SOFTWARE" ? (
                            <span className="flex items-center gap-1">
                              <Code2 className="w-3 h-3" /> SOFTWARE
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Cpu className="w-3 h-3" /> HARDWARE
                            </span>
                          )}
                        </Badge>
                      </td>
                      <td className="p-3.5 font-medium text-slate-600 dark:text-slate-400">
                        {proj.techStack}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-500">
                        {proj.completionDate || "N/A"}
                      </td>
                      <td className="p-3.5">
                        <Badge variant="success">{proj.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Project Modal with Dynamic Conditional Form */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Add Project — AY ${selectedAcademicYear}`} maxWidth="lg">
        <form onSubmit={handleAddProject} className="space-y-4 text-xs">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Project Name *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Autonomous Edge AI Vision System"
                className="ui-input w-full p-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Project Type *</label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as "SOFTWARE" | "HARDWARE")}
                className="ui-input w-full p-2 font-bold text-indigo-600"
              >
                <option value="SOFTWARE">SOFTWARE</option>
                <option value="HARDWARE">HARDWARE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description *</label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of problem statement and solution"
              className="ui-input w-full p-2"
            />
          </div>

          {/* DYNAMIC FORM BEHAVIOR BASED ON PROJECT TYPE */}
          {projectType === "SOFTWARE" ? (
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-3">
              <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 text-xs">
                <Code2 className="w-4 h-4" /> Dynamic Fields: SOFTWARE Project Requirements
              </span>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Software / Live Project Link *
                </label>
                <input
                  type="url"
                  required
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  placeholder="https://my-ai-app.vercel.app"
                  className="ui-input w-full p-2"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  GitHub Repository Link (Optional)
                </label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username/project"
                  className="ui-input w-full p-2"
                />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3">
              <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 text-xs">
                <Cpu className="w-4 h-4" /> Dynamic Fields: HARDWARE Project Requirements
              </span>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Hardware Project Photo Upload URL *
                </label>
                <input
                  type="url"
                  required
                  value={screenshots}
                  onChange={(e) => setScreenshots(e.target.value)}
                  placeholder="https://example.com/hardware-prototype.jpg"
                  className="ui-input w-full p-2"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Completion Status</label>
              <select value={completionStatus} onChange={(e) => setCompletionStatus(e.target.value)} className="ui-input w-full p-2">
                <option value="COMPLETED">COMPLETED</option>
                <option value="ONGOING">ONGOING</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Completion Date</label>
              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
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
              {submitting ? "Saving..." : "Save Project Record"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Top-Level Delete Management Panel */}
      <DeleteManagementPanel
        isOpen={isDeletePanelOpen}
        onClose={() => setIsDeletePanelOpen(false)}
        title="Project Delete & Archive Management — Dedicated Selector"
        moduleName="Project"
        academicYears={["2025-2026", "2024-2025"]}
        reasons={["Project Abandoned", "Duplicate Submission", "Invalid Links", "Wrong Student Link", "Other"]}
        records={projects.map((item) => ({
          id: item.id,
          name: `${item.title} — ${item.studentProfile?.fullName || "Student"}`,
          identifier: item.studentProfile?.registerNo || item.id.slice(0, 8),
          subtext: `Type: ${item.projectType || "SOFTWARE"} | Tech: ${item.techStack || "N/A"} | Status: ${item.completionStatus || "COMPLETED"}`,
          academicYear: item.academicYearCode || selectedAcademicYear,
          status: item.completionStatus || "COMPLETED",
          badge: item.projectType || "SOFTWARE",
          isArchived: item.isArchived,
          warningMsg: "Soft archiving hides this project from active showcases while preserving repository links, demo URLs, screenshots, and skill evidence.",
        }))}
        onConfirmArchive={async (projectId, reason) => {
          const res = await fetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "archive", reason }),
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Archive failed");
          fetchData();
        }}
        onConfirmRestore={async (projectId) => {
          const res = await fetch(`/api/projects/${projectId}`, {
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

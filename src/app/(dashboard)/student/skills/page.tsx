"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Code2,
  CheckCircle2,
  FileCheck,
  FolderGit2,
  Briefcase,
  Plus,
  Network,
  Sparkles,
  Award,
} from "lucide-react";

export default function StudentSkillsPage() {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "Programming",
    level: "Intermediate",
    evidenceType: "SELF_REPORTED",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();

      if (meData.user?.studentProfile) {
        setStudentId(meData.user.studentProfile.id);
        const res = await fetch(`/api/skills?studentId=${meData.user.studentProfile.id}`);
        const data = await res.json();
        setSkills(data.skills || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, studentId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add skill");

      alert("Skill added to your Skills Passport!");
      setIsModalOpen(false);
      fetchSkills();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const verifiedSkills = skills.filter((s) => s.verified);
  const selfReportedSkills = skills.filter((s) => !s.verified);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Student Institutional Skills Passport & Evidence Graph"
        subtitle="Visual proof graph linking skills to verified certificates, projects & industry internships"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Banner */}
        <div className="ui-card p-6 border-l-4 border-l-indigo-600 bg-gradient-to-r from-indigo-50/50 dark:from-indigo-950/30 to-slate-50 dark:to-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
              Tamper-Proof Technical Competency Matrix
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              Verified Skills Passport & Evidence Provenance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Skills receive the official VERIFIED badge only when supported by approved certificates, verified projects, or completed internships.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Competency</span>
          </button>
        </div>

        {/* Verified Skills Evidence Graph Section */}
        <div className="ui-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Network className="w-4 h-4 text-emerald-600" />
              <span>Verified Skill Evidence Graph ({verifiedSkills.length})</span>
            </h3>
            <Badge variant="success">★ Verified Competencies</Badge>
          </div>

          {loading ? (
            <Skeleton className="h-40 rounded-2xl" />
          ) : verifiedSkills.length === 0 ? (
            <EmptyState
              title="No Verified Skills Yet"
              description="Complete course certifications, verified projects, or internships to automatically earn verified skill badges!"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {verifiedSkills.map((s) => (
                <div key={s.id} className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 dark:text-white text-base">{s.name}</span>
                    <Badge variant="success">★ VERIFIED</Badge>
                  </div>

                  <div className="text-xs text-slate-500 font-medium">Category: {s.category} | Level: {s.level}</div>

                  {/* Backing Evidence Node Link */}
                  <div className="pt-2 border-t border-emerald-200 dark:border-emerald-900/40 flex items-center gap-2 text-xs">
                    {s.evidenceType === "CERTIFICATE" && <FileCheck className="w-4 h-4 text-purple-600" />}
                    {s.evidenceType === "PROJECT" && <FolderGit2 className="w-4 h-4 text-sky-600" />}
                    {s.evidenceType === "INTERNSHIP" && <Briefcase className="w-4 h-4 text-emerald-600" />}
                    <span className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                      Evidence: {s.evidenceRecord?.title || s.evidenceRecord?.companyName || "Faculty Verified"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Self-Reported Skills Section */}
        <div className="ui-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-600" />
              <span>Self-Reported Technical Skills ({selfReportedSkills.length})</span>
            </h3>
            <Badge variant="purple">SELF-REPORTED</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
            {selfReportedSkills.map((s) => (
              <div key={s.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white block">{s.name}</span>
                <span className="text-slate-400 text-[10px] block">{s.category} • {s.level}</span>
                <span className="text-amber-600 dark:text-amber-400 text-[10px] font-semibold block">SELF-REPORTED</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Skill Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Skill to Passport" maxWidth="md">
        <form onSubmit={handleAddSkill} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Skill Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Python, React, PyTorch, Docker"
              className="ui-input w-full p-2"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="ui-input w-full p-2 font-semibold"
            >
              {["Programming", "AI/ML", "Data Science", "Web Development", "Mobile Development", "Cloud", "Database", "Cyber Security", "Design", "Communication", "Leadership", "Other"].map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Level *</label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              className="ui-input w-full p-2"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 font-semibold">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md">
              {submitting ? "Adding..." : "Add to Passport"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

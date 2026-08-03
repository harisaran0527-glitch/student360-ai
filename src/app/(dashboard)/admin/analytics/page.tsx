"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  BarChart3,
  TrendingUp,
  Users,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Plus,
  Target,
  Clock,
  Layers,
  Settings,
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [adminAiData, setAdminAiData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  // Role Profile Modal state
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleFormData, setRoleFormData] = useState({
    roleName: "",
    description: "",
    coreSkills: "",
    recommendedSkills: "",
    optionalSkills: "",
    suggestedProjectDomains: "",
    suggestedInternshipDomains: "",
  });
  const [savingRole, setSavingRole] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch students for general enrollment analytics
      const studRes = await fetch("/api/students");
      const studData = await studRes.json();
      setStudents(studData.students || []);

      // Fetch admin AI analytics
      const aiRes = await fetch("/api/ai/admin-analytics");
      const aiData = await aiRes.json();
      setAdminAiData(aiData);

      // Fetch career roles
      const rolesRes = await fetch("/api/ai/roles");
      const rolesData = await rolesRes.json();
      setRoles(rolesData.roles || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRole(true);
    try {
      const res = await fetch("/api/ai/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roleFormData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save role");

      alert("Career Role Profile saved successfully!");
      setRoleModalOpen(false);
      fetchAnalytics();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingRole(false);
    }
  };

  const deptCounts: Record<string, number> = {};
  students.forEach((s) => {
    const code = s.department?.code || "Other";
    deptCounts[code] = (deptCounts[code] || 0) + 1;
  });

  const deptData = Object.keys(deptCounts).map((k) => ({
    name: k,
    students: deptCounts[k],
  }));

  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="Institutional Analytics & AI Intelligence Engine Control"
        subtitle="Real-time AI engine health, snapshot audit logs, career role profiles & cross-departmental metrics"
      />

      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Banner */}
        <div className="ui-card p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                Mode: {adminAiData?.engineStatus?.mode || "Rule-Based Engine v1.0"}
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">AI Engine Control Hub & Institutional Analytics</h2>
            <p className="text-xs text-slate-300">
              Monitors rule-based snapshot generation history, career role profiles, and student support attention distribution across institution.
            </p>
          </div>

          <button
            onClick={() => setRoleModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Career Role Profile</span>
          </button>
        </div>

        {/* Engine Health Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="ui-card p-5 border-l-4 border-l-indigo-600 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Risk Snapshots</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {adminAiData?.counts?.totalRiskSnapshots || 0}
            </div>
            <span className="text-xs text-slate-500 font-medium">Historical support attention records</span>
          </div>

          <div className="ui-card p-5 border-l-4 border-l-emerald-600 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total AI Insights Generated</span>
            <div className="text-2xl font-black text-emerald-600">
              {adminAiData?.counts?.totalInsightSnapshots || 0}
            </div>
            <span className="text-xs text-slate-500 font-medium">Skill gap & roadmap evaluations</span>
          </div>

          <div className="ui-card p-5 border-l-4 border-l-amber-600 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Engine Pipeline</span>
            <div className="text-sm font-bold text-amber-700 dark:text-amber-400 pt-1">
              5 Modular Engines Active
            </div>
            <span className="text-[11px] text-slate-500">Pipeline ready for future Python ML training</span>
          </div>
        </div>

        {/* SECTION 1: Active Engines Status */}
        <div className="ui-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Active AI/ML Intelligence Layer Engines</span>
            </h3>
            <Badge variant="success">All Systems Operational</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            {adminAiData?.engineStatus?.engines?.map((eng: any) => (
              <div key={eng.name} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white">{eng.name}</span>
                  <Badge variant="success">{eng.status}</Badge>
                </div>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono block">{eng.version}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: Career Role Profiles Management */}
        <div className="ui-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600" />
              <span>Institutional Career Role Profiles ({roles.length})</span>
            </h3>
            <button
              onClick={() => setRoleModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {roles.map((r) => (
              <div key={r.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{r.roleName}</span>
                  <Badge variant="info">Active</Badge>
                </div>
                <p className="text-slate-500 text-[11px] line-clamp-2">{r.description}</p>
                <div className="pt-2 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                  <strong>Core:</strong> {r.coreSkills}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: Recent AI Snapshot Audit Logs */}
        <div className="ui-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Recent AI Insight Generation Audit Logs</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">Register No</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Attention Level</th>
                  <th className="p-3">Sem & Academic Year</th>
                  <th className="p-3">Engine Version</th>
                  <th className="p-3">Generated Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {adminAiData?.recentSnapshots?.map((snap: any) => (
                  <tr key={snap.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{snap.registerNo}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{snap.studentName}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          snap.attentionLevel === "HIGH_ATTENTION"
                            ? "danger"
                            : snap.attentionLevel === "MEDIUM_ATTENTION"
                            ? "warning"
                            : "success"
                        }
                      >
                        {snap.attentionLevel}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">Sem {snap.semester} ({snap.academicYear})</td>
                    <td className="p-3 text-slate-500 font-mono text-[11px]">{snap.engineVersion}</td>
                    <td className="p-3 text-slate-400">{new Date(snap.generatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Existing Department & CGPA Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Department Enrolment Breakdown</span>
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} />
                  <Bar dataKey="students" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="ui-card p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <span>Target Role Selection Popularity</span>
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adminAiData?.popularTargetRoles || []}>
                  <XAxis dataKey="role" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} />
                  <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Role Profile Modal */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title="Add / Update Career Role Profile"
        maxWidth="md"
      >
        <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Role Name *</label>
            <input
              type="text"
              required
              value={roleFormData.roleName}
              onChange={(e) => setRoleFormData({ ...roleFormData, roleName: e.target.value })}
              placeholder="e.g. AI Engineer"
              className="ui-input w-full p-2"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description *</label>
            <textarea
              required
              rows={2}
              value={roleFormData.description}
              onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
              placeholder="Brief description of the career role..."
              className="ui-input w-full p-2"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Core Skills (comma-separated) *</label>
            <input
              type="text"
              required
              value={roleFormData.coreSkills}
              onChange={(e) => setRoleFormData({ ...roleFormData, coreSkills: e.target.value })}
              placeholder="Python, PyTorch, SQL, LLMs"
              className="ui-input w-full p-2"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Recommended Skills (comma-separated)</label>
            <input
              type="text"
              value={roleFormData.recommendedSkills}
              onChange={(e) => setRoleFormData({ ...roleFormData, recommendedSkills: e.target.value })}
              placeholder="Docker, Git, LangChain"
              className="ui-input w-full p-2"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Suggested Project Domains (comma-separated)</label>
            <input
              type="text"
              value={roleFormData.suggestedProjectDomains}
              onChange={(e) => setRoleFormData({ ...roleFormData, suggestedProjectDomains: e.target.value })}
              placeholder="Artificial Intelligence, Natural Language Processing"
              className="ui-input w-full p-2"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={() => setRoleModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 font-semibold">Cancel</button>
            <button type="submit" disabled={savingRole} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md">
              {savingRole ? "Saving..." : "Save Role Profile"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

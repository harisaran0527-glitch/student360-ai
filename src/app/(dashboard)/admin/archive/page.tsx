"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import {
  Archive,
  RotateCcw,
  Trash2,
  Users,
  BookOpen,
  Briefcase,
  Award,
  FolderGit2,
  GraduationCap,
  Building,
} from "lucide-react";

export default function AdminArchiveCenterPage() {
  const [activeTab, setActiveTab] = useState<string>("students");
  const [archivedData, setArchivedData] = useState<any>({
    students: [],
    courses: [],
    internships: [],
    certificates: [],
    projects: [],
    placements: [],
    alumni: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);

  // Modal State
  const [targetRecord, setTargetRecord] = useState<any | null>(null);
  const [deleteMode, setDeleteMode] = useState<"archive" | "permanent">("permanent");

  const fetchArchivedRecords = async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      setIsSuperAdmin(meData.user?.role === "SUPER_ADMIN");

      // Fetch archived records for all modules
      const [studRes, courseRes, internRes, certRes, projRes, placeRes, alumRes] = await Promise.all([
        fetch("/api/students?isArchived=true").then((r) => r.json()),
        fetch("/api/courses?isArchived=true").then((r) => r.json()),
        fetch("/api/internships?isArchived=true").then((r) => r.json()),
        fetch("/api/certificates?isArchived=true").then((r) => r.json()),
        fetch("/api/projects?isArchived=true").then((r) => r.json()),
        fetch("/api/placement/records?isArchived=true").then((r) => r.json()),
        fetch("/api/alumni?isArchived=true").then((r) => r.json()),
      ]);

      setArchivedData({
        students: studRes.data?.students || studRes.students || [],
        courses: courseRes.data?.courses || courseRes.courses || [],
        internships: internRes.data?.internships || internRes.internships || [],
        certificates: certRes.data?.certificates || certRes.certificates || [],
        projects: projRes.data?.projects || projRes.projects || [],
        placements: placeRes.data?.records || placeRes.records || [],
        alumni: alumRes.data?.alumni || alumRes.alumni || [],
      });
    } catch (err) {
      console.error("Failed to fetch archived records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedRecords();
  }, []);

  const handleRestore = async (recordType: string, id: string) => {
    let endpoint = "";
    if (recordType === "student") endpoint = `/api/students/${id}/restore`;
    else if (recordType === "course") endpoint = `/api/courses/${id}`;
    else if (recordType === "internship") endpoint = `/api/internships/${id}`;
    else if (recordType === "certificate") endpoint = `/api/certificates/${id}`;
    else if (recordType === "project") endpoint = `/api/projects/${id}`;
    else if (recordType === "placement") endpoint = `/api/placement/records/${id}`;
    else if (recordType === "alumni") endpoint = `/api/alumni/${id}`;

    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message || data.error || "Restore failed");

      alert("Record restored successfully!");
      fetchArchivedRecords();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePermanentDeleteConfirm = async (reason: string, notes?: string, confirmText?: string) => {
    if (!targetRecord) return;
    const { type, id } = targetRecord;

    let endpoint = "";
    if (type === "student") endpoint = `/api/students/${id}`;
    else if (type === "course") endpoint = `/api/courses/${id}`;
    else if (type === "internship") endpoint = `/api/internships/${id}`;
    else if (type === "certificate") endpoint = `/api/certificates/${id}`;
    else if (type === "project") endpoint = `/api/projects/${id}`;
    else if (type === "placement") endpoint = `/api/placement/records/${id}`;
    else if (type === "alumni") endpoint = `/api/alumni/${id}`;

    const res = await fetch(endpoint, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmText, reason, notes }),
    });

    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.message || data.error || "Permanent delete failed");
    }

    alert("Record permanently erased from Supabase cloud database.");
    setTargetRecord(null);
    fetchArchivedRecords();
  };

  const activeList = archivedData[activeTab] || [];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="Admin Archive Center — Institutional Vault"
        subtitle="Manage soft-deleted records, restore historical data, or execute authorized SUPER_ADMIN permanent deletions."
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Navigation Tabs */}
        <div className="ui-card p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
          <Tabs
            tabs={[
              { id: "students", label: `Students (${archivedData.students.length})` },
              { id: "courses", label: `Subjects (${archivedData.courses.length})` },
              { id: "internships", label: `Internships (${archivedData.internships.length})` },
              { id: "certificates", label: `Certificates (${archivedData.certificates.length})` },
              { id: "projects", label: `Projects (${archivedData.projects.length})` },
              { id: "placements", label: `Placements (${archivedData.placements.length})` },
              { id: "alumni", label: `Alumni (${archivedData.alumni.length})` },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {/* Content Table */}
        <div className="ui-card rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Archive className="w-4 h-4 text-amber-600" />
              <span>Archived {activeTab.toUpperCase()} Records ({activeList.length})</span>
            </h3>
            <Badge variant="warning">Soft Deleted / Retained in Supabase</Badge>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
            </div>
          ) : activeList.length === 0 ? (
            <EmptyState
              title={`No Archived ${activeTab.slice(0, -1).toUpperCase()} Records`}
              description="Records soft-deleted by Admins across Student360 AI will appear here for review and restoration."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3.5">Record Identifier</th>
                    <th className="p-3.5">Title / Name</th>
                    <th className="p-3.5">Archived Reason</th>
                    <th className="p-3.5">Archived By</th>
                    <th className="p-3.5">Archived At</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {activeList.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {item.registerNo || item.code || item.id.slice(0, 8)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {item.fullName || item.title || item.companyName || item.name || "N/A"}
                      </td>
                      <td className="p-3.5 font-semibold text-amber-700 dark:text-amber-300">
                        {item.archivedReason || "Admin Archived"}
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {item.archivedBy || "Admin"}
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {item.archivedAt ? new Date(item.archivedAt).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleRestore(activeTab.slice(0, -1), item.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 font-bold flex items-center gap-1 text-[11px]"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Restore
                          </button>

                          {isSuperAdmin && (
                            <button
                              onClick={() => {
                                setTargetRecord({
                                  type: activeTab.slice(0, -1),
                                  id: item.id,
                                  name: item.fullName || item.title || item.companyName || item.name,
                                  identifier: item.registerNo || item.code || item.id.slice(0, 8),
                                });
                                setDeleteMode("permanent");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 font-bold flex items-center gap-1 text-[11px]"
                              title="SUPER_ADMIN Permanent Erase"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Permanent Delete
                            </button>
                          )}
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

      {/* Permanent Delete Modal */}
      {targetRecord && (
        <ConfirmDeleteModal
          isOpen={Boolean(targetRecord)}
          onClose={() => setTargetRecord(null)}
          title={`Permanent Erase — ${targetRecord.name}`}
          recordName={targetRecord.name}
          recordIdentifier={targetRecord.identifier}
          recordType={targetRecord.type.toUpperCase()}
          mode="permanent"
          isSuperAdmin={isSuperAdmin}
          onConfirm={handlePermanentDeleteConfirm}
        />
      )}
    </div>
  );
}

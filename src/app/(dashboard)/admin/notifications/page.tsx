"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { ACADEMIC_YEAR_OPTIONS, DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { getAcademicOptions } from "@/lib/clientOptionsCache";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { DeleteManagementPanel } from "@/components/ui/DeleteManagementPanel";
import {
  Bell,
  Mail,
  Play,
  Plus,
  Trash2,
  Archive,
} from "lucide-react";

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("email");
  const [triggering, setTriggering] = useState(false);

  // Broadcast Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [targetAY, setTargetAY] = useState(DEFAULT_ACADEMIC_YEAR);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("HIGH");
  const [emailRequired, setEmailRequired] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?status=ALL");
      const data = await res.json();
      setNotifications(data.data?.notifications || data.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    getAcademicOptions()
      .then((opts) => {
        setAcademicYears(opts.academicYears || []);
      })
      .catch((e) => console.error(e));
  }, []);

  const handleRunManualCheck = async () => {
    setTriggering(true);
    try {
      const res = await fetch("/api/notifications/run-checks", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Check failed");

      alert(data.message);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTriggering(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_BROADCAST",
          academicYear: targetAY,
          title,
          message,
          priority,
          emailRequired,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "Failed to send notification broadcast");
      }

      alert(`Notification broadcast sent to ${data.data?.recipientCount || 0} students!`);
      setIsModalOpen(false);
      setTitle("");
      setMessage("");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const emailLogs = notifications.filter((n) => n.emailRequired || n.emailStatus !== "NOT_REQUIRED");

  // Delete Management State
  const [isDeletePanelOpen, setIsDeletePanelOpen] = useState<boolean>(false);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="Admin Notification & Alert Workspace — AI & ML Department"
        subtitle="Trigger scheduled compliance checks, monitor email delivery logs & broadcast year-wise alerts"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Notification</span>
            </button>

            <button
              onClick={() => setIsDeletePanelOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Delete Notification</span>
            </button>

            <button
              onClick={() => (window.location.href = "/admin/archive")}
              className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Archive className="w-4 h-4" />
              <span>Archived Notifications</span>
            </button>
          </div>
        }
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Action Banner */}
        <div className="ui-card p-6 border-l-4 border-l-indigo-600 bg-gradient-to-r from-indigo-50/50 dark:from-indigo-950/30 to-slate-50 dark:to-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
              Department Notification Engine
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              Scheduled Job Scanner & Target Alerts
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Broadcast announcements or trigger automated scanner for attendance shortages & deadlines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Notification</span>
            </button>

            <button
              onClick={handleRunManualCheck}
              disabled={triggering}
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold shadow-md transition flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{triggering ? "Scanning..." : "Run Scheduled Job"}</span>
            </button>
          </div>
        </div>

        {/* Tabs Workspace */}
        <div className="ui-card p-6 space-y-6 bg-white dark:bg-slate-900 rounded-2xl">
          <Tabs
            tabs={[
              { id: "email", label: "Email Delivery Logs", count: emailLogs.length, icon: Mail },
              { id: "all", label: "All Department Notifications", count: notifications.length, icon: Bell },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* Email Logs Table */}
          {activeTab === "email" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase text-slate-500">
                    <th className="p-3">Notification Title</th>
                    <th className="p-3">Type & Priority</th>
                    <th className="p-3">Email Delivery Status</th>
                    <th className="p-3">Sent Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-4">
                        <Skeleton className="h-10 rounded-xl" />
                      </td>
                    </tr>
                  ) : emailLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6">
                        <EmptyState
                          title="No Email Logs Yet"
                          description="Click '+ Create Notification' below to broadcast target alerts."
                          action={
                            <button
                              onClick={() => setIsModalOpen(true)}
                              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Create Notification</span>
                            </button>
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    emailLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {log.title}
                          <div className="text-[11px] font-normal text-slate-500">{log.message}</div>
                        </td>
                        <td className="p-3">
                          <Badge variant="purple">{log.type}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                log.emailStatus === "SENT"
                                  ? "success"
                                  : log.emailStatus === "DEVELOPMENT_EMAIL_PENDING" || log.emailStatus === "PENDING"
                                  ? "warning"
                                  : "danger"
                              }
                            >
                              {log.emailStatus}
                            </Badge>
                            <button
                              onClick={async () => {
                                if (!confirm("Are you sure you want to permanently delete this record?\nThis action cannot be undone.")) return;
                                try {
                                  const res = await fetch(`/api/notifications/${log.id}`, { method: "DELETE" });
                                  const d = await res.json();
                                  if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Delete failed");
                                  alert("Notification permanently deleted.");
                                  fetchData();
                                } catch (err: any) {
                                  alert(err.message);
                                }
                              }}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Delete Notification"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : "Recent"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* All Notifications List */}
          {activeTab === "all" && (
            <div className="space-y-3 text-xs">
              {notifications.map((n) => (
                <div key={n.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{n.title}</span>
                    <span className="text-slate-500">{n.message}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={n.status === "UNREAD" ? "warning" : "info"}>{n.status}</Badge>
                    <button
                      onClick={async () => {
                        if (!confirm("Are you sure you want to permanently delete this record?\nThis action cannot be undone.")) return;
                        try {
                          const res = await fetch(`/api/notifications/${n.id}`, { method: "DELETE" });
                          const d = await res.json();
                          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Delete failed");
                          alert("Notification permanently deleted.");
                          fetchData();
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Delete Notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Broadcast Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Send Broadcast Notification" maxWidth="md">
        <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Academic Year *</label>
            <select
              value={targetAY}
              onChange={(e) => setTargetAY(e.target.value)}
              className="ui-input w-full p-2 font-bold text-indigo-600"
            >
              <option value="ALL">All Academic Years</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.yearCode}>
                  Academic Year {ay.yearCode}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Notification Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mandatory Attendance Reminder"
              className="ui-input w-full p-2"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Notification Message *</label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter announcement text for AI & ML students..."
              className="ui-input w-full p-2"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="ui-input w-full p-2">
                <option value="NORMAL">NORMAL</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="emailReq"
                checked={emailRequired}
                onChange={(e) => setEmailRequired(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <label htmlFor="emailReq" className="font-bold text-slate-700 dark:text-slate-300">
                Queue Email Delivery
              </label>
            </div>
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 font-semibold">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-md">
              {submitting ? "Sending..." : "Send Broadcast"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Top-Level Delete Management Panel */}
      <DeleteManagementPanel
        isOpen={isDeletePanelOpen}
        onClose={() => setIsDeletePanelOpen(false)}
        title="Notification Delete & Archive Management — Dedicated Selector"
        moduleName="Notification"
        academicYears={[...ACADEMIC_YEAR_OPTIONS]}
        reasons={["Outdated Alert", "Duplicate Notification", "Draft Cancelled", "Wrong Audience Target", "Other"]}
        records={notifications.map((item) => {
          const isSent = item.emailStatus === "SENT";
          return {
            id: item.id,
            name: item.title || "Notification Alert",
            identifier: item.id.slice(0, 8),
            subtext: `Audience: ${item.type || "STUDENT"} | Date: ${item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "N/A"} | Email Status: ${item.emailStatus || "NOT_REQUIRED"}`,
            academicYear: item.academicYear || DEFAULT_ACADEMIC_YEAR,
            status: item.emailStatus || "SENT",
            badge: item.priority || "NORMAL",
            isArchived: item.isArchived,
            warningMsg: isSent
              ? "Email already sent and cannot be recalled. Archiving will remove it from the Admin dashboard while recipient read history remains intact."
              : undefined,
          };
        })}
        onConfirmDelete={async (noteId) => {
          const res = await fetch(`/api/notifications/${noteId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Delete failed");
          fetchData();
        }}
        onConfirmArchive={async (noteId, reason) => {
          const res = await fetch(`/api/notifications/${noteId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "archive", reason }),
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Archive failed");
          fetchData();
        }}
        onConfirmRestore={async (noteId) => {
          const res = await fetch(`/api/notifications/${noteId}`, {
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

"use client";

import React, { useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { KeyRound, Mail, ShieldCheck, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default function AdminAccountSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    if (newPassword && newPassword !== confirmNewPassword) {
      setError("New password and confirm password do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newEmail, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update account settings");

      setMessage(data.message || "Account settings updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="Admin Account & Security Settings"
        subtitle="Manage administrator email, password policy validation, and session security"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
        <div className="ui-card p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
              Super Admin / Admin Security Control
            </span>
            <Badge variant="success">Password Policy Active</Badge>
          </div>
          <h2 className="text-xl font-bold">Account Credentials & Password Policy Management</h2>
          <p className="text-xs text-slate-300">
            Password updates require confirmation of your current password and enforcement of institutional security policies.
          </p>
        </div>

        {message && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="ui-card p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            <PasswordInput
              label="Current Password (Required to authorize changes)"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
            />

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-600" /> Update Email Address
              </h3>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. admin.new@student360.edu"
                  className="ui-input w-full p-2.5"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-emerald-600" /> Change Password
              </h3>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">Password Requirements:</span>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>At least 8 characters in length</li>
                  <li>At least 1 uppercase letter (A-Z)</li>
                  <li>At least 1 lowercase letter (a-z)</li>
                  <li>At least 1 numeric digit (0-9)</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PasswordInput
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  autoComplete="new-password"
                />
                <PasswordInput
                  label="Confirm New Password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition"
              >
                {loading ? "Updating Account..." : "Save Account Settings"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

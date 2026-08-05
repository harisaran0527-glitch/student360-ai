"use client";

import React, { useState } from "react";
import { GraduationCap, ArrowRight } from "lucide-react";
import { PasswordInput } from "@/components/ui/PasswordInput";

export function StudentLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Invalid email or password.");
      }

      setPassword("");
      window.location.href = "/student/profile";
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/30 mb-4">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Student360 <span className="text-purple-400">AI</span>
          </h1>
          <p className="text-sm font-bold text-purple-400 uppercase tracking-wider mt-1">
            Student Portal
          </p>
        </div>

        {/* Login Form Card */}
        <div className="glass-card p-8 rounded-3xl border border-slate-800 shadow-2xl">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Student Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700/60 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition"
                placeholder="Enter student email"
              />
            </div>

            <PasswordInput
              label="Student Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter password"
              inputClassName="bg-slate-900/80 border-slate-700/60 text-white focus:border-purple-500 py-2.5"
              labelClassName="text-slate-300 mb-1.5"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-lg shadow-purple-500/30 transition flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating Student...</span>
              ) : (
                <>
                  <span>Student Login</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              Institutional Student Portfolio & Lifecycle Management
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

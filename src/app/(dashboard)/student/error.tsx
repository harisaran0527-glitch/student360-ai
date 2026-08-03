"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw, LogIn } from "lucide-react";

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Student Portal Error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
      <div className="glass-card p-8 rounded-3xl border border-purple-500/30 max-w-md w-full space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Unable to load Student Portal page</h2>
          <p className="text-xs text-slate-400">A student portal error occurred. Retry or return to Student Login.</p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
          <button
            onClick={() => (window.location.href = "/student")}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Go to Student Login</span>
          </button>
        </div>
      </div>
    </div>
  );
}

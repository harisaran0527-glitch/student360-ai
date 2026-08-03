"use client";

import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, X } from "lucide-react";

interface Props {
  updateAvailable: boolean;
  onUpdate: () => void;
}

export function PwaStatusBanner({ updateAvailable, onUpdate }: Props) {
  const [isOffline, setIsOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 4000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowRestored(false);
    };

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 print:hidden pointer-events-none">
      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="pointer-events-auto p-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>You are offline. Data-changing actions disabled.</span>
          </div>
        </div>
      )}

      {/* Connection Restored Banner */}
      {showRestored && (
        <div className="pointer-events-auto p-3.5 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            <span>Connection restored. All systems live.</span>
          </div>
        </div>
      )}

      {/* SW Version Update Banner */}
      {updateAvailable && (
        <div className="pointer-events-auto p-4 rounded-2xl bg-indigo-900 text-white shadow-2xl border border-indigo-700 space-y-2 text-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between font-bold">
            <span>A new version of Student360 AI is available.</span>
          </div>
          <button
            onClick={onUpdate}
            className="w-full py-2 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold flex items-center justify-center gap-1.5 shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Update Now
          </button>
        </div>
      )}
    </div>
  );
}

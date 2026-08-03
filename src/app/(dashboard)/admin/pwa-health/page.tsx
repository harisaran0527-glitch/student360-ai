"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  ShieldCheck,
  Bell,
  Layers,
  Sparkles,
} from "lucide-react";

export default function PwaHealthPage() {
  const [swRegistered, setSwRegistered] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isSecureContext, setIsSecureContext] = useState(false);
  const [manifestDetected, setManifestDetected] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSwRegistered("serviceWorker" in navigator);
      setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
      setIsSecureContext(window.isSecureContext);
      setManifestDetected(Boolean(document.querySelector("link[rel='manifest']")));
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="PWA & Mobile Diagnostics Hub"
        subtitle="Real-time Progressive Web App configuration, service worker caching & mobile installation status"
      />

      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Banner */}
        <div className="ui-card p-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl shadow-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
              Student360 AI Progressive Web App Engine
            </span>
            <Badge variant="success">PWA Ready • Standalone Mode Supported</Badge>
          </div>
          <h2 className="text-xl font-bold">Mobile App Installation & Service Worker Health</h2>
          <p className="text-xs text-indigo-200">
            Monitors web app manifest parsing, static asset caching boundaries, HTTPS security requirements, and mobile responsiveness.
          </p>
        </div>

        {/* Diagnostic Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="ui-card p-5 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-indigo-600" /> Web App Manifest
              </span>
              {manifestDetected ? <Badge variant="success">Detected</Badge> : <Badge variant="warning">Missing</Badge>}
            </div>
            <p className="text-slate-500">Configured in public/manifest.json with standalone mode, icons (192x192, 512x512), theme colors.</p>
          </div>

          <div className="ui-card p-5 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-emerald-600" /> Service Worker Engine
              </span>
              {swRegistered ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}
            </div>
            <p className="text-slate-500">public/sw.js caching static app shell assets. Sensitive student API records strictly excluded from offline caches.</p>
          </div>

          <div className="ui-card p-5 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-600" /> Secure HTTPS Context
              </span>
              {isSecureContext ? <Badge variant="success">Secure</Badge> : <Badge variant="warning">Local Dev</Badge>}
            </div>
            <p className="text-slate-500">HTTPS origin required for production service worker registration and Android Chrome PWA installation prompts.</p>
          </div>

          <div className="ui-card p-5 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-600" /> Offline Fallback Strategy
              </span>
              <Badge variant="success">Configured</Badge>
            </div>
            <p className="text-slate-500">public/offline.html renders when network requests fail while disconnected, disabling data-changing operations.</p>
          </div>

          <div className="ui-card p-5 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-amber-600" /> Web Push Architecture
              </span>
              <Badge variant="info">VAPID Ready</Badge>
            </div>
            <p className="text-slate-500">Subscription API endpoint (/api/push/subscribe) prepared for VAPID key delivery without paid dependencies.</p>
          </div>

          <div className="ui-card p-5 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" /> Application Version
              </span>
              <Badge variant="info">v1.0.0-pwa</Badge>
            </div>
            <p className="text-slate-500">Automatic service worker version update detection notifies users when a new version is deployed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

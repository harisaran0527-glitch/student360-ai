"use client";

import React, { useState, useEffect } from "react";
import { Download, Smartphone, Share, CheckCircle2, X } from "lucide-react";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed prompt
    const isDismissed = localStorage.getItem("pwa_install_dismissed") === "true";
    if (isDismissed) setDismissed(true);

    // Detect iOS
    const ua = window.navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
    setIsIos(ios);

    // Listen for Android Chrome beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Install prompt outcome: ${outcome}`);
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa_install_dismissed", "true");
  };

  if (isInstalled || dismissed) return null;
  if (!deferredPrompt && !isIos) return null;

  return (
    <div className="ui-card p-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-xl space-y-3 relative print:hidden">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-indigo-300 hover:text-white p-1 rounded-lg"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
          <Smartphone className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-white">Install Student360 AI App</h4>
          <p className="text-xs text-indigo-200">
            Install for offline access, fast launch, and full-screen experience.
          </p>
        </div>
      </div>

      {deferredPrompt && (
        <button
          onClick={handleInstallClick}
          className="w-full py-2.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
        >
          <Download className="w-4 h-4" /> Install App
        </button>
      )}

      {isIos && (
        <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-[11px] text-slate-300 space-y-1">
          <div className="flex items-center gap-1 font-bold text-indigo-300">
            <Share className="w-3.5 h-3.5" /> iOS Safari Add to Home Screen:
          </div>
          <p>Tap the <strong>Share</strong> icon in Safari, then select <strong>&quot;Add to Home Screen&quot;</strong>.</p>
        </div>
      )}
    </div>
  );
}

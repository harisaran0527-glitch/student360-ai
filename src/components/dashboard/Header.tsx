"use client";

import React, { useState, useEffect } from "react";
import { Bell, X, Share2, Copy, Check, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { AcademicYearSelector } from "@/components/dashboard/AcademicYearSelector";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, action }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showNativeShare, setShowNativeShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setShowNativeShare(true);
    }
  }, []);

  useEffect(() => {
    if (!isShareOpen) return;
    const handleClose = () => setIsShareOpen(false);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, [isShareOpen]);

  const handleShareWhatsApp = () => {
    const text = `Student360 – AI Enterprise ERP\n\nAccess Student360 here:\nhttps://student360-avs.onrender.com`;
    const encoded = encodeURIComponent(text);
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
    const url = isMobile 
      ? `whatsapp://send?text=${encoded}` 
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, "_blank");
    setIsShareOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText("https://student360-avs.onrender.com");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: "Student360 – AI Enterprise ERP",
        text: "Access Student360 here:",
        url: "https://student360-avs.onrender.com",
      });
      setIsShareOpen(false);
    } catch (err) {
      console.error("Native share failed:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.data?.notifications || data.notifications || []);
      setUnreadCount(data.data?.unreadCount ?? data.unreadCount ?? 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_ALL_READ" }),
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Prominent Header Action Button(s) */}
        {action && <div className="flex items-center gap-2">{action}</div>}

        {/* Global Academic Year Selector */}
        <AcademicYearSelector />

        {/* Share Dropdown Button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsShareOpen(!isShareOpen);
              setIsDrawerOpen(false);
            }}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center justify-center"
            title="Share Student360"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {isShareOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-3 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col p-2 gap-1 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
                Share Portal
              </div>
              <button
                onClick={handleShareWhatsApp}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-bold transition text-left"
              >
                <svg className="w-4 h-4 fill-emerald-500" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.46h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span>Share on WhatsApp</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition text-left"
              >
                <div className="flex items-center gap-3">
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>Copy Link</span>
                </div>
                {copied && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal animate-pulse">
                    Copied!
                  </span>
                )}
              </button>

              {showNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition text-left border-t border-slate-100 dark:border-slate-800 mt-1 pt-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>More Share Options</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notification Bell Icon */}
        <div className="relative">
          <button
            onClick={() => {
              setIsDrawerOpen(!isDrawerOpen);
              setIsShareOpen(false);
            }}
            className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            title="Notifications Drawer"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Interactive Notification Drawer Dropdown */}
          {isDrawerOpen && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  <Bell className="w-4 h-4 text-indigo-600" />
                  <span>Notifications ({unreadCount} Unread)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Mark All Read
                  </button>
                  <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-2 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    No active notifications. You are all caught up!
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 space-y-1 transition rounded-xl ${
                        n.status === "UNREAD" ? "bg-indigo-50/40 dark:bg-indigo-950/20 font-semibold" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{n.title}</span>
                        <Badge variant={n.priority === "HIGH" || n.priority === "URGENT" ? "danger" : "info"}>
                          {n.priority}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        {n.message}
                      </p>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(n.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

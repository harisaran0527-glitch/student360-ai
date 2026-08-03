"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Bell, CheckCheck, Mail, Calendar, AlertCircle } from "lucide-react";

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.notifications || data.data?.notifications || []);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="My Notifications & Institutional Alerts"
        subtitle="Read-only broadcast announcements, attendance warnings, and academic updates"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
        <div className="ui-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Inbox Notifications ({notifications.filter((n) => !n.isRead).length} Unread)
            </h2>
          </div>

          {notifications.length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-xs flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>

        {loading ? (
          <Skeleton className="h-48 rounded-2xl" />
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No Notifications"
            description="You have no unread institutional notifications or broadcast alerts."
          />
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`ui-card p-5 transition space-y-2 border-l-4 ${
                  n.isRead
                    ? "border-l-slate-300 dark:border-l-slate-700 opacity-80"
                    : "border-l-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={n.priority === "URGENT" ? "danger" : n.priority === "HIGH" ? "warning" : "info"}>
                      {n.priority || "NORMAL"}
                    </Badge>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{n.title}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : "Today"}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {n.message}
                </p>

                {!n.isRead && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                      Mark as read
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

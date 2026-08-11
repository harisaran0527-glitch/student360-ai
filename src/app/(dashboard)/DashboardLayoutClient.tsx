"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Menu } from "lucide-react";

export default function DashboardLayoutClient({
  children,
  userRole: initialRole,
  userName: initialName,
  userEmail: initialEmail,
}: {
  children: React.ReactNode;
  userRole: string;
  userName: string;
  userEmail: string;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [session, setSession] = useState<{ role: string; fullName: string; email: string }>({
    role: initialRole || "",
    fullName: initialName || "",
    email: initialEmail || "",
  });
  const [checkedSession, setCheckedSession] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;
    async function verifyActiveSession() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user && isMounted) {
            setSession({
              role: data.user.role || "",
              fullName: data.user.fullName || "",
              email: data.user.email || "",
            });
          }
        }
      } catch (err) {
        console.error("[LAYOUT_AUTH_ME_ERROR]", err);
      } finally {
        if (isMounted) setCheckedSession(true);
      }
    }

    verifyActiveSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentRole = (session.role || initialRole || "").toUpperCase();
  const currentName = session.fullName || initialName || "";
  const currentEmail = session.email || initialEmail || "";

  const isAdminRoute = !pathname || pathname.startsWith("/admin");
  const isStudentRoute = pathname?.startsWith("/student");
  const isFacultyRoute = pathname?.startsWith("/faculty");

  const isAdminUser = currentRole === "ADMIN" || currentRole === "SUPER_ADMIN" || currentRole === "SUPERADMIN";
  const isStudentUser = currentRole === "STUDENT";
  const isFacultyUser = currentRole === "FACULTY";

  // Render Admin Sidebar when on /admin routes for Admin users (or initial server pass)
  const showSidebar =
    (isAdminRoute && (isAdminUser || (!checkedSession && !initialRole))) ||
    (isStudentRoute && isStudentUser) ||
    (isFacultyRoute && isFacultyUser);

  if (!showSidebar && checkedSession) {
    return <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors relative">
      <Sidebar
        userRole={currentRole || (isAdminRoute ? "ADMIN" : "STUDENT")}
        userName={currentName}
        userEmail={currentEmail}
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2"
          >
            <Menu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Navigation Menu</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

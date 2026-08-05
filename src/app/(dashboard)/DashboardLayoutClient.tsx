"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Menu } from "lucide-react";

export default function DashboardLayoutClient({
  children,
  userRole,
  userName,
  userEmail,
}: {
  children: React.ReactNode;
  userRole: string;
  userName: string;
  userEmail: string;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  // STRICT PORTAL ROUTE ISOLATION:
  // 1. /admin routes -> only ADMIN and SUPER_ADMIN users receive the Admin Sidebar
  // 2. /student routes -> only STUDENT users receive the Student Sidebar
  // 3. /faculty routes -> only FACULTY users receive the Faculty Sidebar
  const isAdminRoute = pathname?.startsWith("/admin");
  const isStudentRoute = pathname?.startsWith("/student");
  const isFacultyRoute = pathname?.startsWith("/faculty");

  const isAdminUser = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const isStudentUser = userRole === "STUDENT";
  const isFacultyUser = userRole === "FACULTY";

  const showSidebar =
    (isAdminRoute && isAdminUser) ||
    (isStudentRoute && isStudentUser) ||
    (isFacultyRoute && isFacultyUser);

  if (!showSidebar) {
    return <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors relative">
      <Sidebar
        userRole={userRole}
        userName={userName}
        userEmail={userEmail}
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

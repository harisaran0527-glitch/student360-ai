"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();

  // STRICT PORTAL ROUTE ISOLATION:
  // 1. /admin routes -> ALWAYS render the Admin Sidebar for Admin navigation
  // 2. /student routes -> render Student Sidebar
  // 3. /faculty routes -> render Faculty Sidebar
  const isAdminRoute = !pathname || pathname.startsWith("/admin");
  const isStudentRoute = pathname?.startsWith("/student");
  const isFacultyRoute = pathname?.startsWith("/faculty");

  const normalizedRole = (userRole || "").toUpperCase();
  const isAdminUser = normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN" || normalizedRole === "SUPERADMIN";
  const isStudentUser = normalizedRole === "STUDENT";
  const isFacultyUser = normalizedRole === "FACULTY";

  const isSubAdminRoute = isAdminRoute && pathname !== "/admin";

  // Redirect unauthenticated users attempting to access respective sub-routes directly to their login page
  useEffect(() => {
    if (isSubAdminRoute && !isAdminUser) {
      router.replace("/admin");
    } else if (isStudentRoute && pathname !== "/student" && !isStudentUser) {
      router.replace("/student");
    } else if (isFacultyRoute && pathname !== "/faculty" && !isFacultyUser) {
      router.replace("/faculty");
    }
  }, [isSubAdminRoute, isAdminUser, isStudentRoute, isStudentUser, isFacultyRoute, isFacultyUser, pathname, router]);

  const showSidebar =
    (isAdminRoute && (pathname !== "/admin" || isAdminUser)) ||
    (isStudentRoute && (pathname !== "/student" || isStudentUser)) ||
    (isFacultyRoute && (pathname !== "/faculty" || isFacultyUser));

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

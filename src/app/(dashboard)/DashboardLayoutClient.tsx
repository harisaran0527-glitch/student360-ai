"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";

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
  // If an active session of a DIFFERENT role opens another portal's route (e.g. Admin visits /student),
  // do NOT render the Sidebar or dashboard shell of the logged-in user's role.
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar
        userRole={userRole}
        userName={userName}
        userEmail={userEmail}
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
    </div>
  );
}

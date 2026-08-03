"use client";

import React, { useState } from "react";
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

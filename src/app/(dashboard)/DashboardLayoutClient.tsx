"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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

  // Stable session state populated from server layout initial props
  const [session, setSession] = useState<{ role: string; fullName: string; email: string }>({
    role: initialRole || "",
    fullName: initialName || "",
    email: initialEmail || "",
  });

  // Checked session flag - true immediately if initialRole was provided by server layout
  const [checkedSession, setCheckedSession] = useState<boolean>(Boolean(initialRole));
  const pathname = usePathname();
  const router = useRouter();

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
          } else if (isMounted && !initialRole) {
            setSession({ role: "", fullName: "", email: "" });
          }
        } else if (isMounted && !initialRole) {
          setSession({ role: "", fullName: "", email: "" });
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
  }, [initialRole]);

  const currentRole = (session.role || initialRole || "").toUpperCase();
  const currentName = session.fullName || initialName || "";
  const currentEmail = session.email || initialEmail || "";

  const isAdminRoute = !pathname || pathname.startsWith("/admin");
  const isStudentRoute = pathname?.startsWith("/student");
  const isFacultyRoute = pathname?.startsWith("/faculty");

  const isAdminUser = currentRole === "ADMIN" || currentRole === "SUPER_ADMIN" || currentRole === "SUPERADMIN";
  const isStudentUser = currentRole === "STUDENT";
  const isFacultyUser = currentRole === "FACULTY";

  const isSubAdminRoute = isAdminRoute && pathname !== "/admin";

  // Redirect unauthenticated users attempting to access respective sub-routes directly to their login page
  useEffect(() => {
    if (checkedSession) {
      if (isSubAdminRoute && !isAdminUser) {
        router.replace("/admin");
      } else if (isStudentRoute && pathname !== "/student" && !isStudentUser) {
        router.replace("/student");
      } else if (isFacultyRoute && pathname !== "/faculty" && !isFacultyUser) {
        router.replace("/faculty");
      }
    }
  }, [checkedSession, isSubAdminRoute, isAdminUser, isStudentRoute, isStudentUser, isFacultyRoute, isFacultyUser, pathname, router]);

  // Sidebar display condition:
  // Render sidebar immediately on sub-routes to avoid layout shifts or disappearing sidebars during hydration,
  // and let the useEffect hook handle unauthenticated redirects.
  const showSidebar =
    (isAdminRoute && pathname !== "/admin") ||
    (isStudentRoute && pathname !== "/student") ||
    (isFacultyRoute && pathname !== "/faculty");

  if (!showSidebar) {
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

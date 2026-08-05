"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  GraduationCap,
  Briefcase,
  Award,
  FileCheck,
  FileText,
  Code2,
  FolderGit2,
  Sparkles,
  Archive,
  ShieldAlert,
  BarChart3,
  LogOut,
  Layers,
  MessageSquareText,
  UserCheck,
  Smartphone,
  KeyRound,
  X,
} from "lucide-react";

interface SidebarProps {
  userRole: string;
  userName: string;
  userEmail: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  userRole,
  userName,
  userEmail,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();

  const adminNav = [
    { name: "Executive Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Central Report Center", href: "/admin/reports", icon: FileText },
    { name: "Take Attendance", href: "/admin/attendance", icon: UserCheck },
    { name: "Batches & Progression", href: "/admin/batches", icon: Layers },
    { name: "Student Master Directory", href: "/admin/master-records", icon: Users },
    { name: "Semester Subjects & Syllabus", href: "/admin/academics", icon: GraduationCap },
    { name: "Admin Verification Center", href: "/admin/verification", icon: FileCheck },
    { name: "Internship", href: "/admin/internships", icon: Briefcase },
    { name: "Certificates", href: "/admin/certificates", icon: FileCheck },
    { name: "Projects", href: "/admin/projects", icon: FolderGit2 },
    { name: "Placement", href: "/admin/placement", icon: Briefcase },
    { name: "Alumni Directory", href: "/admin/alumni", icon: GraduationCap },
    { name: "Notifications & Alerts", href: "/admin/notifications", icon: MessageSquareText },
    { name: "Department Setup", href: "/admin/departments", icon: Building2 },
    { name: "Account Settings", href: "/admin/settings", icon: KeyRound },
    { name: "System Audit Logs", href: "/admin/audit-logs", icon: ShieldAlert },
  ];

  const studentNav = [
    { name: "My Profile", href: "/student/profile", icon: Users },
    { name: "Attendance", href: "/student/attendance", icon: UserCheck },
    { name: "Academics / Syllabus", href: "/student/academics", icon: GraduationCap },
    { name: "Internships", href: "/student/internships", icon: Briefcase },
    { name: "Certificates", href: "/student/certificates", icon: FileCheck },
    { name: "Projects", href: "/student/projects", icon: FolderGit2 },
    { name: "Placements", href: "/student/placements", icon: Layers },
    { name: "Notifications", href: "/student/notifications", icon: MessageSquareText },
  ];

  const navItems = userRole === "STUDENT" ? studentNav : adminNav;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = userRole === "STUDENT" ? "/student" : "/admin";
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-screen fixed lg:sticky top-0 left-0 z-40 transition-transform duration-300 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 dark:text-white tracking-tight text-base leading-tight">
                  Student360 <span className="text-indigo-600 dark:text-indigo-400">AI</span>
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {userRole === "STUDENT" ? "Student Portal" : "Admin Panel"}
                </p>
              </div>
            </div>
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* User Role Badge */}
          <div className="px-3 py-2.5 mx-3 my-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/40">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {userRole.replace("_", " ")}
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {userName}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{userEmail}</div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1 max-h-[calc(100vh-270px)] overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sign Out */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

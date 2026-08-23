"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  GraduationCap,
  Briefcase,
  FileCheck,
  FileText,
  FolderGit2,
  Sparkles,
  ShieldAlert,
  LogOut,
  Layers,
  MessageSquareText,
  UserCheck,
  KeyRound,
  X,
  Bus,
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
    { name: "Student Master Directory", href: "/admin/master-records", icon: Users },
    { name: "Bus Management", href: "/admin/bus", icon: Bus },
    { name: "Semester Subjects & Syllabus", href: "/admin/academics", icon: GraduationCap },
    { name: "Admin Verification Center", href: "/admin/verification", icon: FileCheck },
    { name: "Internship", href: "/admin/internships", icon: Briefcase },
    { name: "Certificates", href: "/admin/certificates", icon: FileCheck },
    { name: "Projects", href: "/admin/projects", icon: FolderGit2 },
    { name: "Placement", href: "/admin/placement", icon: Briefcase },
    { name: "Alumni", href: "/admin/alumni", icon: GraduationCap },
    { name: "Notifications", href: "/admin/notifications", icon: MessageSquareText },
    { name: "Department Setup", href: "/admin/departments", icon: Building2 },
    { name: "Account Settings", href: "/admin/settings", icon: KeyRound },
    { name: "Audit Logs", href: "/admin/audit-logs", icon: ShieldAlert },
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

  const isStudentUser = userRole === "STUDENT";
  const navItems = isStudentUser ? studentNav : adminNav;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = isStudentUser ? "/student" : "/admin";
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
        className={`w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen fixed lg:sticky top-0 left-0 z-40 transition-transform duration-300 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 dark:text-white tracking-tight text-base leading-tight">
                  Student360 <span className="text-indigo-600 dark:text-indigo-400">AI</span>
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {isStudentUser ? "Student Portal" : "Admin Panel"}
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

          {/* User Role Badge Card */}
          <div className="px-3 py-2.5 mx-3 my-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/40 flex-shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {userRole ? userRole.replace("_", " ") : "USER"}
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {userName || "User"}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{userEmail}</div>
          </div>

          {/* Navigation Links List */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && item.href !== "/student" && pathname?.startsWith(item.href));
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

          {/* Sign Out Button */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

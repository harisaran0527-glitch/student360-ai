"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { StudentTimeline } from "@/components/dashboard/StudentTimeline";
import { StudentLoginForm } from "@/components/auth/StudentLoginForm";
import {
  GraduationCap,
  UserCheck,
  Briefcase,
  FileCheck,
  Award,
  FolderGit2,
  ArrowUpRight,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";

export default function StudentDashboardPage() {
  const [sessionUser, setSessionUser] = useState<any | null>(null);
  const [student, setStudent] = useState<any | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStudentData = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        setSessionUser(null);
        setAuthChecked(true);
        setLoading(false);
        return;
      }
      const meData = await meRes.json();
      setSessionUser(meData.user);
      setAuthChecked(true);

      if (meData.user?.role === "STUDENT" && meData.user?.studentProfile?.id) {
        const sRes = await fetch(`/api/students/${meData.user.studentProfile.id}`);
        const sData = await sRes.json();
        setStudent(sData.student || null);
      }
    } catch (err) {
      console.error(err);
      setSessionUser(null);
      setAuthChecked(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <Skeleton className="h-64 w-96 rounded-3xl" />
      </div>
    );
  }

  if (!sessionUser || sessionUser.role !== "STUDENT") {
    return <StudentLoginForm />;
  }

  if (!student) {
    return (
      <div className="p-8 text-center text-slate-400">
        Student profile not found. Please contact campus administration.
      </div>
    );
  }

  const attendances = student.attendances || [];
  const certificates = student.certificates || [];
  const internships = student.internships || [];
  const projects = student.projects || [];
  const placementRecords = student.placementRecords || [];

  const verifiedCertsCount = certificates.filter((c: any) => c.verificationStatus === "VERIFIED" || c.verificationStatus === "APPROVED").length;
  const totalPresent = attendances.filter((a: any) => a.status === "PRESENT").length;
  const totalAbsent = attendances.filter((a: any) => a.status === "ABSENT").length;
  const odCount = attendances.filter((a: any) => a.status === "OD").length;
  const internshipAttCount = attendances.filter((a: any) => a.status === "INTERNSHIP").length;
  const placementStatus = placementRecords[0]?.status || "ELIGIBLE";

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title={`Student Dashboard — ${student.fullName}`}
        subtitle={`Register No: ${student.registerNo} | Academic Year: ${student.academicYear} | Department of AI & ML`}
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Read-Only Identity Banner */}
        <div className="ui-card p-6 border-l-4 border-l-indigo-600 bg-gradient-to-r from-indigo-50/60 dark:from-indigo-950/40 to-slate-50 dark:to-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-500/20">
              {student.fullName[0]}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {student.fullName}
              </h1>
              <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 font-semibold">
                Register No: {student.registerNo} | Roll No: {student.rollNo || "N/A"}
              </p>
              <div className="flex flex-wrap gap-2 mt-2.5">
                <Badge variant="purple">Dept: AI & ML</Badge>
                <Badge variant="info">Academic Year: {student.academicYear}</Badge>
                <Badge variant="info">Batch: {student.batch?.name || "N/A"}</Badge>
                <Badge variant="info">Semester: {student.currentSemester}</Badge>
                <Badge variant="success">Quota: {student.admissionQuota || "Regular"}</Badge>
                <Badge variant="warning">Status: {student.academicStatus}</Badge>
              </div>
            </div>
          </div>

          <Link
            href="/student/profile"
            className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>View My Profile</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Primary Read-Only Attendance & Academic Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Overall Attendance"
            value={`${student.attendancePercentage}%`}
            subtitle={`Present: ${totalPresent} | Absent: ${totalAbsent}`}
            icon={UserCheck}
            color={student.attendancePercentage < 75 ? "rose" : "emerald"}
          />
          <StatCard
            title="OD / On-Duty Count"
            value={odCount}
            subtitle="Official Approved Leaves"
            icon={CalendarDays}
            color="sky"
          />
          <StatCard
            title="Internship Attendance"
            value={internshipAttCount}
            subtitle="Industrial Deputation Days"
            icon={Briefcase}
            color="indigo"
          />
          <StatCard
            title="Placement Status"
            value={placementStatus}
            subtitle="Current Placement Record"
            icon={Award}
            color="purple"
          />
        </div>

        {/* Secondary Read-Only Portfolio Counts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/student/certificates" className="ui-card ui-card-hover p-5 space-y-2 block">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 w-fit">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Total Certificates</h3>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {certificates.length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {verifiedCertsCount} officially verified by Admin.
            </p>
          </Link>

          <Link href="/student/internships" className="ui-card ui-card-hover p-5 space-y-2 block">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 w-fit">
              <Briefcase className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Total Internships</h3>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {internships.length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Industry engagements recorded by Admin.
            </p>
          </Link>

          <Link href="/student/projects" className="ui-card ui-card-hover p-5 space-y-2 block">
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 w-fit">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Total Projects</h3>
            <p className="text-2xl font-black text-sky-600 dark:text-sky-400">
              {projects.length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Capstone & research project showcases.
            </p>
          </Link>
        </div>

        {/* Read-Only Timeline */}
        <StudentTimeline
          currentSemester={student.currentSemester}
          academicStatus={student.academicStatus}
          admissionDate={student.admissionDate}
          studentRecords={{
            academicRecords: student.academicRecords || [],
            attendances: student.attendances || [],
            internships: student.internships || [],
            certificates: student.certificates || [],
            achievements: student.achievements || [],
            projects: student.projects || [],
          }}
        />
      </div>
    </div>
  );
}

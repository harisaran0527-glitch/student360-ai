"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Printer, Download, FileText, CheckSquare, Sparkles } from "lucide-react";

export default function StudentResumePage() {
  const [resumeData, setResumeData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Sections toggle state
  const [sections, setSections] = useState({
    profile: true,
    education: true,
    skills: true,
    projects: true,
    internships: true,
    certificates: true,
    achievements: true,
  });

  const fetchResume = async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();

      if (meData.user?.studentProfile) {
        const res = await fetch(`/api/resume?studentId=${meData.user.studentProfile.id}`);
        const data = await res.json();
        setResumeData(data.resumeData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResume();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-8 space-y-6">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const p = resumeData?.profileSummary;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="print:hidden">
        <Header
          title="Institutional Auto Resume Builder"
          subtitle="Generate print-friendly resumes populated strictly from verified Student360 AI institutional records"
        />
      </div>

      <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
        {/* Controls Bar (Hidden during print) */}
        <div className="ui-card p-4 space-y-4 print:hidden">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-600" />
              <span>Select Verified Sections to Include</span>
            </h3>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            {Object.keys(sections).map((key) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer font-semibold capitalize text-slate-700">
                <input
                  type="checkbox"
                  checked={(sections as any)[key]}
                  onChange={(e) => setSections({ ...sections, [key]: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>{key}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Clean Print-Friendly Resume Sheet */}
        <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 space-y-6 print:shadow-none print:border-none print:p-0">
          {/* Header */}
          {sections.profile && p && (
            <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider">{p.fullName}</h1>
              <p className="text-xs font-semibold text-slate-700">
                Register No: {p.registerNo} | B.E. {p.department} | CGPA: {p.cgpa}
              </p>
              <p className="text-xs text-slate-600">
                Email: {p.email} | Phone: {p.phone}
              </p>
            </div>
          )}

          {/* Verified Education */}
          {sections.education && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider border-b border-slate-300 pb-1 text-indigo-700">
                Education
              </h2>
              {resumeData?.education.map((e: any, i: number) => (
                <div key={i} className="flex justify-between text-xs font-semibold">
                  <div>
                    <span>{e.degree}</span> - <span>{e.institution}</span>
                  </div>
                  <span>CGPA: {e.cgpa}</span>
                </div>
              ))}
            </div>
          )}

          {/* Verified Skills */}
          {sections.skills && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider border-b border-slate-300 pb-1 text-indigo-700">
                Verified Technical Skills
              </h2>
              <div className="flex flex-wrap gap-2 text-xs">
                {resumeData?.verifiedSkills.map((s: any) => (
                  <span key={s.name} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-semibold text-[11px]">
                    {s.name} ({s.category})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Verified Projects */}
          {sections.projects && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider border-b border-slate-300 pb-1 text-indigo-700">
                Verified Projects
              </h2>
              {resumeData?.verifiedProjects.map((proj: any, i: number) => (
                <div key={i} className="space-y-1 text-xs">
                  <div className="font-bold">{proj.title}</div>
                  <p className="text-slate-600">{proj.description}</p>
                  <div className="text-[11px] font-mono text-indigo-600">Tech Stack: {proj.techStack}</div>
                </div>
              ))}
            </div>
          )}

          {/* Verified Internships */}
          {sections.internships && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider border-b border-slate-300 pb-1 text-indigo-700">
                Verified Industry Internships
              </h2>
              {resumeData?.verifiedInternships.map((intern: any, i: number) => (
                <div key={i} className="space-y-1 text-xs">
                  <div className="flex justify-between font-bold">
                    <span>{intern.company} - {intern.role}</span>
                    <span>{intern.dates}</span>
                  </div>
                  <p className="text-slate-600">{intern.summary}</p>
                </div>
              ))}
            </div>
          )}

          {/* Verified Certifications */}
          {sections.certificates && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider border-b border-slate-300 pb-1 text-indigo-700">
                Verified Certifications
              </h2>
              {resumeData?.verifiedCertifications.map((c: any, i: number) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="font-bold">{c.title} ({c.issuingBody})</span>
                  <span>{c.issueDate}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

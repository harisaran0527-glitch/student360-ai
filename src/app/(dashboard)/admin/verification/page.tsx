"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import {
  FileCheck,
  Briefcase,
  FolderGit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

export default function AdminVerificationCenterPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("2025-2026");
  const [activeTab, setActiveTab] = useState<"CERTIFICATES" | "INTERNSHIPS" | "PROJECTS">("CERTIFICATES");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const [certificates, setCertificates] = useState<any[]>([]);
  const [internships, setInternships] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [targetItem, setTargetItem] = useState<{ type: "CERTIFICATE" | "INTERNSHIP" | "PROJECT"; record: any } | null>(null);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | "NEEDS_CHANGES">("APPROVED");
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchVerificationQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/verification?academicYear=${selectedAcademicYear}&status=${selectedStatus}`);
      const json = await res.json();
      const data = json.data || json;

      setCertificates(data.certificates || []);
      setInternships(data.internships || []);
      setProjects(data.projects || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/academic-years", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((resData) => {
        const years = resData.data?.academicYears || resData.academicYears || [];
        setAcademicYears(years);
        const saved = typeof window !== "undefined" ? localStorage.getItem("selected_academic_year") : null;
        if (saved && years.some((y: any) => y.yearCode === saved)) {
          setSelectedAcademicYear(saved);
        } else if (resData.currentYearCode && years.some((y: any) => y.yearCode === resData.currentYearCode)) {
          setSelectedAcademicYear(resData.currentYearCode);
        } else if (years.length > 0) {
          setSelectedAcademicYear(years[0].yearCode);
        }
      })
      .catch((e) => console.error(e));

    const handleAYChange = (e: any) => {
      if (e.detail?.academicYear) setSelectedAcademicYear(e.detail.academicYear);
    };
    window.addEventListener("academicYearChanged", handleAYChange);
    return () => window.removeEventListener("academicYearChanged", handleAYChange);
  }, []);

  useEffect(() => {
    fetchVerificationQueue();
  }, [selectedAcademicYear, selectedStatus]);

  const handleOpenReview = (type: "CERTIFICATE" | "INTERNSHIP" | "PROJECT", record: any) => {
    setTargetItem({ type, record });
    setDecision("APPROVED");
    setReviewNotes("");
    setReviewModalOpen(true);
  };

  const handleExecuteDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetItem) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: targetItem.type,
          recordId: targetItem.record.id,
          status: decision === "APPROVED" ? (targetItem.type === "INTERNSHIP" ? "APPROVED" : "APPROVED") : decision,
          notes: reviewNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Verification failed");

      alert("Admin verification decision recorded successfully!");
      setReviewModalOpen(false);
      fetchVerificationQueue();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="Admin Verification Center — AI & ML Department"
        subtitle={`Academic Year: ${selectedAcademicYear} Context | Review & Validate Certificates, Internships & Projects`}
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Controls & Filter Bar */}
        <div className="ui-card p-4 rounded-2xl bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-slate-500">Selected Academic Year:</span>
            <select
              value={selectedAcademicYear}
              onChange={(e) => {
                setSelectedAcademicYear(e.target.value);
                localStorage.setItem("selected_academic_year", e.target.value);
              }}
              className="ui-input py-1.5 px-3 font-bold text-indigo-600"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.yearCode}>
                  Academic Year {ay.yearCode} {ay.isCurrent ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-500">Status Filter:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="ui-input py-1.5 px-3"
            >
              <option value="ALL">All Submissions</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved / Verified</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("CERTIFICATES")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "CERTIFICATES"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Certificates ({certificates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("INTERNSHIPS")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "INTERNSHIPS"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Internships ({internships.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("PROJECTS")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "PROJECTS"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
            }`}
          >
            <FolderGit2 className="w-4 h-4" />
            <span>Projects ({projects.length})</span>
          </button>
        </div>

        {/* Queue Table */}
        <div className="ui-card rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm p-6 space-y-4">
          {loading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ) : activeTab === "CERTIFICATES" ? (
            certificates.length === 0 ? (
              <EmptyState
                title="No Certificate Submissions"
                description={`No certificates found in the queue for Academic Year ${selectedAcademicYear}.`}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3.5">Register No</th>
                      <th className="p-3.5">Student Name</th>
                      <th className="p-3.5">Certificate Title</th>
                      <th className="p-3.5">Issuing Body</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {certificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono font-bold text-indigo-600">{cert.student?.registerNo}</td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">{cert.student?.fullName}</td>
                        <td className="p-3.5 font-bold">{cert.title}</td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400">{cert.issuingBody}</td>
                        <td className="p-3.5">
                          <Badge variant={cert.verificationStatus === "APPROVED" ? "success" : "warning"}>
                            {cert.verificationStatus}
                          </Badge>
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={() => handleOpenReview("CERTIFICATE", cert)}
                            className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[11px]"
                          >
                            Review & Verify
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === "INTERNSHIPS" ? (
            internships.length === 0 ? (
              <EmptyState
                title="No Internship Submissions"
                description={`No internships found in the queue for Academic Year ${selectedAcademicYear}.`}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3.5">Register No</th>
                      <th className="p-3.5">Student Name</th>
                      <th className="p-3.5">Company & Role</th>
                      <th className="p-3.5">Dates</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {internships.map((int) => (
                      <tr key={int.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono font-bold text-indigo-600">{int.student?.registerNo}</td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">{int.student?.fullName}</td>
                        <td className="p-3.5">
                          <div className="font-bold">{int.companyName}</div>
                          <div className="text-[11px] text-slate-500">{int.role}</div>
                        </td>
                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                          {int.startDate} to {int.endDate}
                        </td>
                        <td className="p-3.5">
                          <Badge variant={int.status === "COMPLETED" || int.status === "APPROVED" ? "success" : "info"}>
                            {int.status}
                          </Badge>
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={() => handleOpenReview("INTERNSHIP", int)}
                            className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[11px]"
                          >
                            Review & Verify
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : projects.length === 0 ? (
            <EmptyState
              title="No Project Submissions"
              description={`No projects found in the queue for Academic Year ${selectedAcademicYear}.`}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3.5">Register No</th>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Project Title</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {projects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono font-bold text-indigo-600">{proj.student?.registerNo}</td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">{proj.student?.fullName}</td>
                      <td className="p-3.5 font-bold">{proj.title}</td>
                      <td className="p-3.5 font-semibold text-slate-600 dark:text-slate-400">{proj.projectType}</td>
                      <td className="p-3.5">
                        <Badge variant="success">{proj.status}</Badge>
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => handleOpenReview("PROJECT", proj)}
                          className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[11px]"
                        >
                          Review & Verify
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {targetItem && (
        <Modal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title={`Admin Verification Decision — ${targetItem.type}`}
          maxWidth="md"
        >
          <form onSubmit={handleExecuteDecision} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
              <div>Student: <strong>{targetItem.record.student?.fullName} ({targetItem.record.student?.registerNo})</strong></div>
              <div>Item: <strong>{targetItem.record.title || targetItem.record.companyName}</strong></div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Verification Decision *</label>
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value as any)}
                className="ui-input w-full p-2 font-bold text-indigo-600"
              >
                <option value="APPROVED">APPROVE / VERIFY</option>
                <option value="NEEDS_CHANGES">REQUEST CHANGES</option>
                <option value="REJECTED">REJECT</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reviewer Notes / Feedback</label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter feedback or admin approval notes..."
                className="ui-input w-full p-2"
              />
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setReviewModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 font-semibold">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-md">
                {submitting ? "Saving..." : "Confirm Decision"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

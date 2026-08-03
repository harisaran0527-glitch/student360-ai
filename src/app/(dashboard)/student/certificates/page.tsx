"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  FileCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  ExternalLink,
  Upload,
  LayoutGrid,
  List,
} from "lucide-react";

export default function StudentCertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  // Filter states
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    category: "Certification",
    issuingBody: "",
    issueDate: new Date().toISOString().split("T")[0],
    startDate: "",
    endDate: "",
    academicYearCode: "2025-2026",
    semester: 1,
    mode: "ONLINE",
    location: "",
    certificateNo: "",
    documentUrl: "",
    externalLink: "",
    skillsGained: "",
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();

      if (meData.user?.studentProfile) {
        setStudentId(meData.user.studentProfile.id);
        const res = await fetch(`/api/certificates?studentId=${meData.user.studentProfile.id}`);
        const data = await res.json();
        setCertificates(data.certificates || []);
      }
    } catch (err) {
      console.error("Failed to load certificates", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  // Handle Document Upload
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/upload/certificate", {
        method: "POST",
        body: uploadData,
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message || data.error || "Upload failed");

      setFormData((prev) => ({ ...prev, documentUrl: data.data?.documentUrl || data.url }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Submit Certificate
  const handleSubmitCertificate = async (e: React.FormEvent, allowDuplicate = false) => {
    e.preventDefault();
    if (!studentId || !formData.documentUrl) {
      alert("Please upload your certificate document file first.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          studentId,
          allowDuplicate,
        }),
      });

      const data = await res.json();
      if (res.status === 409 && data.isDuplicate) {
        setDuplicateWarning(data.warning);
        setSubmitting(false);
        return;
      }

      if (!res.ok) throw new Error(data.error || "Submission failed");

      alert("Certificate submitted successfully! Sent to faculty queue for verification.");
      setIsSubmitModalOpen(false);
      setDuplicateWarning(null);
      fetchCertificates();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered List
  const filteredCertificates = certificates.filter((c) => {
    if (activeTab === "verified" && c.verificationStatus !== "APPROVED") return false;
    if (activeTab === "pending" && c.verificationStatus !== "PENDING") return false;
    if (activeTab === "correction" && c.verificationStatus !== "NEEDS_CHANGES") return false;
    if (activeTab === "rejected" && c.verificationStatus !== "REJECTED") return false;
    if (selectedCategory && c.category !== selectedCategory) return false;
    if (search) {
      const term = search.toLowerCase();
      if (!c.title.toLowerCase().includes(term) && !c.issuingBody.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Student Permanent Digital Certificate Vault"
        subtitle="Upload institutional certifications, verified co-curricular credentials & tamper-proof portfolio storage"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Actions Bar */}
        <div className="ui-card p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Certificate Title, Issuing Body, Skills..."
                className="ui-input w-full pl-9 pr-4 py-2 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setViewMode("card")}
                  className={`p-1.5 rounded-lg text-xs font-semibold ${viewMode === "card" ? "bg-white dark:bg-slate-900 shadow text-indigo-600" : "text-slate-500"}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg text-xs font-semibold ${viewMode === "list" ? "bg-white dark:bg-slate-900 shadow text-indigo-600" : "text-slate-500"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <Tabs
            tabs={[
              { id: "all", label: "All Credentials", count: certificates.length },
              { id: "verified", label: "Verified Badges", count: certificates.filter((c) => c.verificationStatus === "APPROVED").length },
              { id: "pending", label: "Pending Verification", count: certificates.filter((c) => c.verificationStatus === "PENDING").length },
              { id: "correction", label: "Needs Correction", count: certificates.filter((c) => c.verificationStatus === "NEEDS_CHANGES").length },
              { id: "rejected", label: "Rejected", count: certificates.filter((c) => c.verificationStatus === "REJECTED").length },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {/* Display Grid / List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : filteredCertificates.length === 0 ? (
          <EmptyState
            title="No Certificates Available"
            description="No certificates have been added by Admin."
          />
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCertificates.map((c) => (
              <div key={c.id} className="ui-card p-5 space-y-3 relative flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="purple">{c.category}</Badge>
                    <Badge
                      variant={
                        c.verificationStatus === "APPROVED"
                          ? "success"
                          : c.verificationStatus === "PENDING"
                          ? "warning"
                          : "danger"
                      }
                    >
                      {c.verificationStatus === "APPROVED" ? "★ VERIFIED" : c.verificationStatus}
                    </Badge>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                    {c.title}
                  </h3>
                  <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                    Issued by: {c.issuingBody} ({c.issueDate})
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                    <div>Term: <strong>Sem {c.semester} ({c.academicYearCode})</strong></div>
                    <div>Skills: <strong className="text-slate-800 dark:text-slate-200">{c.skillsGained || "N/A"}</strong></div>
                  </div>

                  {c.reviewerNotes && (
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-medium border border-amber-200">
                      Feedback: {c.reviewerNotes}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                  <button
                    onClick={() => setPreviewDocUrl(`/api/certificates/${c.id}/download`)}
                    className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View / Download Document</span>
                  </button>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {c.id.slice(0, 8)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ui-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b font-semibold text-slate-500 uppercase">
                  <th className="p-3">Title & Category</th>
                  <th className="p-3">Issuing Organization</th>
                  <th className="p-3">Issue Date</th>
                  <th className="p-3">Verification Status</th>
                  <th className="p-3 text-right">Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredCertificates.map((c) => (
                  <tr key={c.id}>
                    <td className="p-3">
                      <span className="font-bold text-slate-900 dark:text-white block">{c.title}</span>
                      <Badge variant="purple">{c.category}</Badge>
                    </td>
                    <td className="p-3 font-semibold text-indigo-600">{c.issuingBody}</td>
                    <td className="p-3">{c.issueDate}</td>
                    <td className="p-3">
                      <Badge variant={c.verificationStatus === "APPROVED" ? "success" : "warning"}>
                        {c.verificationStatus === "APPROVED" ? "★ VERIFIED" : c.verificationStatus}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => setPreviewDocUrl(c.documentUrl)} className="text-indigo-600 font-semibold hover:underline">
                        View File
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Certificate Modal */}
      <Modal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} title="Submit Certificate for Verification" maxWidth="2xl">
        <form onSubmit={(e) => handleSubmitCertificate(e, Boolean(duplicateWarning))} className="space-y-4 text-xs">
          {duplicateWarning && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Duplicate Submission Pre-flight Warning</span>
              </div>
              <p>{duplicateWarning}</p>
              <button
                type="button"
                onClick={(e) => handleSubmitCertificate(e, true)}
                className="px-3 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px]"
              >
                Proceed & Submit Anyway
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Certificate Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="ui-input w-full p-2"
                placeholder="e.g. AWS Certified Solutions Architect"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="ui-input w-full p-2 font-semibold"
              >
                {[
                  "Internship",
                  "Online Course",
                  "Certification",
                  "Workshop",
                  "Hackathon",
                  "Symposium",
                  "Paper Presentation",
                  "Conference",
                  "Technical Competition",
                  "Coding Contest",
                  "Project Expo",
                  "Sports",
                  "Cultural Activity",
                  "Club Activity",
                  "Volunteer / NSS / NCC",
                  "Leadership",
                  "Patent / Publication",
                  "Award",
                  "Other",
                ].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Issuing Body / Organization *</label>
              <input
                type="text"
                required
                value={formData.issuingBody}
                onChange={(e) => setFormData({ ...formData, issuingBody: e.target.value })}
                className="ui-input w-full p-2"
                placeholder="e.g. Amazon Web Services / NPTEL"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Issue Date *</label>
              <input
                type="date"
                required
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                className="ui-input w-full p-2 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Skills Gained</label>
            <input
              type="text"
              value={formData.skillsGained}
              onChange={(e) => setFormData({ ...formData, skillsGained: e.target.value })}
              className="ui-input w-full p-2"
              placeholder="e.g. Cloud Architecture, Docker, Kubernetes"
            />
          </div>

          {/* Upload Button */}
          <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-2">
            <Upload className="w-6 h-6 text-indigo-600 mx-auto" />
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {formData.documentUrl ? "✓ File Uploaded Successfully!" : "Upload Certificate Document (PDF, PNG, JPG - 10MB Max)"}
            </div>
            <input
              type="file"
              accept=".pdf, .png, .jpg, .jpeg, .webp"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0]);
              }}
              className="hidden"
              id="cert-file-input"
            />
            <label htmlFor="cert-file-input" className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs cursor-pointer inline-block">
              {uploading ? "Uploading..." : "Select Document File"}
            </label>
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={() => setIsSubmitModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md">
              {submitting ? "Submitting..." : "Submit for Faculty Verification"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Document Inspector Modal */}
      {previewDocUrl && (
        <Modal isOpen={Boolean(previewDocUrl)} onClose={() => setPreviewDocUrl(null)} title="Certificate Preview" maxWidth="3xl">
          <div className="space-y-4">
            {previewDocUrl.endsWith(".pdf") ? (
              <iframe src={previewDocUrl} className="w-full h-96 rounded-xl border" />
            ) : (
              <img src={previewDocUrl} alt="Certificate File" className="w-full max-h-96 object-contain rounded-xl border" />
            )}
            <div className="flex justify-between items-center text-xs">
              <a href={previewDocUrl} target="_blank" download className="text-indigo-600 font-semibold underline flex items-center gap-1">
                <span>Download File</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button onClick={() => setPreviewDocUrl(null)} className="px-4 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-semibold">Close</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

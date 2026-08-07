"use client";

import React, { useState, useEffect, useRef } from "react";
import { Header } from "@/components/dashboard/Header";
import { ACADEMIC_YEAR_OPTIONS, DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { getAcademicOptions } from "@/lib/clientOptionsCache";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteManagementPanel } from "@/components/ui/DeleteManagementPanel";
import {
  FileCheck,
  Plus,
  Building2,
  Calendar,
  ExternalLink,
  Award,
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  Archive,
} from "lucide-react";

export default function AdminCertificatesPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(DEFAULT_ACADEMIC_YEAR);

  const [certificates, setCertificates] = useState<any[]>([]);
  const [yearStudents, setYearStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals & Upload State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  // Replace File Modal
  const [replaceTarget, setReplaceTarget] = useState<any | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replacePreview, setReplacePreview] = useState<string | null>(null);
  const [replacing, setReplacing] = useState<boolean>(false);

  // Lightbox Preview Modal
  const [previewCert, setPreviewCert] = useState<any | null>(null);

  // Form Fields
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<string>("Certification");
  const [issuingBody, setIssuingBody] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [skillsGained, setSkillsGained] = useState<string>("");

  // Selected File State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadedDocMeta, setUploadedDocMeta] = useState<{
    documentUrl: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const certRes = await fetch(`/api/certificates?academicYear=${selectedAcademicYear}`, {
        headers: { "Cache-Control": "no-store" },
      });
      const certData = await certRes.json();
      setCertificates(certData.data?.certificates || certData.certificates || []);

      const studRes = await fetch(`/api/students/options?academicYear=${selectedAcademicYear}`, {
        headers: { "Cache-Control": "no-store" },
      });
      const studData = await studRes.json();
      setYearStudents(studData.data?.students || studData.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAcademicOptions()
      .then((opts) => {
        const years = opts.academicYears || [];
        setAcademicYears(years);
        const saved = typeof window !== "undefined" ? localStorage.getItem("selected_academic_year") : null;
        if (saved && years.some((y: any) => y.yearCode === saved)) {
          setSelectedAcademicYear(saved);
        } else if (opts.currentYearCode && years.some((y: any) => y.yearCode === opts.currentYearCode)) {
          setSelectedAcademicYear(opts.currentYearCode);
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
    fetchData();
  }, [selectedAcademicYear]);

  // Handle File Selection
  const handleFileChange = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      setImagePreviewUrl(null);
      return;
    }

    // Validation 1: Size check (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10 MB. Please select a smaller file.");
      return;
    }

    // Validation 2: MIME / Extension check
    const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExts.includes(ext)) {
      alert("Invalid file format. Please select a JPG, JPEG, PNG, WEBP, or PDF file.");
      return;
    }

    setSelectedFile(file);

    // Create thumbnail preview if image
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    } else {
      setImagePreviewUrl(null);
    }
  };

  // Upload File to Server
  const uploadSelectedFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload/certificate", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.message || data.error || "File upload failed");
    }

    return data.data;
  };

  const handleAddCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || submitting) {
      alert("Please select a student belonging to Academic Year " + selectedAcademicYear);
      return;
    }

    if (!selectedFile) {
      alert("Please upload the certificate photo or PDF file.");
      return;
    }

    setSubmitting(true);
    setUploading(true);

    try {
      // 1. Upload File first
      const fileMeta = await uploadSelectedFile(selectedFile);

      // 2. Save Certificate DB Record
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          academicYearCode: selectedAcademicYear,
          title,
          category,
          issuingBody,
          issueDate: issueDate || new Date().toISOString().split("T")[0],
          documentUrl: fileMeta.documentUrl,
          fileName: fileMeta.fileName,
          mimeType: fileMeta.mimeType,
          fileSize: fileMeta.fileSize,
          skillsGained,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "Failed to add certificate record");
      }

      alert("Certificate photo/file uploaded and record saved successfully!");
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      alert("Upload Error: " + err.message);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceTarget || !replaceFile || replacing) return;

    setReplacing(true);
    try {
      const fileMeta = await uploadSelectedFile(replaceFile);

      const res = await fetch(`/api/certificates/${replaceTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentUrl: fileMeta.documentUrl,
          fileName: fileMeta.fileName,
          mimeType: fileMeta.mimeType,
          fileSize: fileMeta.fileSize,
          uploadedAt: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "Failed to replace certificate file");
      }

      alert("Certificate file replaced successfully!");
      setReplaceTarget(null);
      setReplaceFile(null);
      setReplacePreview(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReplacing(false);
    }
  };

  const handleArchive = async (certId: string) => {
    if (!confirm("Are you sure you want to archive/delete this certificate record and file?")) return;

    try {
      const res = await fetch(`/api/certificates/${certId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "Failed to delete certificate");
      }
      alert("Certificate record deleted successfully.");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setSelectedStudentId("");
    setTitle("");
    setIssuingBody("");
    setIssueDate("");
    setSkillsGained("");
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setUploadedDocMeta(null);
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return Math.round(bytes / 1024) + " KB";
  };

  const isPDF = (mime?: string, url?: string) => {
    return mime === "application/pdf" || (url && url.toLowerCase().endsWith(".pdf"));
  };

  // Delete Management Panel State
  const [isDeletePanelOpen, setIsDeletePanelOpen] = useState<boolean>(false);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="Certificates Vault — AI & ML Department"
        subtitle={`Academic Year: ${selectedAcademicYear} Context | Upload & View Certificate Verification Documents`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Certificate</span>
            </button>

            <button
              onClick={() => setIsDeletePanelOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Delete Certificate</span>
            </button>

            <button
              onClick={() => (window.location.href = "/admin/archive")}
              className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Archive className="w-4 h-4" />
              <span>Archived Certificates</span>
            </button>
          </div>
        }
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Academic Year Selector Bar */}
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

          <button
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Certificate</span>
          </button>
        </div>

        {/* Certificates Table */}
        <div className="ui-card rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              <span>Certificates for Academic Year {selectedAcademicYear} ({certificates.length} Records)</span>
            </h3>
            <Badge variant="purple">Year-Wise Context</Badge>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ) : certificates.length === 0 ? (
            <EmptyState
              title={`No Certificates Recorded for Academic Year ${selectedAcademicYear}`}
              description="Click '+ Add Certificate' below to upload certificate documents for students."
              action={
                <button
                  onClick={() => {
                    resetForm();
                    setModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Certificate</span>
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3.5">Document Preview</th>
                    <th className="p-3.5">Register No</th>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Certificate Title</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Issuing Organization</th>
                    <th className="p-3.5">Issue Date</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {certificates.map((cert) => {
                    const certIsPdf = isPDF(cert.mimeType, cert.documentUrl);
                    return (
                      <tr key={cert.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        {/* Document Thumbnail / Icon */}
                        <td className="p-3.5">
                          <div
                            onClick={() => setPreviewCert(cert)}
                            className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center cursor-pointer overflow-hidden group relative hover:border-indigo-500 transition"
                            title="Click to view full preview"
                          >
                            {certIsPdf ? (
                              <div className="flex flex-col items-center justify-center p-1 text-rose-600 dark:text-rose-400">
                                <FileText className="w-6 h-6" />
                                <span className="text-[9px] font-black tracking-tighter uppercase mt-0.5">PDF</span>
                              </div>
                            ) : (
                              <img
                                src={cert.documentUrl}
                                alt={cert.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {cert.student?.registerNo || "N/A"}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          {cert.student?.fullName || "N/A"}
                        </td>
                        <td className="p-3.5 font-bold">{cert.title}</td>
                        <td className="p-3.5">
                          <Badge variant="purple">{cert.category}</Badge>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                          {cert.issuingBody}
                        </td>
                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">{cert.issueDate}</td>

                        {/* Action Buttons */}
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setPreviewCert(cert)}
                              className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-bold flex items-center gap-1 text-[11px]"
                              title="Preview Certificate"
                            >
                              <Eye className="w-3.5 h-3.5" /> Preview
                            </button>

                            <a
                              href={`/api/certificates/${cert.id}/download?download=true`}
                              download
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 font-bold flex items-center gap-1 text-[11px]"
                              title="Download Official File"
                            >
                              <Download className="w-3.5 h-3.5" /> Download
                            </a>

                            <button
                              onClick={() => setReplaceTarget(cert)}
                              className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100 font-bold flex items-center gap-1 text-[11px]"
                              title="Replace File"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Replace
                            </button>

                            <button
                              onClick={() => handleArchive(cert.id)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Archive Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Certificate Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Add Certificate Document — AY ${selectedAcademicYear}`} maxWidth="lg">
        <form onSubmit={handleAddCertificate} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Student (Academic Year {selectedAcademicYear} ONLY) *
            </label>
            <select
              required
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="ui-input w-full p-2"
            >
              <option value="">-- Choose Student --</option>
              {yearStudents.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.registerNo} — {st.fullName} ({st.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Certificate Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. AWS Certified Machine Learning Specialist"
                className="ui-input w-full p-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Issuing Organization *</label>
              <input
                type="text"
                required
                value={issuingBody}
                onChange={(e) => setIssuingBody(e.target.value)}
                placeholder="e.g. Amazon Web Services / Coursera"
                className="ui-input w-full p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="ui-input w-full p-2">
                <option value="Certification">Certification</option>
                <option value="Course Completion">Course Completion</option>
                <option value="Workshop">Workshop</option>
                <option value="Hackathon">Hackathon</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Issue Date *</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="ui-input w-full p-2"
              />
            </div>
          </div>

          {/* Certificate Photo / File Upload Dropzone */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Upload Certificate Photo / Document File (Max 10 MB: JPG, PNG, WEBP, PDF) *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 text-center cursor-pointer transition space-y-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  Click to Choose File or Drag & Drop Certificate
                </div>
                <div className="text-[11px] text-slate-500">
                  Supported formats: <strong>JPG, JPEG, PNG, WEBP, PDF</strong> (Maximum size: 10 MB)
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedFile.type === "application/pdf" ? (
                      <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold text-xs">
                        PDF
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white truncate max-w-xs">
                        {selectedFile.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Size: <strong>{formatSize(selectedFile.size)}</strong> | Type: <strong>{selectedFile.type}</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleFileChange(null)}
                    className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 hover:bg-rose-200"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Live Image Preview Thumbnail */}
                {imagePreviewUrl && (
                  <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900">
                    <span className="text-[10px] font-bold text-indigo-600 block mb-1">
                      Certificate Photo Preview (Aspect Ratio Preserved):
                    </span>
                    <div className="max-h-48 overflow-hidden rounded-xl border border-indigo-200 dark:border-indigo-800 bg-slate-900 flex justify-center p-1">
                      <img
                        src={imagePreviewUrl}
                        alt="Preview"
                        className="max-h-44 object-contain rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Notes / Skills Gained</label>
            <input
              type="text"
              value={skillsGained}
              onChange={(e) => setSkillsGained(e.target.value)}
              placeholder="e.g. PyTorch, Computer Vision, Model Deployment"
              className="ui-input w-full p-2"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploading || !selectedFile || yearStudents.length === 0}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? "Uploading & Saving..." : "Save Certificate & Upload File"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Replace File Modal */}
      {replaceTarget && (
        <Modal isOpen={Boolean(replaceTarget)} onClose={() => setReplaceTarget(null)} title={`Replace Certificate File — ${replaceTarget.title}`}>
          <form onSubmit={handleReplaceSubmit} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Current File:</span>
              <div className="font-mono text-indigo-600 dark:text-indigo-400">{replaceTarget.fileName || replaceTarget.documentUrl}</div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Choose New Certificate Photo / File (Max 10 MB) *
              </label>
              <input
                ref={replaceFileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (f) {
                    if (f.size > 10 * 1024 * 1024) {
                      alert("File size exceeds 10 MB limit.");
                      return;
                    }
                    setReplaceFile(f);
                    if (f.type.startsWith("image/")) {
                      setReplacePreview(URL.createObjectURL(f));
                    } else {
                      setReplacePreview(null);
                    }
                  }
                }}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => replaceFileInputRef.current?.click()}
                className="ui-input w-full p-3 font-bold text-indigo-600 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>{replaceFile ? replaceFile.name : "Select Replacement File"}</span>
              </button>

              {replacePreview && (
                <div className="mt-3 p-2 bg-slate-900 rounded-xl flex justify-center">
                  <img src={replacePreview} alt="Replacement Preview" className="max-h-40 object-contain rounded-lg" />
                </div>
              )}
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setReplaceTarget(null)} className="px-4 py-2 rounded-xl bg-slate-100 font-semibold">
                Cancel
              </button>
              <button type="submit" disabled={!replaceFile || replacing} className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-md">
                {replacing ? "Replacing..." : "Replace File"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Lightbox Full Preview Modal */}
      {previewCert && (
        <Modal isOpen={Boolean(previewCert)} onClose={() => setPreviewCert(null)} title={`Certificate Preview — ${previewCert.title}`} maxWidth="2xl">
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{previewCert.title}</h4>
                <div className="text-slate-500">
                  Student: <strong>{previewCert.student?.fullName}</strong> ({previewCert.student?.registerNo}) | Issued by: <strong>{previewCert.issuingBody}</strong>
                </div>
              </div>
              <a
                href={`/api/certificates/${previewCert.id}/download?download=true`}
                download
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </div>

            <div className="p-2 rounded-2xl bg-slate-950 flex justify-center items-center min-h-[300px]">
              {isPDF(previewCert.mimeType, previewCert.documentUrl) ? (
                <iframe
                  src={`/api/certificates/${previewCert.id}/download`}
                  className="w-full h-[500px] rounded-xl border border-slate-800"
                  title="PDF Certificate Document"
                />
              ) : (
                <img
                  src={`/api/certificates/${previewCert.id}/download`}
                  alt={previewCert.title}
                  className="max-h-[600px] object-contain rounded-xl shadow-2xl"
                />
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Top-Level Delete Management Panel */}
      <DeleteManagementPanel
        isOpen={isDeletePanelOpen}
        onClose={() => setIsDeletePanelOpen(false)}
        title="Certificate Delete & Archive Management — Dedicated Selector"
        moduleName="Certificate"
        academicYears={[...ACADEMIC_YEAR_OPTIONS]}
        reasons={["Invalid Certificate File", "Duplicate Submission", "Wrong Student Assignment", "Expired Document", "Other"]}
        records={certificates.map((cert) => ({
          id: cert.id,
          name: `${cert.title} — ${cert.student?.fullName || "Student"}`,
          identifier: cert.student?.registerNo || cert.id.slice(0, 8),
          subtext: `Issuing Body: ${cert.issuingBody || "N/A"} | Date: ${cert.issueDate || "N/A"} | Category: ${cert.category || "Cert"}`,
          academicYear: cert.academicYearCode || selectedAcademicYear,
          status: cert.verificationStatus || "APPROVED",
          badge: cert.category || "Certification",
          isArchived: cert.isArchived,
          warningMsg: "Soft archiving hides this certificate from student & admin active views while preserving the uploaded photo/PDF document securely.",
        }))}
        onConfirmArchive={async (certId, reason) => {
          const res = await fetch(`/api/certificates/${certId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "archive", reason }),
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Archive failed");
          fetchData();
        }}
        onConfirmRestore={async (certId) => {
          const res = await fetch(`/api/certificates/${certId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "restore" }),
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Restore failed");
          fetchData();
        }}
      />
    </div>
  );
}

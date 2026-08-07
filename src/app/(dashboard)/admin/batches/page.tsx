"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { ACADEMIC_YEAR_OPTIONS } from "@/lib/academicYearConstants";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteManagementPanel } from "@/components/ui/DeleteManagementPanel";
import {
  CalendarDays,
  Plus,
  Users,
  Eye,
  Edit,
  Archive,
  GraduationCap,
  Layers,
  Sparkles,
  Trash2,
} from "lucide-react";

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Batch for viewing students
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [batchStudents, setBatchStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Add Student Modal
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);

  const [registerNo, setRegisterNo] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [admissionQuota, setAdmissionQuota] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, ayRes] = await Promise.all([
        fetch("/api/batches", { credentials: "include", cache: "no-store" }),
        fetch("/api/academic-years", { credentials: "include", cache: "no-store" }),
      ]);

      if (!bRes.ok) {
        const err = await bRes.json().catch(() => ({}));
        throw new Error(err.error || `Batches HTTP ${bRes.status}`);
      }
      if (!ayRes.ok) {
        const err = await ayRes.json().catch(() => ({}));
        throw new Error(err.error || `Academic Years HTTP ${ayRes.status}`);
      }

      const bData = await bRes.json();
      const ayData = await ayRes.json();

      setBatches(bData.batches || []);
      setAcademicYears(ayData.academicYears || []);
    } catch (err: any) {
      console.error("[Batches Fetch Error]", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsForBatch = async (batch: any) => {
    setSelectedBatch(batch);
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/students?batchId=${batch.id}&limit=100`);
      const data = await res.json();
      setBatchStudents(data.data?.students || data.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    if (!admissionQuota) {
      alert("Please select Government Quota or Management Quota.");
      return;
    }

    if (!password) {
      alert("Student Login Password is required.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Student Login Password and Confirm Password do not match.");
      return;
    }

    setAddingStudent(true);
    try {
      const admissionAY = `${selectedBatch.admissionYear}-${selectedBatch.admissionYear + 4}`;

      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registerNo,
          rollNo: registerNo,
          admissionNo: registerNo,
          fullName,
          email,
          password,
          admissionQuota,
          batchId: selectedBatch.id,
          academicYear: admissionAY,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "Failed to create student");
      }

      alert(`Student profile and portal login created for ${fullName}!`);
      setIsAddStudentOpen(false);
      setRegisterNo("");
      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setAdmissionQuota("");
      fetchStudentsForBatch(selectedBatch);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingStudent(false);
    }
  };

  const handlePermanentDeleteStudent = async (studentId: string, studentName?: string) => {
    const confirmationText = "Are you sure you want to permanently delete this student? This action cannot be undone.";
    if (!confirm(studentName ? `${confirmationText}\n\nStudent: ${studentName}` : confirmationText)) return;
    try {
      const res = await fetch(`/api/students/${studentId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message || data.error || "Permanent deletion failed");
      alert("Student profile and user account permanently deleted!");
      if (selectedBatch) fetchStudentsForBatch(selectedBatch);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Management Panel State
  const [isDeletePanelOpen, setIsDeletePanelOpen] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/students?limit=200")
      .then((r) => r.json())
      .then((d) => setAllStudents(d.data?.students || d.students || []))
      .catch((e) => console.error(e));
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="Batches & Progression — Department of AI & ML"
        subtitle="Academic Batches (1-Year Range: 2025–2026, 2026–2027...), Batch Enrollment & Add Student Workflow"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (batches.length > 0 && !selectedBatch) {
                  setSelectedBatch(batches[0]);
                }
                setIsAddStudentOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Student</span>
            </button>

            <button
              onClick={() => setIsDeletePanelOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Delete Student</span>
            </button>

            <button
              onClick={() => (window.location.href = "/admin/archive")}
              className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Archive className="w-4 h-4" />
              <span>View Archived Students</span>
            </button>
          </div>
        }
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Header Summary */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">AI & ML Academic Batches</h2>
            <p className="text-xs text-slate-500">
              Each batch uses 1-year ranges (2025–2026, 2026–2027...). Students added under a batch/year remain permanently linked.
            </p>
          </div>
          <Badge variant="purple">Fixed Scope: AI & ML</Badge>
        </div>

        {/* Batches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))
          ) : (
            batches.map((b) => (
              <div
                key={b.id}
                onClick={() => fetchStudentsForBatch(b)}
                className={`ui-card p-5 space-y-3 cursor-pointer transition border hover:border-indigo-500 ${
                  selectedBatch?.id === b.id
                    ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    Batch {b.name}
                  </span>
                  <Badge variant={b.status === "ACTIVE" ? "success" : "info"}>{b.status}</Badge>
                </div>

                <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
                  <div>Admission Year: <strong className="text-indigo-600 dark:text-indigo-400">{b.admissionAcademicYear}</strong></div>
                  <div>Start Year: <strong className="text-slate-800 dark:text-slate-200">{b.admissionYear}</strong></div>
                  <div>Expected Graduation: <strong className="text-slate-800 dark:text-slate-200">{b.expectedGraduationYear}</strong></div>
                  <div>Current Semester: <strong className="text-emerald-600 font-bold">Sem {b.currentSemester}</strong></div>
                  <div>Students Enrolled: <strong className="text-slate-900 dark:text-white font-bold">{b._count?.students || 0}</strong></div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBatch(b);
                    setIsAddStudentOpen(true);
                  }}
                  className="w-full mt-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> + Add Student
                </button>
              </div>
            ))
          )}
        </div>

        {/* Selected Batch Students View */}
        {selectedBatch && (
          <div className="ui-card rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Batch Enrollment Roster
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Students in Batch {selectedBatch.name} (Admission AY: {selectedBatch.admissionAcademicYear})
                </h3>
              </div>

              <button
                onClick={() => setIsAddStudentOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> + Add Student to Batch {selectedBatch.name}
              </button>
            </div>

            {loadingStudents ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
            ) : batchStudents.length === 0 ? (
              <EmptyState
                title={`No Students Enrolled in Batch ${selectedBatch.name}`}
                description="Click '+ Add Student' below to register new students for this batch and academic year."
                action={
                  <button
                    onClick={() => setIsAddStudentOpen(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Student</span>
                  </button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3.5">Register No</th>
                      <th className="p-3.5">Student Name</th>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">Admission Quota</th>
                      <th className="p-3.5">Admission Year</th>
                      <th className="p-3.5">Current Semester</th>
                      <th className="p-3.5">Attendance %</th>
                      <th className="p-3.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {batchStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {st.registerNo}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          {st.fullName}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400">{st.email}</td>
                        <td className="p-3.5">
                          <Badge variant={st.admissionQuota === "MQ" ? "purple" : st.admissionQuota === "GQ" ? "info" : "default"}>
                            {st.admissionQuota === "GQ" ? "Government Quota" : st.admissionQuota === "MQ" ? "Management Quota" : "Not Assigned"}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">{st.academicYear}</td>
                        <td className="p-3.5 font-bold">Sem {st.currentSemester}</td>
                        <td className="p-3.5 font-bold text-emerald-600">
                          {st.attendancePercentage}%
                        </td>
                        <td className="p-3.5 flex items-center gap-2">
                          <button
                            onClick={() => handlePermanentDeleteStudent(st.id, st.fullName)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Permanently Delete Student"
                          >
                            <Trash2 className="w-4 h-4 text-rose-600" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {selectedBatch && (
        <Modal
          isOpen={isAddStudentOpen}
          onClose={() => setIsAddStudentOpen(false)}
          title={`Add Student — Batch ${selectedBatch.name} (AI & ML)`}
          maxWidth="md"
        >
          <form onSubmit={handleAddStudent} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-1">
              <span className="font-bold text-indigo-700 dark:text-indigo-300 block">
                Automatic Links:
              </span>
              <div>Department: <strong>AI & ML</strong></div>
              <div>Batch: <strong>Batch {selectedBatch.name}</strong></div>
              <div>Admission Academic Year: <strong>{selectedBatch.admissionAcademicYear}</strong></div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Register Number *
              </label>
              <input
                type="text"
                required
                value={registerNo}
                onChange={(e) => setRegisterNo(e.target.value)}
                placeholder="e.g. 710025104001"
                className="ui-input w-full p-2 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Aravind Kumar"
                className="ui-input w-full p-2"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Student Email (Portal Login) *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@skillswap.com"
                className="ui-input w-full p-2"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Admission Quota *
              </label>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                  <input
                    type="radio"
                    name="admissionQuotaBatch"
                    value="GQ"
                    checked={admissionQuota === "GQ"}
                    onChange={(e) => setAdmissionQuota(e.target.value)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span>Government Quota (GQ)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                  <input
                    type="radio"
                    name="admissionQuotaBatch"
                    value="MQ"
                    checked={admissionQuota === "MQ"}
                    onChange={(e) => setAdmissionQuota(e.target.value)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span>Management Quota (MQ)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PasswordInput
                label="Student Login Password *"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
              <PasswordInput
                label="Confirm Password *"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddStudentOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingStudent}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-md"
              >
                {addingStudent ? "Creating Profile & Account..." : "Save Student & Create Login"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Top-Level Delete Management Panel */}
      <DeleteManagementPanel
        isOpen={isDeletePanelOpen}
        onClose={() => setIsDeletePanelOpen(false)}
        title="Batch Student Delete & Archive Management — Dedicated Selector"
        moduleName="Student"
        academicYears={[...ACADEMIC_YEAR_OPTIONS]}
        batches={batches.map((b) => b.name)}
        reasons={["Duplicate Record", "Discontinued", "Transfer", "Wrong Entry", "Other"]}
        records={allStudents.map((st) => ({
          id: st.id,
          name: st.fullName,
          identifier: st.registerNo,
          subtext: `Batch: ${st.batch?.name || "N/A"} | Quota: ${st.admissionQuota || "N/A"}`,
          academicYear: st.academicYear,
          batch: st.batch?.name,
          status: st.academicStatus || "PURSUING",
          badge: st.admissionQuota === "GQ" ? "Government Quota" : "Management Quota",
          isArchived: st.isArchived,
        }))}
        onConfirmArchive={async (studentId, reason) => {
          const res = await fetch(`/api/students/${studentId}/archive`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason }),
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Archive failed");
          if (selectedBatch) fetchStudentsForBatch(selectedBatch);
        }}
        onConfirmRestore={async (studentId) => {
          const res = await fetch(`/api/students/${studentId}/restore`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
          });
          const d = await res.json();
          if (!res.ok || d.success === false) throw new Error(d.message || d.error || "Restore failed");
          if (selectedBatch) fetchStudentsForBatch(selectedBatch);
        }}
        onConfirmDelete={async (studentId) => {
          await handlePermanentDeleteStudent(studentId);
        }}
      />
    </div>
  );
}

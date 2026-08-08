"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ACADEMIC_YEAR_OPTIONS, BATCH_OPTIONS } from "@/lib/academicYearConstants";
import {
  Trash2,
  Archive,
  Search,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Info,
  ShieldAlert,
} from "lucide-react";

export interface DeleteRecordItem {
  id: string;
  name: string;
  identifier?: string;
  academicYear?: string;
  batch?: string;
  subtext?: string;
  status?: string;
  badge?: string;
  isArchived?: boolean;
  extraDetails?: Record<string, any>;
  warningMsg?: string;
}

export interface DeleteManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  moduleName: string; // e.g. "Student", "Certificate", "Project"
  records: DeleteRecordItem[];
  academicYears?: string[];
  batches?: string[];
  reasons?: string[];
  onConfirmArchive: (recordId: string, reason: string, notes?: string) => Promise<void>;
  onConfirmRestore?: (recordId: string) => Promise<void>;
  onConfirmDelete?: (recordId: string) => Promise<void>;
}

export const DeleteManagementPanel: React.FC<DeleteManagementPanelProps> = ({
  isOpen,
  onClose,
  title,
  moduleName,
  records,
  academicYears = [...ACADEMIC_YEAR_OPTIONS],
  batches = [...BATCH_OPTIONS],
  reasons = ["Duplicate Record", "Discontinued", "Transfer", "Wrong Entry", "Other"],
  onConfirmArchive,
  onConfirmRestore,
  onConfirmDelete,
}) => {
  const [search, setSearch] = useState("");
  const [selectedAY, setSelectedAY] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string>("");
  const [selectedReason, setSelectedReason] = useState(reasons[0] || "Duplicate Record");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.identifier && r.identifier.toLowerCase().includes(search.toLowerCase())) ||
      (r.subtext && r.subtext.toLowerCase().includes(search.toLowerCase()));

    const matchesAY = !selectedAY || r.academicYear === selectedAY;
    const matchesBatch = !selectedBatch || r.batch === selectedBatch;

    return matchesSearch && matchesAY && matchesBatch;
  });

  const selectedRecord = records.find((r) => r.id === selectedRecordId);

  const handleArchive = async () => {
    if (!selectedRecord) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await onConfirmArchive(selectedRecord.id, selectedReason, notes);
      setFeedback({ type: "success", text: `${moduleName} '${selectedRecord.name}' archived successfully.` });
      setSelectedRecordId("");
      setNotes("");
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to archive record." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedRecord || !onConfirmRestore) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await onConfirmRestore(selectedRecord.id);
      setFeedback({ type: "success", text: `${moduleName} '${selectedRecord.name}' restored successfully.` });
      setSelectedRecordId("");
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to restore record." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord || !onConfirmDelete) return;
    const confirmMessage = "Are you sure you want to permanently delete this record?\nThis action cannot be undone.";
    if (!confirm(confirmMessage)) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await onConfirmDelete(selectedRecord.id);
      setFeedback({ type: "success", text: `${moduleName} '${selectedRecord.name}' permanently deleted.` });
      setSelectedRecordId("");
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to delete record." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="2xl">
      <div className="space-y-4 text-xs">
        {/* Header Description */}
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2 text-rose-900 dark:text-rose-200">
          <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-rose-700 dark:text-rose-300 font-bold uppercase tracking-wider text-[11px]">
              Top-Level {onConfirmDelete ? "Permanent Delete" : "Archive"} Management — {moduleName}
            </strong>
            {onConfirmDelete
              ? `Select any active ${moduleName.toLowerCase()} record to permanently delete it from the database.`
              : `Select any active ${moduleName.toLowerCase()} record to move it to safe institutional archives in Supabase PostgreSQL.`}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${moduleName}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ui-input pl-8 py-1.5 text-xs w-full"
            />
          </div>

          {/* Academic Year Filter */}
          {academicYears.length > 0 && (
            <select
              value={selectedAY}
              onChange={(e) => setSelectedAY(e.target.value)}
              className="ui-input py-1.5 text-xs"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((ay) => (
                <option key={ay} value={ay}>
                  AY {ay}
                </option>
              ))}
            </select>
          )}

          {/* Batch Filter */}
          {batches.length > 0 && (
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="ui-input py-1.5 text-xs"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b} value={b}>
                  Batch {b}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Record Selection Dropdown */}
        <div className="space-y-1">
          <label className="block font-bold text-slate-700 dark:text-slate-300">
            Select {moduleName} Record to {onConfirmDelete ? "Permanently Delete" : "Archive"} ({filteredRecords.length} available) *
          </label>
          <select
            value={selectedRecordId}
            onChange={(e) => setSelectedRecordId(e.target.value)}
            className="ui-input py-2 text-xs w-full font-medium"
          >
            <option value="">-- Choose {moduleName} --</option>
            {filteredRecords.map((r) => (
              <option key={r.id} value={r.id}>
                {r.identifier ? `[${r.identifier}] ` : ""}
                {r.name} {r.subtext ? `— ${r.subtext}` : ""}
                {r.isArchived ? " (ARCHIVED)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Record Detail Preview Card */}
        {selectedRecord && (
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Selected Record Preview
                </span>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedRecord.name}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {selectedRecord.badge && <Badge variant="info">{selectedRecord.badge}</Badge>}
                {selectedRecord.isArchived ? (
                  <Badge variant="warning">ARCHIVED</Badge>
                ) : (
                  <Badge variant="success">ACTIVE</Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {selectedRecord.identifier && (
                <div>
                  <span className="text-slate-400 font-semibold block">Register / ID:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedRecord.identifier}
                  </span>
                </div>
              )}
              {selectedRecord.academicYear && (
                <div>
                  <span className="text-slate-400 font-semibold block">Academic Year:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedRecord.academicYear}
                  </span>
                </div>
              )}
              {selectedRecord.batch && (
                <div>
                  <span className="text-slate-400 font-semibold block">Batch / Cohort:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedRecord.batch}
                  </span>
                </div>
              )}
              {selectedRecord.status && (
                <div>
                  <span className="text-slate-400 font-semibold block">Current Status:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedRecord.status}
                  </span>
                </div>
              )}
            </div>

            {/* Custom Warning Message */}
            {selectedRecord.warningMsg && (
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2 text-[11px]">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Important Notice:</strong> {selectedRecord.warningMsg}
                </div>
              </div>
            )}

            {/* Form Fields: Reason & Notes */}
            {!selectedRecord.isArchived && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reason for {onConfirmDelete ? "Deletion" : "Archiving"} *
                  </label>
                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="ui-input py-1.5 text-xs w-full"
                  >
                    {reasons.map((rsn) => (
                      <option key={rsn} value={rsn}>
                        {rsn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Additional Notes / Audit Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Duplicate entry created during batch enrollment"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="ui-input py-1.5 text-xs w-full"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-bold ${
              feedback.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 border-rose-200 dark:border-rose-800"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Footer Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs"
          >
            Cancel
          </button>

          {selectedRecord && onConfirmDelete && (
            <button
              type="button"
              disabled={submitting}
              onClick={handleDelete}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 text-white" />
              <span>{moduleName === "Student" ? "Permanently Delete Student" : `Delete ${moduleName}`}</span>
            </button>
          )}

          {selectedRecord && !selectedRecord.isArchived && !onConfirmDelete && (
            <button
              type="button"
              disabled={submitting}
              onClick={handleArchive}
              className="px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Archive className="w-4 h-4 text-rose-600" />
              <span>Archive {moduleName}</span>
            </button>
          )}

          {selectedRecord && selectedRecord.isArchived && onConfirmRestore && (
            <button
              type="button"
              disabled={submitting}
              onClick={handleRestore}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restore {moduleName}</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { AlertTriangle, Trash2, Archive, ShieldAlert, Check } from "lucide-react";

export interface DeleteImpactPreview {
  attendanceCount?: number;
  certificateCount?: number;
  internshipCount?: number;
  projectCount?: number;
  placementCount?: number;
}

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  recordName: string;
  recordIdentifier?: string;
  recordType: string;
  mode?: "archive" | "permanent";
  impactPreview?: DeleteImpactPreview;
  isSuperAdmin?: boolean;
  onConfirm: (reason: string, notes?: string, confirmText?: string) => Promise<void>;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  title,
  recordName,
  recordIdentifier,
  recordType,
  mode = "archive",
  impactPreview,
  isSuperAdmin = false,
  onConfirm,
}) => {
  const [reason, setReason] = useState<string>("Duplicate Record");
  const [notes, setNotes] = useState<string>("");
  const [confirmInput, setConfirmInput] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requiredConfirmString = recordIdentifier
    ? `PERMANENTLY_DELETE_${recordIdentifier.toUpperCase().replace(/\s+/g, "_")}`
    : `PERMANENTLY_DELETE_${recordName.toUpperCase().replace(/\s+/g, "_")}`;

  const isPermanentValid = mode === "permanent" ? confirmInput.trim() === requiredConfirmString : true;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "permanent" && !isPermanentValid) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onConfirm(reason, notes, confirmInput);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to execute delete/archive operation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
        {/* Record Overview Card */}
        <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Record Details</span>
            <Badge variant={mode === "permanent" ? "danger" : "warning"}>{recordType}</Badge>
          </div>
          <div className="font-bold text-slate-900 dark:text-white text-sm truncate">{recordName}</div>
          {recordIdentifier && (
            <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
              Identifier: {recordIdentifier}
            </div>
          )}
        </div>

        {/* Warning Banner */}
        {mode === "archive" ? (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 flex items-start gap-2 text-xs">
            <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Soft Delete / Archive:</strong> This record will be hidden from active lists and preserved in database archives. You can restore it at any time from Admin → Archive.
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <span>PERMANENT DELETE WARNING</span>
            </div>
            <div>
              <strong>Are you sure you want to permanently delete this record?</strong>
              <br />
              This action cannot be undone. The database record and any associated data will be permanently erased.
            </div>
            {impactPreview && (
              <div className="pt-2 border-t border-rose-200 dark:border-rose-900/60 font-semibold space-y-1 text-[11px]">
                <span className="block font-bold">Associated Data Impact Preview:</span>
                <ul className="list-disc pl-4 space-y-0.5">
                  {impactPreview.attendanceCount !== undefined && <li>Attendance Records: <strong>{impactPreview.attendanceCount}</strong></li>}
                  {impactPreview.certificateCount !== undefined && <li>Certificates: <strong>{impactPreview.certificateCount}</strong></li>}
                  {impactPreview.internshipCount !== undefined && <li>Internships: <strong>{impactPreview.internshipCount}</strong></li>}
                  {impactPreview.projectCount !== undefined && <li>Projects: <strong>{impactPreview.projectCount}</strong></li>}
                  {impactPreview.placementCount !== undefined && <li>Placements: <strong>{impactPreview.placementCount}</strong></li>}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Reason Selector */}
        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Reason for {mode === "archive" ? "Archiving" : "Permanent Deletion"} *
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="ui-input w-full p-2"
            required
          >
            <option value="Duplicate Record">Duplicate Record</option>
            <option value="Discontinued / Inactive">Discontinued / Inactive</option>
            <option value="Wrong Entry / Correction">Wrong Entry / Correction</option>
            <option value="Transfer / Relocation">Transfer / Relocation</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Audit Notes / Comments</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Approved by HOD for record clean up"
            className="ui-input w-full p-2"
          />
        </div>

        {/* Permanent Delete Confirmation Input */}
        {mode === "permanent" && (
          <div className="space-y-1 pt-1">
            <label className="block font-bold text-rose-600 dark:text-rose-400">
              Type <code className="bg-rose-100 dark:bg-rose-950 px-1 py-0.5 rounded font-mono text-[11px]">{requiredConfirmString}</code> to confirm:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={requiredConfirmString}
              className="ui-input w-full p-2 font-mono text-xs border-rose-300 focus:border-rose-500"
              required
            />
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200">
            {errorMessage}
          </div>
        )}

        {/* Modal Buttons */}
        <div className="pt-3 border-t flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
          >
            Cancel
          </button>

          {mode === "archive" ? (
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <Archive className="w-4 h-4" />
              <span>{submitting ? "Archiving..." : "Archive Record"}</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting || !isPermanentValid}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{submitting ? "Erasing..." : "Permanently Delete"}</span>
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};

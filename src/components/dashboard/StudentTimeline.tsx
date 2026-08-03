"use client";

import React, { useState } from "react";
import { CheckCircle2, Sparkles, X, GraduationCap, Briefcase, FileCheck, Award, FolderGit2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

interface StudentTimelineProps {
  currentSemester: number;
  academicStatus: string;
  admissionDate: string;
  studentRecords?: {
    academicRecords?: any[];
    attendances?: any[];
    internships?: any[];
    certificates?: any[];
    achievements?: any[];
    projects?: any[];
  };
}

export const StudentTimeline: React.FC<StudentTimelineProps> = ({
  currentSemester,
  academicStatus,
  admissionDate,
  studentRecords,
}) => {
  const [selectedSemModal, setSelectedSemModal] = useState<number | null>(null);

  const isAlumni = academicStatus === "ALUMNI";

  const stages = [
    { label: "Admission", sem: 0, desc: `Enrolled ${admissionDate}` },
    { label: "Semester 1", sem: 1, desc: "Foundational Engineering" },
    { label: "Semester 2", sem: 2, desc: "Core Subjects" },
    { label: "Semester 3", sem: 3, desc: "Data Structures & Lab" },
    { label: "Semester 4", sem: 4, desc: "Systems Architecture" },
    { label: "Semester 5", sem: 5, desc: "Industrial Training" },
    { label: "Semester 6", sem: 6, desc: "Capstone & Electives" },
    { label: "Semester 7", sem: 7, desc: "Placement & Project" },
    { label: "Semester 8", sem: 8, desc: "Final Defense" },
    { label: "Graduation", sem: 9, desc: "Degree Conferred" },
    { label: "Alumni Network", sem: 10, desc: "Institutional Alumni" },
  ];

  // Filter semester specific records for modal
  const semAcademics = studentRecords?.academicRecords?.filter((r) => r.semester === selectedSemModal) || [];
  const semAttendances = studentRecords?.attendances || [];
  const semProjects = studentRecords?.projects || [];
  const semInternships = studentRecords?.internships || [];

  return (
    <>
      <div className="ui-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Interactive Multi-Year Lifecycle Timeline (Click Stage to Inspect)</span>
          </h3>
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            {isAlumni ? "Degree Completed" : `Active - Semester ${currentSemester}`}
          </span>
        </div>

        {/* Timeline Progression Bar */}
        <div className="relative pt-2 pb-4 overflow-x-auto">
          <div className="flex items-start min-w-[700px] justify-between relative">
            {/* Connecting Line */}
            <div className="absolute top-4 left-4 right-4 h-1 bg-slate-200 dark:bg-slate-800 -z-0" />

            {stages.map((stage) => {
              const isCompleted = isAlumni || currentSemester > stage.sem || stage.sem === 0;
              const isCurrent = !isAlumni && currentSemester === stage.sem;
              const isClickable = stage.sem >= 1 && stage.sem <= 8 && isCompleted;

              return (
                <button
                  key={stage.label}
                  onClick={() => {
                    if (stage.sem >= 1 && stage.sem <= 8) {
                      setSelectedSemModal(stage.sem);
                    }
                  }}
                  className={`relative z-10 flex flex-col items-center text-center max-w-[80px] group focus:outline-none ${
                    isClickable ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition transform group-hover:scale-110 ${
                      isCompleted
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                        : isCurrent
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-4 ring-indigo-100 dark:ring-indigo-950 animate-pulse"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span>{stage.sem === 0 ? "A" : stage.sem > 8 ? "G" : stage.sem}</span>
                    )}
                  </div>

                  <div className="mt-2 space-y-0.5">
                    <span
                      className={`text-[11px] font-bold block ${
                        isCurrent
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {stage.label}
                    </span>
                    <span className="text-[9px] text-slate-400 block leading-tight">
                      {stage.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Semester Detail Inspector Modal */}
      <Modal
        isOpen={Boolean(selectedSemModal)}
        onClose={() => setSelectedSemModal(null)}
        title={`Semester ${selectedSemModal} Academic Snapshot Inspection`}
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          {/* Courses & Marks */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] mb-2 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Semester Courses & Grades ({semAcademics.length})</span>
            </h4>

            {semAcademics.length === 0 ? (
              <div className="p-4 text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                No formal course grade records filed for Semester {selectedSemModal}.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b font-semibold text-slate-500">
                      <th className="p-2">Course Code & Title</th>
                      <th className="p-2">Internal</th>
                      <th className="p-2">External</th>
                      <th className="p-2">Total</th>
                      <th className="p-2">Grade</th>
                      <th className="p-2">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {semAcademics.map((r: any) => (
                      <tr key={r.id}>
                        <td className="p-2 font-semibold text-slate-900 dark:text-white">
                          {r.course?.code}: {r.course?.title}
                        </td>
                        <td className="p-2">{r.internalMarks}</td>
                        <td className="p-2">{r.externalMarks}</td>
                        <td className="p-2 font-bold text-emerald-600">{r.totalMarks}</td>
                        <td className="p-2 font-bold">{r.grade}</td>
                        <td className="p-2"><Badge variant="success">{r.result}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

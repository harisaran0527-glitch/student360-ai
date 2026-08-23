"use client";

import React, { useState, useEffect } from "react";
import { DeleteManagementPanel } from "@/components/ui/DeleteManagementPanel";
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Layers,
  Search,
  Filter,
  Plus,
  Edit3,
  Archive,
  RotateCcw,
  Eye,
  History,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  UserCheck,
  Building,
  Shield,
  Sparkles,
  GitBranch,
} from "lucide-react";

interface SyllabusUnit {
  unitNumber: number;
  title: string;
  topics: string;
  description: string;
  hours: number;
}

interface SyllabusVersion {
  id: string;
  versionNumber: string;
  syllabusTitle: string;
  regulation: string;
  academicYearCode: string;
  semester: number;
  effectiveFrom: string;
  status: string;
  changeSummary?: string;
  units: SyllabusUnit[];
  courseObjectives?: string[];
  courseOutcomes?: string[];
  textBooks?: string[];
  referenceBooks?: string[];
  practicalDetails?: string;
  assessmentInfo?: string;
  additionalNotes?: string;
  createdAt: string;
}

interface Subject {
  id: string;
  code: string;
  title: string;
  semester: number;
  academicYearCode: string;
  credits: number;
  subjectType: string;
  departmentId: string;
  facultyId?: string | null;
  faculty?: { id: string; fullName: string; email: string } | null;
  description?: string | null;
  isActive: boolean;
  isArchived: boolean;
  syllabusVersions?: SyllabusVersion[];
}

interface SemesterConfig {
  semesterNumber: number;
  semesterName: string;
  academicYearCode: string;
  startDate: string;
  endDate: string;
  status: string;
  notes: string;
  subjectsCount: number;
  activeSyllabusVersion: string;
  effectiveFrom: string;
}

export default function AdminAcademicsPage() {
  const [activeTab, setActiveTab] = useState<"ROSTER" | "TIMETABLE" | "SETTINGS">("ROSTER");
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("2025-2029");
  const [selectedDepartment, setSelectedDepartment] = useState("AI & ML");
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [semesters, setSemesters] = useState<SemesterConfig[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculties, setFaculties] = useState<{ id: string; fullName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDeletePanelOpen, setIsDeletePanelOpen] = useState(false);

  // Modals state
  const [editSemesterModal, setEditSemesterModal] = useState<SemesterConfig | null>(null);
  const [semesterChangePreview, setSemesterChangePreview] = useState<{ old: any; new: any } | null>(null);

  const [subjectModal, setSubjectModal] = useState<{ mode: "ADD" | "EDIT"; subject?: Subject } | null>(null);
  const [subjectChangePreview, setSubjectChangePreview] = useState<{ old: any; new: any } | null>(null);

  const [syllabusEditorModal, setSyllabusEditorModal] = useState<{ subject: Subject; version?: SyllabusVersion } | null>(null);
  const [versionHistoryDrawer, setVersionHistoryDrawer] = useState<Subject | null>(null);
  const [versionHistoryList, setVersionHistoryList] = useState<SyllabusVersion[]>([]);
  const [versionDiffModal, setVersionDiffModal] = useState<{ v1: SyllabusVersion; v2: SyllabusVersion } | null>(null);
  const [viewSubjectModal, setViewSubjectModal] = useState<Subject | null>(null);

  // Subject Form State
  const [subCode, setSubCode] = useState("");
  const [subTitle, setSubTitle] = useState("");
  const [subSemester, setSubSemester] = useState(1);
  const [subCredits, setSubCredits] = useState(4);
  const [subType, setSubType] = useState("CORE");
  const [subFacultyId, setSubFacultyId] = useState("");
  const [subDescription, setSubDescription] = useState("");
  const [subIsActive, setSubIsActive] = useState(true);

  // Syllabus Editor State
  const [sylTitle, setSylTitle] = useState("");
  const [sylRegulation, setSylRegulation] = useState("Regulation 2026");
  const [sylEffectiveFrom, setSylEffectiveFrom] = useState("2025-08-01");
  const [sylChangeSummary, setSylChangeSummary] = useState("");
  const [sylObjectives, setSylObjectives] = useState("");
  const [sylOutcomes, setSylOutcomes] = useState("");
  const [sylTextbooks, setSylTextbooks] = useState("");
  const [sylRefbooks, setSylRefbooks] = useState("");
  const [sylPractical, setSylPractical] = useState("");
  const [sylAssessment, setSylAssessment] = useState("");
  const [sylNotes, setSylNotes] = useState("");
  const [sylUnits, setSylUnits] = useState<SyllabusUnit[]>([
    { unitNumber: 1, title: "Unit I: Introduction & Fundamentals", topics: "", description: "", hours: 9 },
    { unitNumber: 2, title: "Unit II: Core Principles & Methodology", topics: "", description: "", hours: 9 },
    { unitNumber: 3, title: "Unit III: Advanced Concepts & Architectures", topics: "", description: "", hours: 9 },
    { unitNumber: 4, title: "Unit IV: System Implementation & Tools", topics: "", description: "", hours: 9 },
    { unitNumber: 5, title: "Unit V: Case Studies & Emerging Applications", topics: "", description: "", hours: 9 },
  ]);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [semRes, subRes, facRes] = await Promise.all([
        fetch(`/api/academics/semesters?academicYear=${selectedAcademicYear}&department=${encodeURIComponent(selectedDepartment)}`),
        fetch(`/api/academics/subjects?academicYear=${selectedAcademicYear}&department=${encodeURIComponent(selectedDepartment)}&includeArchived=${showArchived}`),
        fetch("/api/students/options"),
      ]);

      const semData = await semRes.json();
      const subData = await subRes.json();
      const facData = await facRes.json();

      if (semData.success) setSemesters(semData.data);
      if (subData.success) setSubjects(subData.data);
      if (facData.success && facData.data?.faculties) setFaculties(facData.data.faculties);
    } catch (err) {
      console.error("[Academics Fetch Error]", err);
      showToast("error", "Failed to load academic roster data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedAcademicYear, selectedDepartment, showArchived]);

  // Open Edit Subject Modal
  const handleOpenEditSubject = (sub: Subject) => {
    setSubjectModal({ mode: "EDIT", subject: sub });
    setSubCode(sub.code);
    setSubTitle(sub.title);
    setSubSemester(sub.semester);
    setSubCredits(sub.credits);
    setSubType(sub.subjectType);
    setSubFacultyId(sub.facultyId || "");
    setSubDescription(sub.description || "");
    setSubIsActive(sub.isActive);
  };

  // Open Add Subject Modal
  const handleOpenAddSubject = (semNumber?: number) => {
    setSubjectModal({ mode: "ADD" });
    setSubCode("");
    setSubTitle("");
    setSubSemester(semNumber || selectedSemester);
    setSubCredits(4);
    setSubType("CORE");
    setSubFacultyId("");
    setSubDescription("");
    setSubIsActive(true);
  };

  // Request Save Subject (with diff check)
  const handleRequestSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCode.trim() || !subTitle.trim()) {
      showToast("error", "Subject Code and Title are required");
      return;
    }

    if (subjectModal?.mode === "EDIT" && subjectModal.subject) {
      const oldVal = {
        code: subjectModal.subject.code,
        title: subjectModal.subject.title,
        semester: subjectModal.subject.semester,
        credits: subjectModal.subject.credits,
        subjectType: subjectModal.subject.subjectType,
        faculty: subjectModal.subject.faculty?.fullName || "Unassigned",
        isActive: subjectModal.subject.isActive ? "Active" : "Inactive",
      };
      const selectedFacObj = faculties.find((f) => f.id === subFacultyId);
      const newVal = {
        code: subCode.trim().toUpperCase(),
        title: subTitle.trim(),
        semester: subSemester,
        credits: subCredits,
        subjectType: subType,
        faculty: selectedFacObj ? selectedFacObj.fullName : "Unassigned",
        isActive: subIsActive ? "Active" : "Inactive",
      };
      setSubjectChangePreview({ old: oldVal, new: newVal });
    } else {
      executeSaveSubject();
    }
  };

  const executeSaveSubject = async () => {
    try {
      const payload = {
        id: subjectModal?.mode === "EDIT" ? subjectModal.subject?.id : undefined,
        code: subCode.trim().toUpperCase(),
        title: subTitle.trim(),
        semester: Number(subSemester),
        academicYearCode: selectedAcademicYear,
        credits: Number(subCredits),
        subjectType: subType,
        facultyId: subFacultyId || null,
        department: selectedDepartment,
        description: subDescription,
        isActive: subIsActive,
      };

      const url = "/api/academics/subjects";
      const method = subjectModal?.mode === "EDIT" ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast("success", data.message || "Subject saved successfully");
        setSubjectModal(null);
        setSubjectChangePreview(null);
        fetchAllData();
      } else {
        showToast("error", data.error || "Failed to save subject");
      }
    } catch (err: any) {
      showToast("error", err.message || "An error occurred");
    }
  };

  // Open Syllabus Editor
  const handleOpenSyllabusEditor = (sub: Subject) => {
    setSyllabusEditorModal({ subject: sub });
    const latest = sub.syllabusVersions?.[0];
    if (latest) {
      setSylTitle(latest.syllabusTitle);
      setSylRegulation(latest.regulation);
      setSylEffectiveFrom(latest.effectiveFrom || "2025-08-01");
      setSylChangeSummary("");
      setSylObjectives(Array.isArray(latest.courseObjectives) ? latest.courseObjectives.join("\n") : "");
      setSylOutcomes(Array.isArray(latest.courseOutcomes) ? latest.courseOutcomes.join("\n") : "");
      setSylTextbooks(Array.isArray(latest.textBooks) ? latest.textBooks.join("\n") : "");
      setSylRefbooks(Array.isArray(latest.referenceBooks) ? latest.referenceBooks.join("\n") : "");
      setSylPractical(latest.practicalDetails || "");
      setSylAssessment(latest.assessmentInfo || "");
      setSylNotes(latest.additionalNotes || "");
      if (Array.isArray(latest.units) && latest.units.length > 0) {
        setSylUnits(latest.units);
      }
    } else {
      setSylTitle(`${sub.title} — Syllabus`);
      setSylRegulation("Regulation 2026");
      setSylEffectiveFrom("2025-08-01");
      setSylChangeSummary("Initial Syllabus Creation");
      setSylObjectives("1. Master core domain concepts.\n2. Apply algorithmic frameworks to problem solving.");
      setSylOutcomes("CO1: Analyze domain structures.\nCO2: Design efficient scalable systems.");
      setSylTextbooks("Textbook 1: Foundations of Computer Science");
      setSylRefbooks("Reference 1: Standard Reference Guide");
      setSylPractical("");
      setSylAssessment("Continuous Internal Evaluation: 40%, End Semester Examination: 60%");
      setSylNotes("");
      setSylUnits([
        { unitNumber: 1, title: "Unit I: Fundamental Concepts", topics: "Basic principles and mathematical modeling", description: "Introduction to core foundations", hours: 9 },
        { unitNumber: 2, title: "Unit II: Core Frameworks", topics: "Structure and methodology", description: "In-depth procedural analysis", hours: 9 },
        { unitNumber: 3, title: "Unit III: Implementation Strategies", topics: "Algorithms and practical execution", description: "Lab & practical setup", hours: 9 },
        { unitNumber: 4, title: "Unit IV: Optimization & Scale", topics: "Efficiency analysis and refactoring", description: "Performance considerations", hours: 9 },
        { unitNumber: 5, title: "Unit V: Advanced Topics & Applications", topics: "Industry frameworks and emerging trends", description: "Project case studies", hours: 9 },
      ]);
    }
  };

  const handleSaveSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syllabusEditorModal) return;
    if (!sylChangeSummary.trim()) {
      showToast("error", "A change summary is mandatory before saving syllabus revisions");
      return;
    }

    try {
      const payload = {
        courseId: syllabusEditorModal.subject.id,
        syllabusTitle: sylTitle.trim(),
        regulation: sylRegulation.trim(),
        academicYearCode: selectedAcademicYear,
        semester: syllabusEditorModal.subject.semester,
        effectiveFrom: sylEffectiveFrom,
        changeSummary: sylChangeSummary.trim(),
        units: sylUnits,
        courseObjectives: sylObjectives.split("\n").filter((s) => s.trim()),
        courseOutcomes: sylOutcomes.split("\n").filter((s) => s.trim()),
        textBooks: sylTextbooks.split("\n").filter((s) => s.trim()),
        referenceBooks: sylRefbooks.split("\n").filter((s) => s.trim()),
        practicalDetails: sylPractical,
        assessmentInfo: sylAssessment,
        additionalNotes: sylNotes,
      };

      const res = await fetch("/api/academics/syllabus/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast("success", data.message || "Syllabus version published successfully");
        setSyllabusEditorModal(null);
        fetchAllData();
      } else {
        showToast("error", data.error || "Failed to publish syllabus version");
      }
    } catch (err: any) {
      showToast("error", err.message || "An error occurred while saving syllabus");
    }
  };

  // Open Version History Drawer
  const handleOpenVersionHistory = async (sub: Subject) => {
    setVersionHistoryDrawer(sub);
    try {
      const res = await fetch(`/api/academics/syllabus/versions?courseId=${sub.id}`);
      const data = await res.json();
      if (data.success) {
        setVersionHistoryList(data.data);
      }
    } catch (err) {
      console.error("[Version History Error]", err);
    }
  };

  const handleRestoreVersion = async (verId: string) => {
    const summary = prompt("Enter a brief change summary for restoring this historical version:");
    if (!summary) return;

    try {
      const res = await fetch("/api/academics/syllabus/versions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: verId,
          action: "RESTORE_AS_NEW",
          changeSummary: summary,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("success", data.message || "Historical version restored as new revision");
        if (versionHistoryDrawer) handleOpenVersionHistory(versionHistoryDrawer);
        fetchAllData();
      } else {
        showToast("error", data.error || "Failed to restore version");
      }
    } catch (err: any) {
      showToast("error", err.message || "An error occurred");
    }
  };

  // Save Semester Edit
  const handleRequestSaveSemester = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSemesterModal) return;

    const oldVal = {
      name: editSemesterModal.semesterName,
      status: editSemesterModal.status,
      startDate: editSemesterModal.startDate,
      endDate: editSemesterModal.endDate,
    };
    const newVal = {
      name: editSemesterModal.semesterName,
      status: editSemesterModal.status,
      startDate: editSemesterModal.startDate,
      endDate: editSemesterModal.endDate,
    };
    setSemesterChangePreview({ old: oldVal, new: newVal });
  };

  const executeSaveSemester = async () => {
    if (!editSemesterModal) return;
    try {
      const res = await fetch("/api/academics/semesters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semesterNumber: editSemesterModal.semesterNumber,
          semesterName: editSemesterModal.semesterName,
          academicYearCode: selectedAcademicYear,
          department: selectedDepartment,
          startDate: editSemesterModal.startDate,
          endDate: editSemesterModal.endDate,
          status: editSemesterModal.status,
          notes: editSemesterModal.notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("success", "Semester metadata updated successfully");
        setEditSemesterModal(null);
        setSemesterChangePreview(null);
        fetchAllData();
      } else {
        showToast("error", data.error || "Failed to update semester");
      }
    } catch (err: any) {
      showToast("error", err.message || "Error updating semester");
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold border backdrop-blur-md animate-in fade-in slide-in-from-top-4 ${
            toastMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
          }`}
        >
          {toastMessage.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-500/20">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
              <GraduationCap className="w-6 h-6 text-indigo-300" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Semester Subjects & Syllabus Management</h1>
          </div>
          <p className="text-slate-300 text-sm pl-11">
            Institutional academic curriculum, multi-unit syllabus editor, immutable version control, and individual subject edit hub.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenAddSubject()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" /> Add New Subject
          </button>
        </div>
      </div>

      {/* Global Controls & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Academic Year</label>
          <select
            value={selectedAcademicYear}
            onChange={(e) => setSelectedAcademicYear(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-200"
          >
            <option value="2025-2029">2025 - 2029 Batch</option>
            <option value="2024-2028">2024 - 2028 Batch</option>
            <option value="2023-2027">2023 - 2027 Batch</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Department</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-200"
          >
            <option value="AI & ML">AI & ML (Artificial Intelligence & Machine Learning)</option>
            <option value="CSE">CSE (Computer Science Engineering)</option>
            <option value="ECE">ECE (Electronics & Communication)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Search Subject Code or Title</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search AIML101, Data Structures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="flex items-end justify-between gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Show Archived Subjects</span>
          </label>
        </div>
      </div>

      {/* Semester Tabs (Sem 1 - Sem 8) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((semNum) => {
          const semCfg = semesters.find((s) => s.semesterNumber === semNum);
          const count = subjects.filter((s) => s.semester === semNum && !s.isArchived).length;
          const isSelected = selectedSemester === semNum;

          return (
            <button
              key={semNum}
              onClick={() => setSelectedSemester(semNum)}
              className={`flex-shrink-0 px-4 py-3 rounded-xl border text-left transition flex flex-col justify-between gap-1 min-w-[140px] ${
                isSelected
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">Sem {semNum}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                  {count} Subs
                </span>
              </div>
              <span className="text-sm font-bold truncate">{semCfg?.semesterName || `Semester ${semNum}`}</span>
            </button>
          );
        })}
      </div>

      {/* Active Semester Header & Metadata Card */}
      {(() => {
        const semConfig = semesters.find((s) => s.semesterNumber === selectedSemester);
        const activeSemesterSubjects = filteredSubjects.filter((s) => s.semester === selectedSemester);

        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {semConfig?.semesterName || `Semester ${selectedSemester}`}
                  </h2>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${semConfig?.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300"}`}>
                    {semConfig?.status || "ACTIVE"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Academic Year: <strong className="text-slate-700 dark:text-slate-200">{selectedAcademicYear}</strong> | Active Subjects: <strong className="text-slate-700 dark:text-slate-200">{activeSemesterSubjects.length}</strong> | Regulation: <strong className="text-slate-700 dark:text-slate-200">Regulation 2026</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setEditSemesterModal(
                      semConfig || {
                        semesterNumber: selectedSemester,
                        semesterName: `Semester ${selectedSemester}`,
                        academicYearCode: selectedAcademicYear,
                        startDate: "",
                        endDate: "",
                        status: "ACTIVE",
                        notes: "",
                        subjectsCount: activeSemesterSubjects.length,
                        activeSyllabusVersion: "v1.0",
                        effectiveFrom: "2025-08-01",
                      }
                    )
                  }
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-xs transition flex items-center gap-2 border border-slate-300 dark:border-slate-700"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Semester Info
                </button>

                <button
                  onClick={() => handleOpenAddSubject(selectedSemester)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-xs transition flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Subject to Sem {selectedSemester}
                </button>
              </div>
            </div>

            {/* Subject Roster Table / Cards */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  Semester {selectedSemester} Subject Directory & Syllabus Actions
                </h3>
                <span className="text-xs text-slate-500">
                  Showing {activeSemesterSubjects.length} subject{activeSemesterSubjects.length === 1 ? "" : "s"}
                </span>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-500">Loading semester subjects...</div>
              ) : activeSemesterSubjects.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-slate-500 text-sm font-medium">No subjects configured for Semester {selectedSemester} yet.</p>
                  <button
                    onClick={() => handleOpenAddSubject(selectedSemester)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 transition"
                  >
                    + Add First Subject
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3.5">Code</th>
                        <th className="p-3.5">Subject Title</th>
                        <th className="p-3.5">Type</th>
                        <th className="p-3.5 text-center">Credits</th>
                        <th className="p-3.5">Assigned Faculty</th>
                        <th className="p-3.5">Syllabus Version</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Individual Subject Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                      {activeSemesterSubjects.map((sub) => {
                        const latestVersion = sub.syllabusVersions?.[0];
                        const versionText = latestVersion ? `v${latestVersion.versionNumber}` : "v1.0";

                        return (
                          <tr
                            key={sub.id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                              sub.isArchived ? "bg-amber-50/40 dark:bg-amber-950/20 text-slate-400" : ""
                            }`}
                          >
                            <td className="p-3.5 font-bold font-mono text-indigo-600 dark:text-indigo-400">{sub.code}</td>
                            <td className="p-3.5 text-slate-900 dark:text-white font-semibold">
                              {sub.title}
                              {sub.isArchived && <span className="ml-2 text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-bold">ARCHIVED</span>}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sub.subjectType === "CORE" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : sub.subjectType === "LAB" ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                                {sub.subjectType}
                              </span>
                            </td>
                            <td className="p-3.5 text-center font-bold">{sub.credits}</td>
                            <td className="p-3.5 text-slate-700 dark:text-slate-300">
                              {sub.faculty?.fullName || <span className="text-slate-400 italic">Unassigned</span>}
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-bold text-[11px] border border-emerald-300/40">
                                  {versionText}
                                </span>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sub.isActive && !sub.isArchived ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"}`}>
                                {sub.isArchived ? "Archived" : sub.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="p-3.5 text-right space-x-1">
                              {/* Individual Subject Actions */}
                              <button
                                onClick={() => setViewSubjectModal(sub)}
                                title="View Details"
                                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-semibold transition"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleOpenEditSubject(sub)}
                                title="Edit Subject Metadata"
                                className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 rounded-lg text-[11px] font-semibold transition border border-indigo-200 dark:border-indigo-800"
                              >
                                Edit Subject
                              </button>
                              <button
                                onClick={() => handleOpenSyllabusEditor(sub)}
                                title="Edit Syllabus Units & Objectives"
                                className="px-2.5 py-1.5 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-600 dark:text-purple-300 rounded-lg text-[11px] font-semibold transition border border-purple-200 dark:border-purple-800"
                              >
                                Edit Syllabus
                              </button>
                              <button
                                onClick={() => handleOpenVersionHistory(sub)}
                                title="View Version History"
                                className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 rounded-lg text-[11px] font-semibold transition border border-amber-200 dark:border-amber-800"
                              >
                                History
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Archive Management Integration Panel */}
            <div className="mt-8">
              <button
                onClick={() => setIsDeletePanelOpen(true)}
                className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-2 border border-amber-300 dark:border-amber-800"
              >
                <Archive className="w-4 h-4" /> Manage Archived Subjects ({subjects.filter((s) => s.isArchived).length} Archived)
              </button>

              <DeleteManagementPanel
                isOpen={isDeletePanelOpen}
                onClose={() => setIsDeletePanelOpen(false)}
                title="Subject Archiving & Restore Management"
                moduleName="Subject"
                records={subjects.map((s) => ({
                  id: s.id,
                  name: `${s.code} — ${s.title}`,
                  identifier: s.code,
                  subtext: `Semester ${s.semester} | Credits: ${s.credits}`,
                  isArchived: s.isArchived,
                }))}
                onConfirmArchive={async (recordId: string, reason: string) => {
                  const res = await fetch("/api/academics/subjects", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: recordId, isArchived: true, archivedReason: reason }),
                  });
                  const d = await res.json();
                  if (d.success) {
                    showToast("success", "Subject archived safely. Student attendance and grades preserved.");
                    fetchAllData();
                  } else throw new Error(d.error || "Failed to archive subject");
                }}
                onConfirmRestore={async (recordId: string) => {
                  const res = await fetch("/api/academics/subjects", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: recordId, isArchived: false }),
                  });
                  const d = await res.json();
                  if (d.success) {
                    showToast("success", "Subject restored successfully");
                    fetchAllData();
                  } else throw new Error(d.error || "Failed to restore subject");
                }}
              />
            </div>
          </div>
        );
      })()}

      {/* MODAL 1: EDIT / ADD SUBJECT MODAL */}
      {subjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-500" />
                {subjectModal.mode === "EDIT" ? `Edit Subject: ${subjectModal.subject?.code}` : "Add New Subject"}
              </h3>
              <button onClick={() => setSubjectModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestSaveSubject} className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Subject Code *</label>
                  <input
                    type="text"
                    required
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value)}
                    placeholder="e.g. CS301"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Semester *</label>
                  <select
                    value={subSemester}
                    onChange={(e) => setSubSemester(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Subject Title *</label>
                <input
                  type="text"
                  required
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  placeholder="e.g. Data Structures and Algorithms"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={subCredits}
                    onChange={(e) => setSubCredits(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Subject Type</label>
                  <select
                    value={subType}
                    onChange={(e) => setSubType(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="CORE">CORE (Theory)</option>
                    <option value="ELECTIVE">ELECTIVE</option>
                    <option value="LAB">LAB (Practical)</option>
                    <option value="PROJECT">PROJECT</option>
                    <option value="VALUE_ADDED">VALUE ADDED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Assigned Faculty</label>
                  <select
                    value={subFacultyId}
                    onChange={(e) => setSubFacultyId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="">Unassigned</option>
                    {faculties.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  value={subDescription}
                  onChange={(e) => setSubDescription(e.target.value)}
                  placeholder="Course objectives overview, prerequisites..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subIsActive}
                    onChange={(e) => setSubIsActive(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Active Status</span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSubjectModal(null)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-600/30"
                  >
                    Review Changes & Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBJECT CHANGE SUMMARY PREVIEW MODAL */}
      {subjectChangePreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Confirm Subject Changes (Old vs New)
            </h3>
            <p className="text-xs text-slate-500">
              Please review the change summary before applying edits to <strong>{subjectChangePreview.old.code}</strong>.
            </p>

            <div className="space-y-2 text-xs border rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50">
              <div className="grid grid-cols-3 font-semibold pb-1 border-b text-slate-500">
                <span>Field</span>
                <span>Old Value</span>
                <span>New Value</span>
              </div>
              {Object.keys(subjectChangePreview.old).map((key) => {
                const o = subjectChangePreview.old[key];
                const n = subjectChangePreview.new[key];
                const changed = o !== n;

                return (
                  <div key={key} className={`grid grid-cols-3 py-1 ${changed ? "bg-amber-100/50 dark:bg-amber-950/40 font-bold text-amber-800 dark:text-amber-300 px-1 rounded" : "text-slate-600 dark:text-slate-400"}`}>
                    <span className="capitalize">{key}</span>
                    <span>{String(o)}</span>
                    <span>{String(n)}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setSubjectChangePreview(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold">
                Back to Edit
              </button>
              <button onClick={executeSaveSubject} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-lg">
                Confirm & Save Edits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIGURABLE N-UNIT SYLLABUS EDITOR */}
      {syllabusEditorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-500" />
                  Configurable Syllabus Editor — {syllabusEditorModal.subject.code}: {syllabusEditorModal.subject.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Create a new immutable syllabus version for this subject. Existing versions remain pinned to historical student batches.
                </p>
              </div>
              <button onClick={() => setSyllabusEditorModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSyllabus} className="space-y-6 text-xs font-medium">
              {/* Regulation & Effective Metadata */}
              <div className="grid grid-cols-3 gap-4 bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800/40">
                <div>
                  <label className="block font-semibold text-purple-900 dark:text-purple-300 mb-1">Syllabus Title *</label>
                  <input
                    type="text"
                    required
                    value={sylTitle}
                    onChange={(e) => setSylTitle(e.target.value)}
                    className="w-full p-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-purple-900 dark:text-purple-300 mb-1">Regulation / Curriculum *</label>
                  <input
                    type="text"
                    required
                    value={sylRegulation}
                    onChange={(e) => setSylRegulation(e.target.value)}
                    className="w-full p-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-purple-900 dark:text-purple-300 mb-1">Effective Date *</label>
                  <input
                    type="date"
                    required
                    value={sylEffectiveFrom}
                    onChange={(e) => setSylEffectiveFrom(e.target.value)}
                    className="w-full p-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Mandatory Change Summary */}
              <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-300 dark:border-amber-800 space-y-1">
                <label className="block font-bold text-amber-900 dark:text-amber-300">
                  Mandatory Change Summary / Revision Notes *
                </label>
                <input
                  type="text"
                  required
                  value={sylChangeSummary}
                  onChange={(e) => setSylChangeSummary(e.target.value)}
                  placeholder="e.g. Updated Unit III to include Transformer Architectures & AI ethics guidelines"
                  className="w-full p-2.5 rounded-lg border border-amber-400 dark:border-amber-700 bg-white dark:bg-slate-800 font-semibold"
                />
                <p className="text-[10px] text-amber-700 dark:text-amber-400">
                  Required for immutable version control (e.g. v1.0 → v2.0 lineage tracking).
                </p>
              </div>

              {/* N-Units Dynamic Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Syllabus Units ({sylUnits.length} Units Configured)
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      setSylUnits([
                        ...sylUnits,
                        {
                          unitNumber: sylUnits.length + 1,
                          title: `Unit ${sylUnits.length + 1}: New Unit Title`,
                          topics: "",
                          description: "",
                          hours: 9,
                        },
                      ])
                    }
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Unit
                  </button>
                </div>

                <div className="space-y-3">
                  {sylUnits.map((u, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="text"
                          value={u.title}
                          onChange={(e) => {
                            const updated = [...sylUnits];
                            updated[idx].title = e.target.value;
                            setSylUnits(updated);
                          }}
                          className="font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border p-2 rounded-lg flex-1"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-semibold">Hours:</span>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={u.hours}
                            onChange={(e) => {
                              const updated = [...sylUnits];
                              updated[idx].hours = Number(e.target.value);
                              setSylUnits(updated);
                            }}
                            className="w-16 p-2 text-center font-bold bg-white dark:bg-slate-800 border rounded-lg"
                          />
                          {sylUnits.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setSylUnits(sylUnits.filter((_, i) => i !== idx))}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 font-semibold mb-1">Topics Covered (comma or newline separated)</label>
                        <textarea
                          rows={2}
                          value={u.topics}
                          onChange={(e) => {
                            const updated = [...sylUnits];
                            updated[idx].topics = e.target.value;
                            setSylUnits(updated);
                          }}
                          className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Course Objectives & Outcomes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Course Objectives (One per line)</label>
                  <textarea
                    rows={3}
                    value={sylObjectives}
                    onChange={(e) => setSylObjectives(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Course Outcomes (One per line)</label>
                  <textarea
                    rows={3}
                    value={sylOutcomes}
                    onChange={(e) => setSylOutcomes(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Textbooks & References */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Textbooks (One per line)</label>
                  <textarea
                    rows={2}
                    value={sylTextbooks}
                    onChange={(e) => setSylTextbooks(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reference Books (One per line)</label>
                  <textarea
                    rows={2}
                    value={sylRefbooks}
                    onChange={(e) => setSylRefbooks(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Assessment Info */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Assessment Info & Exam Distribution</label>
                <input
                  type="text"
                  value={sylAssessment}
                  onChange={(e) => setSylAssessment(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSyllabusEditorModal(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Publish New Syllabus Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VERSION HISTORY DRAWER */}
      {versionHistoryDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex justify-end">
          <div className="bg-white dark:bg-slate-900 max-w-xl w-full h-full p-6 border-l border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 overflow-y-auto animate-in slide-in-from-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-500" />
                  Syllabus Version Lineage: {versionHistoryDrawer.code}
                </h3>
                <p className="text-xs text-slate-500">{versionHistoryDrawer.title}</p>
              </div>
              <button onClick={() => setVersionHistoryDrawer(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {versionHistoryList.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No version history records found.</p>
              ) : (
                versionHistoryList.map((ver, idx) => (
                  <div
                    key={ver.id}
                    className={`p-4 rounded-xl border space-y-2 relative transition ${
                      ver.status === "ACTIVE"
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                          Version {ver.versionNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ver.status === "ACTIVE" ? "bg-emerald-200 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                          {ver.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(ver.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{ver.syllabusTitle}</p>
                    <p className="text-xs text-slate-500 italic">Regulation: {ver.regulation} ({ver.academicYearCode})</p>

                    {ver.changeSummary && (
                      <div className="text-[11px] p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        <strong>Change Summary:</strong> {ver.changeSummary}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 text-xs">
                      <span className="text-slate-400 text-[10px]">
                        Units: {Array.isArray(ver.units) ? ver.units.length : 0}
                      </span>
                      <div className="flex gap-2">
                        {idx > 0 && (
                          <button
                            onClick={() => setVersionDiffModal({ v1: versionHistoryList[idx], v2: versionHistoryList[0] })}
                            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                          >
                            <GitBranch className="w-3 h-3" /> Compare with Active
                          </button>
                        )}
                        {ver.status !== "ACTIVE" && (
                          <button
                            onClick={() => handleRestoreVersion(ver.id)}
                            className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Restore as New
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: SIDE-BY-SIDE VERSION DIFF VIEWER */}
      {versionDiffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-indigo-500" />
                Side-by-Side Version Diff Viewer (v{versionDiffModal.v1.versionNumber} vs v{versionDiffModal.v2.versionNumber})
              </h3>
              <button onClick={() => setVersionDiffModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-medium max-h-[60vh] overflow-y-auto p-2">
              {/* Version 1 */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-indigo-600">Version {versionDiffModal.v1.versionNumber} (Historical)</h4>
                <p><strong>Title:</strong> {versionDiffModal.v1.syllabusTitle}</p>
                <p><strong>Regulation:</strong> {versionDiffModal.v1.regulation}</p>
                <p><strong>Change Summary:</strong> {versionDiffModal.v1.changeSummary || "N/A"}</p>
                <p><strong>Units Count:</strong> {Array.isArray(versionDiffModal.v1.units) ? versionDiffModal.v1.units.length : 0}</p>
              </div>

              {/* Version 2 */}
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                <h4 className="font-bold text-emerald-600">Version {versionDiffModal.v2.versionNumber} (Active)</h4>
                <p><strong>Title:</strong> {versionDiffModal.v2.syllabusTitle}</p>
                <p><strong>Regulation:</strong> {versionDiffModal.v2.regulation}</p>
                <p><strong>Change Summary:</strong> {versionDiffModal.v2.changeSummary || "N/A"}</p>
                <p><strong>Units Count:</strong> {Array.isArray(versionDiffModal.v2.units) ? versionDiffModal.v2.units.length : 0}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setVersionDiffModal(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold">
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: VIEW SUBJECT MODAL */}
      {viewSubjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-500" />
                Subject Details: {viewSubjectModal.code}
              </h3>
              <button onClick={() => setViewSubjectModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p><strong>Subject Title:</strong> {viewSubjectModal.title}</p>
              <p><strong>Semester:</strong> Semester {viewSubjectModal.semester}</p>
              <p><strong>Credits:</strong> {viewSubjectModal.credits}</p>
              <p><strong>Type:</strong> {viewSubjectModal.subjectType}</p>
              <p><strong>Faculty:</strong> {viewSubjectModal.faculty?.fullName || "Unassigned"}</p>
              <p><strong>Description:</strong> {viewSubjectModal.description || "No description provided."}</p>
              <p><strong>Active Status:</strong> {viewSubjectModal.isActive ? "Active" : "Inactive"}</p>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setViewSubjectModal(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: EDIT SEMESTER MODAL */}
      {editSemesterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-500" />
                Edit Semester {editSemesterModal.semesterNumber} Info
              </h3>
              <button onClick={() => setEditSemesterModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestSaveSemester} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Semester Display Name</label>
                <input
                  type="text"
                  value={editSemesterModal.semesterName}
                  onChange={(e) => setEditSemesterModal({ ...editSemesterModal, semesterName: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editSemesterModal.startDate}
                    onChange={(e) => setEditSemesterModal({ ...editSemesterModal, startDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={editSemesterModal.endDate}
                    onChange={(e) => setEditSemesterModal({ ...editSemesterModal, endDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Status</label>
                <select
                  value={editSemesterModal.status}
                  onChange={(e) => setEditSemesterModal({ ...editSemesterModal, status: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="UPCOMING">UPCOMING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setEditSemesterModal(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl shadow-lg">
                  Review & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEMESTER CHANGE PREVIEW MODAL */}
      {semesterChangePreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Confirm Semester Metadata Update
            </h3>
            <p className="text-xs text-slate-500">Review changes before updating semester record.</p>

            <div className="space-y-2 text-xs border rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50">
              <div className="grid grid-cols-3 font-semibold pb-1 border-b text-slate-500">
                <span>Field</span>
                <span>Old</span>
                <span>New</span>
              </div>
              {Object.keys(semesterChangePreview.old).map((k) => (
                <div key={k} className="grid grid-cols-3 py-0.5">
                  <span className="capitalize">{k}</span>
                  <span>{semesterChangePreview.old[k]}</span>
                  <span>{semesterChangePreview.new[k]}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setSemesterChangePreview(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs">
                Cancel
              </button>
              <button onClick={executeSaveSemester} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-lg">
                Confirm & Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

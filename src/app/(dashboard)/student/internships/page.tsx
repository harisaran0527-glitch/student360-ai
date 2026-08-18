"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Briefcase,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Upload,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Search,
} from "lucide-react";

export default function StudentInternshipsPage() {
  const [internships, setInternships] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("timeline");

  // Multi-step submission modal
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Completion submission modal
  const [completionModalItem, setCompletionModalItem] = useState<any | null>(null);
  const [completionDocUrl, setCompletionDocUrl] = useState("");
  const [reportDocUrl, setReportDocUrl] = useState("");

  // Wizard Form State
  const [formData, setFormData] = useState({
    semester: 1,
    companyName: "",
    companyWebsite: "",
    industry: "Software & IT",
    domain: "Software Engineering",
    role: "",
    mode: "ONLINE",
    location: "",
    startDate: "",
    endDate: "",
    durationWeeks: 8,
    mentorName: "",
    mentorDesignation: "",
    mentorEmail: "",
    mentorContact: "",
    stipendType: "PAID",
    stipendAmount: "",
    offerLetterUrl: "",
    joiningLetterUrl: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();

      if (meData.user?.studentProfile) {
        setStudent(meData.user.studentProfile);
        setFormData((prev) => ({ ...prev, semester: meData.user.studentProfile.currentSemester }));

        const [iRes, cRes, oRes] = await Promise.all([
          fetch(`/api/internships?studentId=${meData.user.studentProfile.id}`),
          fetch("/api/internships/companies"),
          fetch("/api/internships/opportunities"),
        ]);
        const iData = await iRes.json();
        const cData = await cRes.json();
        const oData = await oRes.json();

        setInternships(iData.internships || []);
        setCompanies(cData.companies || []);
        setOpportunities(oData.opportunities || []);
      }
    } catch (err) {
      console.error("Failed to load internship data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Multi-step submit
  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/internships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, studentId: student.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      alert("Internship submitted successfully for faculty approval!");
      setIsWizardOpen(false);
      setWizardStep(1);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Completion Submit
  const handleCompletionSubmit = async () => {
    if (!completionModalItem) return;
    try {
      const res = await fetch("/api/internships/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internshipId: completionModalItem.id,
          action: "VERIFY_COMPLETION",
          certificateUrl: completionDocUrl,
          finalReportUrl: reportDocUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      alert("Completion certificate submitted! Automatically linked to your Certificate Vault.");
      setCompletionModalItem(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Semester-Wise Institutional Internship Portal"
        subtitle="Track multi-semester internships, NOC clearances, company directory & completion certificates"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Header Actions */}
        <div className="ui-card p-6 border-l-4 border-l-sky-600 bg-gradient-to-r from-sky-50/50 dark:from-sky-950/30 to-slate-50 dark:to-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
              Multi-Semester Career Development Center
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              Permanent Internship Dossier & NOC Clearances
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Track mandatory & elective internships across all semesters with faculty approval & auto certificate linking.
            </p>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="ui-card p-6 space-y-6">
          <Tabs
            tabs={[
              { id: "timeline", label: "Semester Internship Timeline", icon: Briefcase },
              { id: "companies", label: "Institutional Company Directory", count: companies.length, icon: Building2 },
              { id: "opportunities", label: "Internship Suggestions", count: opportunities.length, icon: Calendar },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* Tab 1: Semester Internship Timeline */}
          {activeTab === "timeline" && (
            <div className="space-y-6">
              {loading ? (
                <Skeleton className="h-48 rounded-2xl" />
              ) : (
                <>
                  {internships.length === 0 ? (
                    <div className="ui-card p-12 text-center text-slate-500 dark:text-slate-400 font-semibold border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                      <Briefcase className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-sm">No internship records available yet.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
                          const semInternships = internships.filter((i) => i.semester === sem);
                          const isCurrent = student?.currentSemester === sem;

                          return (
                            <div
                              key={sem}
                              className={`p-5 rounded-2xl border transition space-y-3 flex flex-col justify-between ${
                                isCurrent
                                  ? "border-sky-500 bg-sky-50/40 dark:bg-sky-950/20 shadow-md"
                                  : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                                    Semester {sem}
                                  </span>
                                  {isCurrent && <Badge variant="info">Current Term</Badge>}
                                </div>

                                {semInternships.length > 0 ? (
                                  <div className="space-y-3">
                                    {semInternships.map((internship: any) => (
                                      <div
                                        key={internship.id}
                                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs shadow-sm"
                                      >
                                        <div className="font-bold text-slate-900 dark:text-white">{internship.companyName}</div>
                                        <div className="text-sky-600 dark:text-sky-400 font-semibold">{internship.role}</div>
                                        
                                        <div className="space-y-1 text-[11px] text-slate-500">
                                          {internship.domain && <div>Domain: <strong>{internship.domain}</strong></div>}
                                          {internship.location && <div>Loc: <strong>{internship.location} ({internship.mode || "ONLINE"})</strong></div>}
                                          <div>Timeline: <strong>{internship.startDate} to {internship.endDate}</strong></div>
                                        </div>

                                        <div className="pt-1.5 flex items-center justify-between gap-2 flex-wrap border-t border-slate-100 dark:border-slate-800/80">
                                          <Badge
                                            variant={
                                              internship.status === "VERIFIED" || internship.status === "APPROVED" || internship.status.toUpperCase() === "COMPLETED"
                                                ? "success"
                                                : internship.status === "NEEDS_CHANGES"
                                                ? "warning"
                                                : "info"
                                            }
                                          >
                                            {internship.status.toUpperCase() === "COMPLETED" ? "COMPLETED ✓" : internship.status.replace("_", " ")}
                                          </Badge>

                                          {internship.status === "APPROVED" && (
                                            <button
                                              type="button"
                                              onClick={() => setCompletionModalItem(internship)}
                                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition shrink-0"
                                            >
                                              Verify Completion
                                            </button>
                                          )}
                                        </div>

                                        <div className="flex gap-2 pt-1 flex-wrap">
                                          {internship.offerLetterUrl && (
                                            <a href={internship.offerLetterUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-sky-600 hover:underline">
                                              Offer Letter
                                            </a>
                                          )}
                                          {internship.certificateUrl && (
                                            <a href={internship.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-600 hover:underline">
                                              Certificate
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="py-2 text-center text-[10px] text-slate-400/50 dark:text-slate-500/50 italic">
                                    Clean Term / Empty
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {(() => {
                        const unassignedInternships = internships.filter((i) => !i.semester || i.semester < 1 || i.semester > 8);
                        if (unassignedInternships.length === 0) return null;
                        return (
                          <div className="mt-8 space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-rose-500" />
                              <span>Semester Not Assigned / Archive Records</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {unassignedInternships.map((internship: any) => (
                                <div
                                  key={internship.id}
                                  className="p-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 space-y-3 flex flex-col justify-between"
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-xs text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                                        Unassigned Record
                                      </span>
                                    </div>
                                    <div className="space-y-1 text-xs">
                                      <div className="font-bold text-slate-900 dark:text-white">{internship.companyName}</div>
                                      <div className="text-sky-600 dark:text-sky-400 font-semibold">{internship.role}</div>
                                      <div className="text-[11px] text-slate-500">
                                        {internship.startDate} to {internship.endDate}
                                      </div>
                                      <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                                        <Badge
                                          variant={
                                            internship.status === "VERIFIED" || internship.status === "APPROVED" || internship.status.toUpperCase() === "COMPLETED"
                                              ? "success"
                                              : internship.status === "NEEDS_CHANGES"
                                              ? "warning"
                                              : "info"
                                          }
                                        >
                                          {internship.status.toUpperCase() === "COMPLETED" ? "COMPLETED ✓" : internship.status.replace("_", " ")}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>

                                  {internship.status === "APPROVED" && (
                                    <button
                                      type="button"
                                      onClick={() => setCompletionModalItem(internship)}
                                      className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition mt-2"
                                    >
                                      Submit Completion Proof →
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Tab 2: Company Directory */}
          {activeTab === "companies" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {companies.map((c) => (
                <div key={c.name} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50">
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{c.name}</div>
                  <div className="text-sky-600 font-semibold">{c.industry}</div>
                  <div className="text-slate-500">Domains: {c.domains.join(", ") || "General"}</div>
                  <div className="text-slate-500">Locations: {c.locations.join(", ") || "Remote"}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Internship Opportunities */}
          {activeTab === "opportunities" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {opportunities.map((o) => (
                <div key={o.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-base block">{o.role}</span>
                      <span className="text-sky-600 font-semibold">{o.companyName} ({o.location})</span>
                    </div>
                    <Badge variant="info">{o.mode}</Badge>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{o.description}</p>
                  <div className="text-slate-500 font-mono text-[11px]">Deadline: {o.deadline} | Slots: {o.availableSlots}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Multi-Step Internship Submission Wizard Modal */}
      <Modal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} title={`Multi-Step Internship Submission (Step ${wizardStep} of 6)`} maxWidth="2xl">
        <form onSubmit={handleWizardSubmit} className="space-y-4 text-xs">
          {/* Step 1: Company Details */}
          {wizardStep === 1 && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs">Step 1: Company Information</h4>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g. Google / Microsoft / Zoho"
                  className="ui-input w-full p-2"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company Website</label>
                <input
                  type="url"
                  value={formData.companyWebsite}
                  onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                  placeholder="https://company.com"
                  className="ui-input w-full p-2"
                />
              </div>
            </div>
          )}

          {/* Step 2: Internship Details */}
          {wizardStep === 2 && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs">Step 2: Role & Mode Details</h4>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Role / Position *</label>
                <input
                  type="text"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Software Engineering Intern"
                  className="ui-input w-full p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mode *</label>
                  <select
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                    className="ui-input w-full p-2"
                  >
                    <option value="ONLINE">ONLINE (Remote)</option>
                    <option value="OFFLINE">OFFLINE (On-Site)</option>
                    <option value="HYBRID">HYBRID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Chennai / Bengaluru"
                    className="ui-input w-full p-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Dates */}
          {wizardStep === 3 && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs">Step 3: Dates & Duration</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="ui-input w-full p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="ui-input w-full p-2 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Mentor Info */}
          {wizardStep === 4 && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs">Step 4: Industry Mentor Info</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mentor Name</label>
                  <input
                    type="text"
                    value={formData.mentorName}
                    onChange={(e) => setFormData({ ...formData, mentorName: e.target.value })}
                    placeholder="Mentor Full Name"
                    className="ui-input w-full p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mentor Email</label>
                  <input
                    type="email"
                    value={formData.mentorEmail}
                    onChange={(e) => setFormData({ ...formData, mentorEmail: e.target.value })}
                    placeholder="mentor@company.com"
                    className="ui-input w-full p-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Documents */}
          {wizardStep === 5 && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs">Step 5: Document Uploads</h4>
              <div className="p-4 border border-dashed rounded-xl text-center">
                <Upload className="w-5 h-5 mx-auto text-sky-600" />
                <div className="text-xs font-semibold mt-1">Upload Offer / Selection Letter (PDF)</div>
              </div>
            </div>
          )}

          {/* Step 6: Review & Submit */}
          {wizardStep === 6 && (
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs">Step 6: Review & Final Submission</h4>
              <div className="p-4 rounded-xl bg-slate-50 border space-y-1">
                <div>Company: <strong>{formData.companyName}</strong></div>
                <div>Role: <strong>{formData.role} ({formData.mode})</strong></div>
                <div>Dates: <strong>{formData.startDate} to {formData.endDate}</strong></div>
              </div>
            </div>
          )}

          {/* Wizard Actions */}
          <div className="pt-3 border-t flex justify-between">
            {wizardStep > 1 ? (
              <button
                type="button"
                onClick={() => setWizardStep(wizardStep - 1)}
                className="px-4 py-2 rounded-xl bg-slate-100 font-semibold"
              >
                Back
              </button>
            ) : <div />}

            {wizardStep < 6 ? (
              <button
                type="button"
                onClick={() => setWizardStep(wizardStep + 1)}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
              >
                Next Step →
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md"
              >
                {submitting ? "Submitting..." : "Submit Internship"}
              </button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}

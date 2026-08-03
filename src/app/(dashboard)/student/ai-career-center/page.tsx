"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Sparkles,
  ShieldCheck,
  Target,
  Compass,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  FolderGit2,
  Briefcase,
  HelpCircle,
  Clock,
  ChevronRight,
  Award,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";

export default function StudentAICareerCenterPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [savingPreference, setSavingPreference] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch available roles
      const rolesRes = await fetch("/api/ai/roles");
      const rolesData = await rolesRes.json();
      setRoles(rolesData.roles || []);

      // Fetch student AI insights
      const res = await fetch("/api/ai/student-insights");
      const insightsData = await res.json();
      setData(insightsData);

      if (insightsData.targetRoleProfile) {
        const currentRole = (rolesData.roles || []).find(
          (r: any) => r.roleName === insightsData.targetRoleProfile.roleName
        );
        if (currentRole) setSelectedRoleId(currentRole.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleChange = async (newRoleId: string) => {
    setSelectedRoleId(newRoleId);
    setSavingPreference(true);
    try {
      await fetch("/api/ai/career-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRoleId: newRoleId }),
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPreference(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Student AI Career & Support Intelligence Center"
          subtitle="Explainable rule-based career guidance & skill gap analysis"
        />
        <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  const {
    supportAttention,
    targetRoleProfile,
    internshipRecommendations,
    skillGap,
    learningRoadmap,
    careerPrep,
    historicalSnapshots,
  } = data || {};

  const attentionLevel = supportAttention?.attentionLevel || "LOW_ATTENTION";

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="Student AI Career & Support Intelligence Center"
        subtitle="Transparent, explainable intelligence engine v1.0 powered by factual Student360 records"
      />

      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Banner & Disclaimer */}
        <div className="ui-card p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="relative z-10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-indigo-200 border border-white/10">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                Rule-Based Insight — Engine v1.0
              </span>
              <span className="text-[11px] text-slate-300 font-mono">
                Academic Year: {data?.studentInfo?.academicYear} | Sem: {data?.studentInfo?.currentSemester}
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Explainable Career & Support Intelligence
              </h2>
              <p className="text-xs text-indigo-200/90 mt-1 max-w-3xl leading-relaxed">
                All insights displayed below use transparent institutional baseline rules. Results explicitly distinguish between <strong>VERIFIED EVIDENCE</strong> (approved certificates, projects & internships) and <strong>SELF-REPORTED DATA</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 1: Student Support Attention Analysis */}
        <div className="ui-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Academic & Administrative Compliance
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>Support Attention Analysis</span>
              </h3>
            </div>

            <div>
              {attentionLevel === "HIGH_ATTENTION" && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  Support Attention Level: HIGH
                </span>
              )}
              {attentionLevel === "MEDIUM_ATTENTION" && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  Support Attention Level: MEDIUM
                </span>
              )}
              {attentionLevel === "LOW_ATTENTION" && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  Support Attention Level: LOW (On Track)
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Factors Detected */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Contributing Institutional Factors
              </h4>
              <ul className="space-y-2">
                {supportAttention?.factors.map((f: string, idx: number) => (
                  <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                Actionable Guidance & Next Steps
              </h4>
              <ul className="space-y-2">
                {supportAttention?.recommendations.map((r: string, idx: number) => (
                  <li key={idx} className="text-xs text-indigo-950 dark:text-indigo-200 font-medium flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono flex flex-wrap justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
            <span>Engine: {supportAttention?.engineVersion}</span>
            <span>Limitation: Rule-based evaluation derived from official institutional database logs</span>
          </div>
        </div>

        {/* SECTION 2: Target Career Role Selection */}
        <div className="ui-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Career Goal Configuration
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                <Target className="w-5 h-5 text-indigo-600" />
                <span>Target Career Role Profile</span>
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Select Target Role:
              </label>
              <select
                value={selectedRoleId}
                onChange={(e) => handleRoleChange(e.target.value)}
                disabled={savingPreference}
                className="ui-input py-2 px-3 text-xs font-bold bg-white dark:bg-slate-900"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roleName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-base">
              {targetRoleProfile?.roleName}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {targetRoleProfile?.description}
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Core Skills Required:</span>
              {targetRoleProfile?.coreSkills?.map((s: string) => (
                <span key={s} className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 font-semibold text-[11px]">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 3: Skill Gap Analysis */}
        <div className="ui-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Evidence-Based Skill Audit
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <span>Skill Gap Analysis — {targetRoleProfile?.roleName}</span>
              </h3>
            </div>
            <Badge variant="info">Engine v1.0</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Verified Existing Skills */}
            <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  VERIFIED EXISTING SKILLS ({skillGap?.verifiedExistingSkills?.length || 0})
                </h4>
                <Badge variant="success">★ VERIFIED</Badge>
              </div>
              <div className="space-y-1.5">
                {skillGap?.verifiedExistingSkills?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No verified skills recorded yet.</p>
                ) : (
                  skillGap?.verifiedExistingSkills?.map((s: any) => (
                    <div key={s.name} className="flex justify-between items-center text-xs p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50">
                      <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">{s.level}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Self-Reported Skills */}
            <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  SELF-REPORTED SKILLS ({skillGap?.selfReportedSkills?.length || 0})
                </h4>
                <Badge variant="warning">UNVERIFIED</Badge>
              </div>
              <div className="space-y-1.5">
                {skillGap?.selfReportedSkills?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No self-reported skills.</p>
                ) : (
                  skillGap?.selfReportedSkills?.map((s: any) => (
                    <div key={s.name} className="flex justify-between items-center text-xs p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50">
                      <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                      <span className="text-[10px] text-amber-600 font-semibold">Self-Reported</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Missing Core Skills */}
            <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                  MISSING CORE SKILLS ({skillGap?.missingCoreSkills?.length || 0})
                </h4>
                <Badge variant="danger">PRIORITY GAP</Badge>
              </div>
              <div className="space-y-1.5">
                {skillGap?.missingCoreSkills?.length === 0 ? (
                  <p className="text-xs text-emerald-600 font-semibold">All core skills verified!</p>
                ) : (
                  skillGap?.missingCoreSkills?.map((s: string) => (
                    <div key={s} className="text-xs p-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 font-bold text-rose-700 dark:text-rose-400">
                      • {s}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Suggested Next Skills */}
            <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                  SUGGESTED NEXT SKILLS
                </h4>
                <Badge variant="purple">RECOMMENDED</Badge>
              </div>
              <div className="space-y-1.5">
                {skillGap?.suggestedNextSkills?.map((s: string, idx: number) => (
                  <div key={s} className="text-xs p-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                    <span>{idx + 1}. {s}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Internship Domain Recommendation */}
        <div className="ui-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Evidence Provenance Matching
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <span>Recommended Internship Domains</span>
              </h3>
            </div>
            <Badge variant="info">Zero Fake Percentages</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {internshipRecommendations?.topRecommendations?.slice(0, 6).map((rec: any) => (
              <div
                key={rec.domain}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">
                      {rec.domain}
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Verified matches: {rec.verifiedSkillMatchesCount} / {rec.totalDomainCoreSkillsCount} core skills
                    </span>
                  </div>

                  {rec.matchCategory === "STRONG_MATCH" && <Badge variant="success">STRONG MATCH</Badge>}
                  {rec.matchCategory === "MODERATE_MATCH" && <Badge variant="warning">MODERATE MATCH</Badge>}
                  {rec.matchCategory === "EXPLORATORY_MATCH" && <Badge variant="info">EXPLORATORY</Badge>}
                </div>

                {/* Evidence Rationale */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> Why am I seeing this?
                  </span>
                  {rec.explanation.map((exp: string, idx: number) => (
                    <p key={idx} className="text-slate-600 dark:text-slate-400 text-[11px]">
                      • {exp}
                    </p>
                  ))}
                </div>

                {/* Next Action */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold block">
                    Recommended Action:
                  </span>
                  <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                    {rec.recommendedNextAction}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5: Personalized Learning Roadmap */}
        <div className="ui-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Structured Phased Development
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                <Compass className="w-5 h-5 text-indigo-600" />
                <span>Personalized Learning Roadmap — {learningRoadmap?.targetRole}</span>
              </h3>
            </div>
          </div>

          <div className="space-y-4">
            {learningRoadmap?.phases?.map((phase: any) => (
              <div
                key={phase.phaseNumber}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      {phase.title}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {phase.skillOrObjective}
                  </h4>
                  <p className="text-xs text-slate-500">Why: {phase.whyRecommended}</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium pt-1">
                    Suggested Evidence: {phase.suggestedEvidence}
                  </p>
                </div>

                <div>
                  {phase.completionStatus === "COMPLETED" && <Badge variant="success">✓ COMPLETED</Badge>}
                  {phase.completionStatus === "IN_PROGRESS" && <Badge variant="warning">⏳ IN PROGRESS</Badge>}
                  {phase.completionStatus === "NOT_STARTED" && <Badge variant="info">○ NOT STARTED</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 6: Career Preparation Insights */}
        <div className="ui-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Factual Institutional Summary
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                <Award className="w-5 h-5 text-indigo-600" />
                <span>Career Preparation Summary</span>
              </h3>
            </div>
            <Badge variant="purple">Non-Score Modeling</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-2xl font-black text-indigo-600">{careerPrep?.summaryMetrics?.verifiedSkillsCount}</span>
              <span className="text-xs font-bold text-slate-500 block">Verified Skills</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-2xl font-black text-emerald-600">{careerPrep?.summaryMetrics?.verifiedProjectsCount}</span>
              <span className="text-xs font-bold text-slate-500 block">Verified Projects</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-2xl font-black text-sky-600">{careerPrep?.summaryMetrics?.verifiedInternshipsCount}</span>
              <span className="text-xs font-bold text-slate-500 block">Verified Internships</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-2xl font-black text-purple-600">{careerPrep?.summaryMetrics?.verifiedCertificatesCount}</span>
              <span className="text-xs font-bold text-slate-500 block">Certificates</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Interpretable Profile Tips
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              {careerPrep?.actionableSuggestions?.map((s: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* SECTION 7: Previous AI Insight History */}
        <div className="ui-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Semester AI Snapshot History ({historicalSnapshots?.length || 0})</span>
            </h3>
            <span className="text-xs text-slate-400">Preserved across semester promotion</span>
          </div>

          {historicalSnapshots?.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No previous snapshots stored yet.</p>
          ) : (
            <div className="space-y-2">
              {historicalSnapshots?.map((snap: any) => (
                <div key={snap.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {snap.insightType} — Sem {snap.semester} ({snap.academicYear})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{snap.engineVersion}</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {new Date(snap.generatedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

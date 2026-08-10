"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabItem } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { maskAadhaar } from "@/lib/security";
import {
  User,
  GraduationCap,
  Clock,
  Briefcase,
  FileCheck,
  Award,
  FolderGit2,
  Code2,
  Layers,
  FileText,
  History,
  ShieldAlert,
  ArrowLeft,
  Phone,
  MapPin,
  CreditCard,
  Building2,
  Eye,
  EyeOff,
  Bus,
} from "lucide-react";
import Link from "next/link";

export default function Student360ProfilePage({ params }: { params: { id: string } }) {
  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showFullAadhaar, setShowFullAadhaar] = useState(false);

  useEffect(() => {
    fetch(`/api/students/${params.id}`)
      .then((res) => res.json())
      .then((data) => setStudent(data.student))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex-1 p-8 space-y-6">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex-1 p-8 text-center text-slate-500">
        Student profile not found.
      </div>
    );
  }

  const profileTabs: TabItem[] = [
    { id: "overview", label: "Overview", icon: User },
    { id: "academics", label: "Academics", icon: GraduationCap, count: student.academicRecords?.length },
    { id: "attendance", label: "Attendance", icon: Clock, count: student.attendances?.length },
    { id: "internships", label: "Internships", icon: Briefcase, count: student.internships?.length },
    { id: "certificates", label: "Certificates", icon: FileCheck, count: student.certificates?.length },
    { id: "achievements", label: "Achievements", icon: Award, count: student.achievements?.length },
    { id: "projects", label: "Projects", icon: FolderGit2, count: student.projects?.length },
    { id: "skills", label: "Skills", icon: Code2, count: student.skills?.length },
    { id: "placement", label: "Placement", icon: Layers, count: student.placementRecords?.length },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "timeline", label: "Timeline", icon: History },
    { id: "audit", label: "Audit History", icon: ShieldAlert },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title={`Student 360° Profile - ${student.fullName}`}
        subtitle={`Register No: ${student.registerNo} | Roll No: ${student.rollNo} | Adm No: ${student.admissionNo}`}
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/master-records"
            className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Student Master Directory</span>
          </Link>
        </div>

        {/* Master Identity Banner */}
        <div className="ui-card p-6 border-l-4 border-l-indigo-600 bg-gradient-to-r from-slate-50 dark:from-slate-900 to-indigo-50/30 dark:to-indigo-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-indigo-500/20">
              {student.fullName[0]}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {student.fullName}
              </h1>
              <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 font-semibold">
                Register: {student.registerNo} | Roll: {student.rollNo} | Adm: {student.admissionNo}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="purple">Dept: {student.department?.code}</Badge>
                <Badge variant="info">Batch: {student.batch?.name}</Badge>
                <Badge variant="info">Semester {student.currentSemester}</Badge>
                <Badge variant="success">CGPA: {student.cgpa}</Badge>
                <Badge variant="info">Attendance: {student.attendancePercentage}%</Badge>
                <Badge variant={student.isArchived ? "purple" : "success"}>
                  {student.isArchived ? "Archived in Storage" : student.academicStatus}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* 12 Multi-Tab System */}
        <div className="ui-card p-6 space-y-6">
          <Tabs tabs={profileTabs} activeTab={activeTab} onChange={setActiveTab} />

          {/* Tab 1: Comprehensive Institutional Master Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6 text-xs text-slate-800 dark:text-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Personal Master Fields */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white uppercase text-[11px] border-b pb-2 border-slate-200 dark:border-slate-700">
                    <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Personal Profile</span>
                  </div>
                  <div><span className="text-slate-500 dark:text-slate-400">Full Name:</span> <strong>{student.fullName}</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Gender:</span> <strong>{student.gender}</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Date of Birth:</span> <strong>{student.dob}</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Blood Group:</span> <strong>{student.bloodGroup || "N/A"}</strong></div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Aadhaar Number:</span>{" "}
                      <strong className="font-mono">
                        {showFullAadhaar ? student.aadharNo || "N/A" : maskAadhaar(student.aadharNo)}
                      </strong>
                    </div>
                    {student.aadharNo && (
                      <button
                        onClick={() => setShowFullAadhaar(!showFullAadhaar)}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition"
                        title={showFullAadhaar ? "Hide Aadhaar" : "Unmask Aadhaar (Admin Only)"}
                      >
                        {showFullAadhaar ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Contact & Family Info */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white uppercase text-[11px] border-b pb-2 border-slate-200 dark:border-slate-700">
                    <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Contact & Family Info</span>
                  </div>
                  <div><span className="text-slate-500 dark:text-slate-400">Email:</span> <strong>{student.email}</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Phone:</span> <strong>{student.phone}</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Father&apos;s Name:</span> <strong>{student.fatherName}</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Mother&apos;s Name:</span> <strong>{student.motherName}</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Emergency Contact:</span> <strong>{student.emergencyPhone}</strong></div>
                </div>

                {/* Institutional Academic Setup */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white uppercase text-[11px] border-b pb-2 border-slate-200 dark:border-slate-700">
                    <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Institutional Academic Setup</span>
                  </div>
                  <div><span className="text-slate-500 dark:text-slate-400">Department:</span> <strong>{student.department?.name} ({student.department?.code})</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Batch Name:</span> <strong>{student.batch?.name}</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Academic Year:</span> <strong>{student.academicYear || DEFAULT_ACADEMIC_YEAR}</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Current Semester:</span> <strong>Semester {student.currentSemester}</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Entry Type:</span> <strong>{student.entryType}</strong></div>
                </div>
              </div>

              {/* Address & Quota Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white uppercase text-[11px] border-b pb-2 border-slate-200 dark:border-slate-700">
                    <MapPin className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>Residential Address</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                    {student.addressLine1} {student.addressLine2 ? `, ${student.addressLine2}` : ""}, {student.city}, {student.state} - {student.pincode}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white uppercase text-[11px] border-b pb-2 border-slate-200 dark:border-slate-700">
                    <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Admission Quota & Residence</span>
                  </div>
                  <div><span className="text-slate-500 dark:text-slate-400">Admission Quota:</span> <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{student.admissionQuota === "GQ" ? "Government Quota (GQ)" : student.admissionQuota === "MQ" ? "Management Quota (MQ)" : "Not Assigned"}</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Residence Type:</span> <strong>{student.residenceType}</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Admission Date:</span> <strong>{student.admissionDate}</strong></div>
                </div>
              </div>

              {/* Demographic & Institutional Quotas + Bus Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white uppercase text-[11px] border-b pb-2 border-slate-200 dark:border-slate-700">
                    <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Demographic & Category Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-500 dark:text-slate-400">Religion:</span> <strong>{student.religion || "N/A"}</strong></div>
                    <div><span className="text-slate-500 dark:text-slate-400">Community:</span> <strong>{student.community || "N/A"}</strong></div>
                    <div><span className="text-slate-500 dark:text-slate-400">Mother Tongue:</span> <strong>{student.motherTongue || "N/A"}</strong></div>
                    <div><span className="text-slate-500 dark:text-slate-400">Degree Level:</span> <strong>{student.degreeLevel || "N/A"}</strong></div>
                    <div><span className="text-slate-500 dark:text-slate-400">7.5% Reservation:</span> <strong>{student.reservation75 || "N/A"}</strong></div>
                    <div><span className="text-slate-500 dark:text-slate-400">First Graduate:</span> <strong>{student.firstGraduate || "N/A"}</strong></div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white uppercase text-[11px] border-b pb-2 border-slate-200 dark:border-slate-700">
                    <Bus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>BUS DETAILS</span>
                  </div>
                  {student.busRecord ? (
                    <div className="space-y-1.5 text-xs">
                      <div><span className="text-slate-500 dark:text-slate-400">Name:</span> <strong>{student.fullName}</strong></div>
                      <div><span className="text-slate-500 dark:text-slate-400">Resident:</span> <strong>{student.busRecord.resident}</strong></div>
                      <div><span className="text-slate-500 dark:text-slate-400">Bus No:</span> <strong>{student.busRecord.busNo}</strong></div>
                      <div><span className="text-slate-500 dark:text-slate-400">Route:</span> <strong>{student.busRecord.route}</strong></div>
                      <div><span className="text-slate-500 dark:text-slate-400">Boarding Point:</span> <strong>{student.busRecord.boardingPoint}</strong></div>
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 italic text-xs py-2">No bus details assigned.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Academics */}
          {activeTab === "academics" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 font-semibold uppercase text-slate-500 dark:text-slate-400">
                    <th className="py-2.5">Sem</th>
                    <th className="py-2.5">Course</th>
                    <th className="py-2.5">Internal</th>
                    <th className="py-2.5">External</th>
                    <th className="py-2.5">Total</th>
                    <th className="py-2.5">Grade</th>
                    <th className="py-2.5">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {student.academicRecords?.map((r: any) => (
                    <tr key={r.id}>
                      <td className="py-3 font-bold text-indigo-600 dark:text-indigo-400">Sem {r.semester}</td>
                      <td className="py-3 font-semibold text-slate-900 dark:text-white">{r.course?.code}: {r.course?.title}</td>
                      <td className="py-3">{r.internalMarks}</td>
                      <td className="py-3">{r.externalMarks}</td>
                      <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">{r.totalMarks}</td>
                      <td className="py-3 font-bold">{r.grade}</td>
                      <td className="py-3"><Badge variant="success">{r.result}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Attendance */}
          {activeTab === "attendance" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span>Overall Attendance Aggregate:</span>
                <span className="text-xl font-bold text-sky-600 dark:text-sky-400">{student.attendancePercentage}%</span>
              </div>
            </div>
          )}

          {/* Tab 4: Internships */}
          {activeTab === "internships" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {student.internships?.map((i: any) => (
                <div key={i.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>{i.companyName}</span>
                    <Badge variant="success">{i.status}</Badge>
                  </div>
                  <div className="text-indigo-600 dark:text-indigo-400 font-semibold">{i.role}</div>
                  <div className="text-slate-500">{i.startDate} to {i.endDate}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 5: Certificates */}
          {activeTab === "certificates" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {student.certificates?.map((c: any) => (
                <div key={c.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>{c.title}</span>
                    <Badge variant="purple">{c.verificationStatus}</Badge>
                  </div>
                  <div className="text-slate-500">Issued by: {c.issuingBody} ({c.issueDate})</div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 6: Achievements */}
          {activeTab === "achievements" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {student.achievements?.map((a: any) => (
                <div key={a.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>{a.title}</span>
                    <Badge variant="success">{a.position}</Badge>
                  </div>
                  <div className="text-slate-500">Organized by: {a.organizer}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 7: Projects */}
          {activeTab === "projects" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {student.projects?.map((p: any) => (
                <div key={p.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white block">{p.title}</span>
                  <p className="text-slate-500">{p.description}</p>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[10px] block">{p.techStack}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tab 8: Skills */}
          {activeTab === "skills" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {student.skills?.map((s: any) => (
                <div key={s.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white block">{s.name}</span>
                  <span className="text-slate-500 text-[10px] block">{s.proficiency}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tab 9: Placement */}
          {activeTab === "placement" && (
            <div className="space-y-3 text-xs">
              {student.placementRecords?.map((pl: any) => (
                <div key={pl.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{pl.companyName}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{pl.jobTitle}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm block">₹{pl.packageLpa} LPA</span>
                    <Badge variant="success">{pl.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 10: Documents */}
          {activeTab === "documents" && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span>Master Admission Form PDF</span>
                <Badge variant="info">Verified Document</Badge>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span>Semester Transcripts Dossier</span>
                <Badge variant="info">Verified Document</Badge>
              </div>
            </div>
          )}

          {/* Tab 11: Timeline */}
          {activeTab === "timeline" && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">Admission Enrolled</span> - {student.admissionDate}
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">Current Semester Active</span> - Semester {student.currentSemester}
              </div>
            </div>
          )}

          {/* Tab 12: Audit History */}
          {activeTab === "audit" && (
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-500">
                [SYSTEM LOG] Master Profile initialized on {new Date(student.createdAt).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

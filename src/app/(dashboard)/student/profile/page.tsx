import React from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { User, Mail, Phone, MapPin, GraduationCap, ShieldCheck, Heart } from "lucide-react";

export default async function StudentProfilePage() {
  const session = await getSession();
  const student = await prisma.studentProfile.findFirst({
    where: { userId: session?.id },
    include: { department: true, batch: true, section: true },
  });

  if (!student) {
    return <div className="p-8 text-center text-slate-400">Student Profile not found.</div>;
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Master Digital Student Profile"
        subtitle="Permanent 360° Institutional Record (Reference Schema Compliant)"
      />

      <div className="p-8 space-y-6 max-w-5xl mx-auto w-full">
        {/* Profile Card Header */}
        <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 to-slate-900 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-indigo-500/30">
              {student.fullName[0]}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">{student.fullName}</h2>
              <p className="text-indigo-300 font-mono text-xs mt-0.5">
                Register: {student.registerNo} | Roll: {student.rollNo} | Adm: {student.admissionNo}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="purple">Department: {student.department.code}</Badge>
                <Badge variant="info">Batch: {student.batch.name}</Badge>
                <Badge variant="success">CGPA: {student.cgpa}</Badge>
                <Badge variant="default">
                  Quota: {student.admissionQuota === "GQ" ? "Government Quota (GQ)" : student.admissionQuota === "MQ" ? "Management Quota (MQ)" : "Not Assigned"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-200">
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
              <User className="w-4 h-4 text-indigo-400" />
              <span>Personal Details</span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-slate-400">Gender:</span> <strong className="text-white">{student.gender}</strong></div>
              <div><span className="text-slate-400">Date of Birth:</span> <strong className="text-white">{student.dob}</strong></div>
              <div><span className="text-slate-400">Blood Group:</span> <strong className="text-white">{student.bloodGroup || "N/A"}</strong></div>
              <div><span className="text-slate-400">Aadhar No:</span> <strong className="text-white">{student.aadharNo || "N/A"}</strong></div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>Contact & Guardian Info</span>
            </h3>
            <div className="space-y-1.5">
              <div><span className="text-slate-400">Email:</span> <strong className="text-white">{student.email}</strong></div>
              <div><span className="text-slate-400">Phone:</span> <strong className="text-white">{student.phone}</strong></div>
              <div><span className="text-slate-400">Father&apos;s Name:</span> <strong className="text-white">{student.fatherName}</strong></div>
              <div><span className="text-slate-400">Mother&apos;s Name:</span> <strong className="text-white">{student.motherName}</strong></div>
              <div><span className="text-slate-400">Emergency Phone:</span> <strong className="text-white">{student.emergencyPhone}</strong></div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3 text-xs">
          <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
            <MapPin className="w-4 h-4 text-purple-400" />
            <span>Permanent Residence Address</span>
          </h3>
          <p className="text-slate-200">
            {student.addressLine1}, {student.addressLine2 ? `${student.addressLine2}, ` : ''}
            {student.city}, {student.state} - {student.pincode}
          </p>
        </div>
      </div>
    </div>
  );
}

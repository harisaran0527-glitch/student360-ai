import React from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { User, Mail, MapPin, AlertCircle, Bus, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentProfilePage() {
  const session = await getSession();

  let student: any = null;
  if (session?.id) {
    try {
      student = await prisma.studentProfile.findFirst({
        where: { userId: session.id },
        include: { department: true, batch: true, section: true, busRecord: true },
      });
    } catch (err) {
      console.error("[STUDENT_PROFILE_DB_ERROR]", err);
    }
  }

  const fullName = student?.fullName || session?.fullName || "Student Profile";
  const firstLetter = (fullName[0] || "S").toUpperCase();
  const registerNo = student?.registerNo || "N/A";
  const rollNo = student?.rollNo || "N/A";
  const admissionNo = student?.admissionNo || "N/A";
  const deptCode = student?.department?.code || "AIML";
  const batchName = student?.batch?.name || "N/A";
  const sectionName = student?.section?.name || "N/A";
  const cgpaVal = student?.cgpa ?? 0;
  const quota = student?.admissionQuota === "GQ" ? "Government Quota (GQ)" : student?.admissionQuota === "MQ" ? "Management Quota (MQ)" : (student?.admissionQuota || "Not Assigned");

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Master Digital Student Profile"
        subtitle="Permanent 360° Institutional Record (Reference Schema Compliant)"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
        {!student && (
          <div className="ui-card p-4 border-l-4 border-l-amber-500 bg-amber-500/10 text-amber-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold">Student Profile Record Unassigned</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                Your login account ({session?.email || "Student"}) is active, but your official register record is pending administrative linking.
              </p>
            </div>
          </div>
        )}

        {/* Profile Card Header */}
        <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 to-slate-900 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-indigo-500/30">
              {firstLetter}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">{fullName}</h2>
              <p className="text-indigo-300 font-mono text-xs mt-0.5">
                Register: {registerNo} | Roll: {rollNo} | Adm: {admissionNo}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="purple">Department: {deptCode}</Badge>
                {student?.academicYear && <Badge variant="info">AY: {student.academicYear}</Badge>}
                {sectionName !== "N/A" && <Badge variant="default">Section: {sectionName}</Badge>}
                <Badge variant="success">CGPA: {cgpaVal}</Badge>
                <Badge variant="default">Quota: {quota}</Badge>
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
              <div><span className="text-slate-400">Gender:</span> <strong className="text-white">{student?.gender || "N/A"}</strong></div>
              <div><span className="text-slate-400">Date of Birth:</span> <strong className="text-white">{student?.dob || "N/A"}</strong></div>
              <div><span className="text-slate-400">Blood Group:</span> <strong className="text-white">{student?.bloodGroup || "N/A"}</strong></div>
              <div><span className="text-slate-400">Aadhar No:</span> <strong className="text-white">{student?.aadharNo || "N/A"}</strong></div>
              <div><span className="text-slate-400">Religion:</span> <strong className="text-white">{student?.religion || "N/A"}</strong></div>
              <div><span className="text-slate-400">Community:</span> <strong className="text-white">{student?.community || "N/A"}</strong></div>
              <div><span className="text-slate-400">Mother Tongue:</span> <strong className="text-white">{student?.motherTongue || "N/A"}</strong></div>
              <div><span className="text-slate-400">Degree Level:</span> <strong className="text-white">{student?.degreeLevel || "N/A"}</strong></div>
              <div><span className="text-slate-400">7.5% Reservation:</span> <strong className="text-white">{student?.reservation75 || "N/A"}</strong></div>
              <div><span className="text-slate-400">First Graduate:</span> <strong className="text-white">{student?.firstGraduate || "N/A"}</strong></div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>Contact & Guardian Info</span>
            </h3>
            <div className="space-y-1.5">
              <div><span className="text-slate-400">Institutional Email ID:</span> <strong className="text-white">{student?.institutionalEmail || student?.email || session?.email || "N/A"}</strong></div>
              <div><span className="text-slate-400">Personal Email ID:</span> <strong className="text-white">{student?.personalEmail || "N/A"}</strong></div>
              <div><span className="text-slate-400">Phone:</span> <strong className="text-white">{student?.phone || "N/A"}</strong></div>
              <div><span className="text-slate-400">Father&apos;s Name:</span> <strong className="text-white">{student?.fatherName || "N/A"}</strong></div>
              <div><span className="text-slate-400">Mother&apos;s Name:</span> <strong className="text-white">{student?.motherName || "N/A"}</strong></div>
              <div><span className="text-slate-400">Emergency Phone:</span> <strong className="text-white">{student?.emergencyPhone || "N/A"}</strong></div>
            </div>
          </div>
        </div>

        {/* Residence Address & BUS DETAILS Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-200">
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
              <MapPin className="w-4 h-4 text-purple-400" />
              <span>Permanent Residence Address</span>
            </h3>
            <p className="text-slate-200">
              {student?.addressLine1 ? (
                <>
                  {student.addressLine1}, {student.addressLine2 ? `${student.addressLine2}, ` : ''}
                  {student.city || 'N/A'}, {student.state || 'N/A'} - {student.pincode || 'N/A'}
                </>
              ) : (
                <span className="text-slate-400 italic">Address Record Pending Completion</span>
              )}
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
              <Bus className="w-4 h-4 text-amber-400" />
              <span>BUS DETAILS</span>
            </h3>
            {student?.busRecord ? (
              <div className="space-y-1.5">
                <div><span className="text-slate-400">Name:</span> <strong className="text-white">{student.fullName}</strong></div>
                <div><span className="text-slate-400">Resident:</span> <strong className="text-white">{student.busRecord.resident}</strong></div>
                <div><span className="text-slate-400">Bus No:</span> <strong className="text-white">{student.busRecord.busNo}</strong></div>
                <div><span className="text-slate-400">Route:</span> <strong className="text-white">{student.busRecord.route}</strong></div>
                <div><span className="text-slate-400">Boarding Point:</span> <strong className="text-white">{student.busRecord.boardingPoint}</strong></div>
              </div>
            ) : (
              <p className="text-slate-400 italic py-1">No bus details assigned.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

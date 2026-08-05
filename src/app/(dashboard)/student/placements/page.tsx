import React from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Briefcase, Building, DollarSign, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentPlacementsPage() {
  const session = await getSession();
  const student = await prisma.studentProfile.findFirst({
    where: { userId: session?.id },
    include: { placementRecords: true },
  });

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Placement Drives & Job Offers Portfolio"
        subtitle="Institutional campus recruitment eligibility, drive applications & offer letter repository"
      />

      <div className="p-8 space-y-6 max-w-5xl mx-auto w-full">
        <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 to-slate-900 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Campus Placement Status</h2>
            <p className="text-xs text-slate-300 mt-1">Current CGPA ({student?.cgpa}) satisfies 95%+ corporate placement eligibility criteria.</p>
          </div>
          <Badge variant="success">Placement Eligible</Badge>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white">My Job Offers & Placement Records</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="pb-3">Company</th>
                  <th className="pb-3">Designation</th>
                  <th className="pb-3">Package (LPA)</th>
                  <th className="pb-3">Offer Date</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {student?.placementRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No job offers recorded yet for current placement cycle.
                    </td>
                  </tr>
                ) : (
                  student?.placementRecords.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-3 font-bold text-white">{p.companyName}</td>
                      <td className="py-3 font-semibold text-indigo-300">{p.jobTitle}</td>
                      <td className="py-3 font-bold text-emerald-400">₹{p.packageLpa} LPA</td>
                      <td className="py-3 font-mono text-slate-400">{p.offerDate}</td>
                      <td className="py-3"><Badge variant="success">{p.status}</Badge></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

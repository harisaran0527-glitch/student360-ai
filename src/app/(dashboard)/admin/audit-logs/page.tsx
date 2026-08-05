import React from "react";
import { Header } from "@/components/dashboard/Header";
import { prisma } from "@/lib/prisma";
import { ShieldAlert, User, Activity } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AuditLogsPage() {
  const auditLogs = await prisma.auditLog.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Immutable System Audit Logs"
        subtitle="Full audit trail tracking administrative, faculty, and student security actions"
      />

      <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              <span>Operational & Security Event Log (Last 50 Events)</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Action Performed</th>
                  <th className="p-3">Entity Type</th>
                  <th className="p-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No audit events logged yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 font-medium text-white">{log.userEmail || "System"}</td>
                      <td className="p-3">
                        <Badge variant="purple">{log.userRole || "SYSTEM"}</Badge>
                      </td>
                      <td className="p-3 font-bold text-indigo-300">{log.action}</td>
                      <td className="p-3">{log.entityType}</td>
                      <td className="p-3 font-mono text-slate-500">{log.ipAddress || "127.0.0.1"}</td>
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

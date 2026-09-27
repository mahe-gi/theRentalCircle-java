"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Loader2, Clock } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { getAdminAuditLogs } from "@/lib/connections-api";
import type { AdminActionResponse } from "@/types/property";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AdminActionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminAuditLogs(0, 50)
      .then((res) => setLogs(res.content || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-charcoal">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-charcoal-light hover:text-forest transition font-medium mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-forest-light text-forest">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal">
                Platform Audit Trail
              </h1>
              <p className="text-xs text-charcoal-light">
                Immutable chronological log of all administrator actions, moderation decisions, and document downloads.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-charcoal-light">
            <Loader2 className="w-8 h-8 animate-spin text-forest" />
            <span className="text-xs">Loading audit trail...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-white border border-[#E8E4DD] p-8 space-y-3">
            <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto" />
            <h2 className="font-serif font-bold text-lg text-charcoal">
              No audit logs recorded yet
            </h2>
            <p className="text-xs text-charcoal-light">
              Admin operations will be permanently recorded here.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#E8E4DD] rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-sand/60 border-b border-[#E8E4DD] text-charcoal-light uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Administrator</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Target</th>
                  <th className="p-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE1]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-sand/30 transition">
                    <td className="p-3.5 text-charcoal-light font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td className="p-3.5 font-bold text-charcoal">{log.adminName}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sand border border-[#E8E4DD] text-charcoal">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="text-charcoal font-medium">
                        {log.targetType} #{log.targetId}
                      </span>
                    </td>
                    <td className="p-3.5 text-charcoal-light max-w-md truncate">
                      {log.details || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

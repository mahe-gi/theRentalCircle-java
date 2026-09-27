"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Flag, ArrowLeft, Loader2, ShieldAlert, CheckCircle, AlertTriangle, X } from "lucide-react";
import { Navbar } from "@/components/navbar";
import {
  listAdminReports,
  investigateReport,
  resolveReport,
  dismissReport
} from "@/lib/connections-api";
import type { ReportResponse, ReportStatus, ResolutionAction } from "@/types/property";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<ReportStatus | "ALL">("ALL");

  // Review modal
  const [selectedReport, setSelectedReport] = useState<ReportResponse | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolutionAction, setResolutionAction] = useState<ResolutionAction>("HIDE_PROPERTY");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [dismissNotes, setDismissNotes] = useState("");

  const loadReports = () => {
    setLoading(true);
    const statusParam = filterStatus === "ALL" ? undefined : filterStatus;
    listAdminReports(statusParam, 0, 50)
      .then((res) => setReports(res.content || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReports();
  }, [filterStatus]);

  const handleInvestigate = async (reportId: number) => {
    setActionLoading(true);
    try {
      const updated = await investigateReport(reportId);
      setSelectedReport(updated);
      loadReports();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      await resolveReport(selectedReport.id, {
        action: resolutionAction,
        notes: resolutionNotes || undefined
      });
      setSelectedReport(null);
      setResolutionNotes("");
      loadReports();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      await dismissReport(selectedReport.id, dismissNotes || "No policy violation found");
      setSelectedReport(null);
      setDismissNotes("");
      loadReports();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

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
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
              <Flag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal">
                Violation Reports Queue
              </h1>
              <p className="text-xs text-charcoal-light">
                Investigate broker activity, duplicate listings, and enforce zero-brokerage rules.
              </p>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {(["ALL", "OPEN", "UNDER_INVESTIGATION", "RESOLVED", "DISMISSED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                filterStatus === s
                  ? "bg-forest text-white shadow-sm"
                  : "bg-white border border-[#E8E4DD] text-charcoal-light hover:text-charcoal"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-charcoal-light">
            <Loader2 className="w-8 h-8 animate-spin text-forest" />
            <span className="text-xs">Loading reports queue...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-white border border-[#E8E4DD] p-8 space-y-3">
            <Flag className="w-12 h-12 text-gray-300 mx-auto" />
            <h2 className="font-serif font-bold text-lg text-charcoal">
              No reports in this view
            </h2>
            <p className="text-xs text-charcoal-light">
              All reported listings and users have been reviewed.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#E8E4DD] rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-sand/60 border-b border-[#E8E4DD] text-charcoal-light uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">ID</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Target</th>
                  <th className="p-3.5">Reporter</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Reported At</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE1]">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-sand/30 transition">
                    <td className="p-3.5 font-bold text-charcoal">#{r.id}</td>
                    <td className="p-3.5 font-semibold text-rose-700">
                      {r.reason.replace("_", " ")}
                    </td>
                    <td className="p-3.5">
                      {r.propertyTitle ? (
                        <span className="font-medium text-charcoal">{r.propertyTitle}</span>
                      ) : r.reportedUserName ? (
                        <span className="text-charcoal">User: {r.reportedUserName}</span>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="p-3.5 text-charcoal-light">{r.reporterName}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === "OPEN"
                            ? "bg-amber-100 text-amber-800"
                            : r.status === "UNDER_INVESTIGATION"
                            ? "bg-blue-100 text-blue-800"
                            : r.status === "RESOLVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-charcoal-light">
                      {new Date(r.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedReport(r)}
                        className="px-3 py-1 rounded-lg bg-sand border border-[#E8E4DD] text-forest font-semibold hover:bg-forest hover:text-white transition"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT REVIEW MODAL */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
              <button
                onClick={() => setSelectedReport(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-rose-600" />
                <h3 className="text-lg font-serif font-bold text-charcoal">
                  Investigate Report #{selectedReport.id}
                </h3>
              </div>

              <div className="p-3 rounded-xl bg-sand/40 border border-[#E8E4DD]/60 space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-charcoal-light">Violation Category:</span>
                  <p className="font-bold text-rose-700">{selectedReport.reason}</p>
                </div>
                {selectedReport.propertyTitle && (
                  <div>
                    <span className="font-semibold text-charcoal-light">Associated Property:</span>
                    <p className="font-medium text-charcoal">
                      {selectedReport.propertyTitle} (ID: {selectedReport.propertyId})
                    </p>
                  </div>
                )}
                {selectedReport.description && (
                  <div>
                    <span className="font-semibold text-charcoal-light">Reporter Statement:</span>
                    <p className="text-charcoal italic bg-white p-2.5 rounded-lg border border-[#E8E4DD]">
                      &ldquo;{selectedReport.description}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {selectedReport.status === "OPEN" && (
                <button
                  type="button"
                  onClick={() => handleInvestigate(selectedReport.id)}
                  disabled={actionLoading}
                  className="w-full py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                >
                  {actionLoading ? "Processing..." : "Take Ownership & Investigate"}
                </button>
              )}

              {/* RESOLVE / DISMISS SECTION */}
              {selectedReport.status !== "RESOLVED" && selectedReport.status !== "DISMISSED" && (
                <div className="space-y-4 pt-2 border-t border-[#F0ECE1]">
                  <form onSubmit={handleResolve} className="space-y-3 text-xs">
                    <span className="font-bold text-charcoal block">Resolve with Action:</span>
                    <select
                      value={resolutionAction}
                      onChange={(e) => setResolutionAction(e.target.value as ResolutionAction)}
                      className="w-full p-2.5 rounded-xl border border-[#E8E4DD] bg-white font-medium"
                    >
                      <option value="HIDE_PROPERTY">Hide / Suspend Property Listing</option>
                      <option value="REJECT_PROPERTY">Reject Property Listing</option>
                      <option value="SUSPEND_USER">Suspend Reported User Account</option>
                      <option value="WARN">Issue Policy Warning</option>
                    </select>

                    <textarea
                      rows={2}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Enter moderator notes and resolution rationale..."
                      className="w-full p-2.5 rounded-xl border border-[#E8E4DD]"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDismiss}
                        disabled={actionLoading}
                        className="flex-1 py-2 rounded-xl border border-gray-300 text-charcoal hover:bg-gray-100 transition font-semibold"
                      >
                        Dismiss Report
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="flex-1 py-2 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition"
                      >
                        {actionLoading ? "Resolving..." : "Apply Resolution"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

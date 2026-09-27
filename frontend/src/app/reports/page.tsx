"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Flag, ArrowLeft, Loader2, Clock, CheckCircle } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { getMyReports } from "@/lib/connections-api";
import type { ReportResponse } from "@/types/property";

export default function MyReportsPage() {
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyReports(0, 50)
      .then((res) => setReports(res.content || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">Pending Review</span>;
      case "UNDER_INVESTIGATION":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">Under Investigation</span>;
      case "RESOLVED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">Resolved</span>;
      case "DISMISSED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">Dismissed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-charcoal">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/properties"
            className="inline-flex items-center gap-1.5 text-xs text-charcoal-light hover:text-forest transition font-medium mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Search
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
              <Flag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal">
                My Reports & Inquiries
              </h1>
              <p className="text-xs text-charcoal-light">
                Track status of violations reported for trust & safety review.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-charcoal-light">
            <Loader2 className="w-8 h-8 animate-spin text-forest" />
            <span className="text-xs">Loading reports...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-white border border-[#E8E4DD] p-8 space-y-3">
            <Flag className="w-12 h-12 text-gray-300 mx-auto" />
            <h2 className="font-serif font-bold text-lg text-charcoal">
              No reports filed
            </h2>
            <p className="text-xs text-charcoal-light max-w-sm mx-auto">
              If you discover a broker or misleading listing on RentalCircle, report it immediately to preserve zero-brokerage integrity.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-[#E8E4DD] rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0ECE1] pb-3">
                  <div>
                    <span className="text-xs font-bold text-charcoal block">
                      Violation: {r.reason.replace("_", " ")}
                    </span>
                    {r.propertyTitle && (
                      <span className="text-[11px] text-charcoal-light block">
                        Listing: {r.propertyTitle}
                      </span>
                    )}
                    <span className="text-[10px] text-charcoal-light">
                      Reported on {new Date(r.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <div>{getStatusBadge(r.status)}</div>
                </div>

                {r.description && (
                  <p className="text-xs text-charcoal-light italic">
                    &ldquo;{r.description}&rdquo;
                  </p>
                )}

                {r.status === "RESOLVED" && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Action taken by Admin team. Listing was moderated.</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

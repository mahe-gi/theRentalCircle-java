"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ArrowLeft, Loader2, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { getMyVisits, cancelVisit } from "@/lib/connections-api";
import type { VisitResponse } from "@/types/property";

export default function MyVisitsPage() {
  const [visits, setVisits] = useState<VisitResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadVisits = () => {
    getMyVisits(0, 50)
      .then((res) => setVisits(res.content || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadVisits();
  }, []);

  const handleCancel = async (visitId: number) => {
    if (!confirm("Are you sure you want to cancel this visit request?")) return;
    setActionLoading(visitId);
    try {
      await cancelVisit(visitId);
      loadVisits();
    } catch (err) {
      console.error("Cancel failed", err);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">Awaiting Owner Confirmation</span>;
      case "ACCEPTED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">Confirmed</span>;
      case "REJECTED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">Declined</span>;
      case "RESCHEDULED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">Rescheduled by Owner</span>;
      case "CANCELLED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">Cancelled</span>;
      case "COMPLETED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">Completed</span>;
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
            <div className="p-2.5 rounded-xl bg-forest-light text-forest">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal">
                My Scheduled Visits
              </h1>
              <p className="text-xs text-charcoal-light">
                Track appointments to visit zero-brokerage properties in person.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-charcoal-light">
            <Loader2 className="w-8 h-8 animate-spin text-forest" />
            <span className="text-xs">Loading scheduled visits...</span>
          </div>
        ) : visits.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-white border border-[#E8E4DD] p-8 space-y-3">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto" />
            <h2 className="font-serif font-bold text-lg text-charcoal">
              No visits scheduled yet
            </h2>
            <p className="text-xs text-charcoal-light max-w-sm mx-auto">
              Find a property you like and click &ldquo;Schedule Visit&rdquo; to meet the owner.
            </p>
            <Link
              href="/properties"
              className="inline-block px-5 py-2.5 rounded-xl bg-forest text-white text-xs font-semibold hover:bg-forest/90 transition shadow-sm"
            >
              Browse Properties
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {visits.map((v) => (
              <div
                key={v.id}
                className="bg-white border border-[#E8E4DD] rounded-2xl p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0ECE1] pb-3">
                  <div>
                    <Link
                      href={`/properties/${v.propertyId}`}
                      className="font-serif font-bold text-base text-charcoal hover:text-forest transition"
                    >
                      {v.propertyTitle}
                    </Link>
                    <span className="text-[11px] text-charcoal-light block">
                      {v.locality}, {v.city}
                    </span>
                  </div>
                  <div>{getStatusBadge(v.status)}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-sand/40 border border-[#E8E4DD]/60 space-y-1">
                    <span className="font-semibold text-charcoal-light block">
                      Scheduled Timing:
                    </span>
                    <p className="font-bold text-charcoal flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-forest" />
                      {v.rescheduledDate || v.preferredDate} at{" "}
                      {v.rescheduledTime || v.preferredTime}
                    </p>
                    {v.rescheduledDate && (
                      <span className="text-[10px] text-blue-700 block">
                        (Originally requested for {v.preferredDate} at {v.preferredTime})
                      </span>
                    )}
                  </div>

                  {v.ownerRemarks && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                      <span className="font-semibold block flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Owner Message:
                      </span>
                      <p>{v.ownerRemarks}</p>
                    </div>
                  )}
                </div>

                {v.status === "REQUESTED" || v.status === "RESCHEDULED" || v.status === "ACCEPTED" ? (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => handleCancel(v.id)}
                      disabled={actionLoading === v.id}
                      className="px-3.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 bg-rose-50 text-xs font-semibold hover:bg-rose-100 transition"
                    >
                      {actionLoading === v.id ? "Cancelling..." : "Cancel Visit Request"}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

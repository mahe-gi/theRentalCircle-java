"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ArrowLeft, Loader2, Phone, Mail, Clock, Check, X, RefreshCw, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import {
  getReceivedVisits,
  acceptVisit,
  rejectVisit,
  rescheduleVisit,
  completeVisit
} from "@/lib/connections-api";
import type { VisitResponse } from "@/types/property";

export default function OwnerVisitsPage() {
  const [visits, setVisits] = useState<VisitResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Reschedule dialog
  const [rescheduleVisitId, setRescheduleVisitId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("11:00");
  const [rescheduleRemarks, setRescheduleRemarks] = useState("");

  // Reject dialog
  const [rejectVisitId, setRejectVisitId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadVisits = () => {
    getReceivedVisits(0, 50)
      .then((res) => setVisits(res.content || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadVisits();
  }, []);

  const handleAccept = async (visitId: number) => {
    setActionLoading(visitId);
    try {
      await acceptVisit(visitId);
      loadVisits();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (visitId: number) => {
    setActionLoading(visitId);
    try {
      await completeVisit(visitId);
      loadVisits();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectVisitId) return;
    setActionLoading(rejectVisitId);
    try {
      await rejectVisit(rejectVisitId, rejectReason || "Time slot not available");
      setRejectVisitId(null);
      setRejectReason("");
      loadVisits();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleVisitId || !rescheduleDate || !rescheduleTime) return;
    setActionLoading(rescheduleVisitId);
    try {
      const formattedTime = rescheduleTime.length === 5 ? `${rescheduleTime}:00` : rescheduleTime;
      await rescheduleVisit(rescheduleVisitId, {
        rescheduledDate: rescheduleDate,
        rescheduledTime: formattedTime,
        ownerRemarks: rescheduleRemarks || undefined
      });
      setRescheduleVisitId(null);
      setRescheduleDate("");
      setRescheduleRemarks("");
      loadVisits();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">Action Required</span>;
      case "ACCEPTED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">Confirmed</span>;
      case "REJECTED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">Declined</span>;
      case "RESCHEDULED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">Awaiting Visitor Confirmation</span>;
      case "CANCELLED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">Cancelled by Visitor</span>;
      case "COMPLETED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">Completed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-charcoal">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/owner/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-charcoal-light hover:text-forest transition font-medium mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Owner Portal
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-forest-light text-forest">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal">
                Received Visit Requests
              </h1>
              <p className="text-xs text-charcoal-light">
                Manage appointment requests from prospective tenants for in-person property walkthroughs.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-charcoal-light">
            <Loader2 className="w-8 h-8 animate-spin text-forest" />
            <span className="text-xs">Loading visit requests...</span>
          </div>
        ) : visits.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-white border border-[#E8E4DD] p-8 space-y-3">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto" />
            <h2 className="font-serif font-bold text-lg text-charcoal">
              No visit requests received yet
            </h2>
            <p className="text-xs text-charcoal-light max-w-sm mx-auto">
              When prospective tenants request appointments to view your property, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visits.map((v) => (
              <div
                key={v.id}
                className="bg-white border border-[#E8E4DD] rounded-2xl p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0ECE1] pb-3">
                  <div>
                    <span className="text-xs font-bold text-forest block">
                      Property: {v.propertyTitle}
                    </span>
                    <span className="text-[11px] text-charcoal-light">
                      Requested on {new Date(v.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <div>{getStatusBadge(v.status)}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-sand/30 border border-[#E8E4DD]/50 space-y-1">
                    <span className="font-semibold text-charcoal-light block">Visitor Contact</span>
                    <p className="font-bold text-charcoal">{v.userName}</p>
                    <p className="flex items-center gap-1 text-charcoal-light">
                      <Mail className="w-3 h-3 text-forest" />
                      {v.userEmail}
                    </p>
                    {v.userMobile && (
                      <p className="flex items-center gap-1 text-charcoal-light">
                        <Phone className="w-3 h-3 text-forest" />
                        {v.userMobile}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-sand/40 border border-[#E8E4DD]/60 space-y-1">
                    <span className="font-semibold text-charcoal-light block">Requested Slot</span>
                    <p className="font-bold text-charcoal flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-forest" />
                      {v.preferredDate} at {v.preferredTime}
                    </p>
                    {v.rescheduledDate && (
                      <p className="text-[11px] text-blue-700 font-medium">
                        Rescheduled to: {v.rescheduledDate} at {v.rescheduledTime}
                      </p>
                    )}
                    {v.message && (
                      <p className="text-[11px] text-charcoal-light pt-1 italic">
                        &ldquo;{v.message}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col justify-center gap-2">
                    {v.status === "REQUESTED" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleAccept(v.id)}
                          disabled={actionLoading === v.id}
                          className="w-full py-2 px-3 rounded-xl bg-forest text-white font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-forest/90 transition shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept Visit
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleVisitId(v.id);
                              setRescheduleDate(v.preferredDate);
                            }}
                            className="py-1.5 px-2 rounded-xl border border-blue-300 text-blue-800 bg-blue-50 text-[11px] font-semibold hover:bg-blue-100 transition flex items-center justify-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Reschedule
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectVisitId(v.id)}
                            className="py-1.5 px-2 rounded-xl border border-rose-300 text-rose-800 bg-rose-50 text-[11px] font-semibold hover:bg-rose-100 transition flex items-center justify-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            Decline
                          </button>
                        </div>
                      </>
                    )}

                    {v.status === "ACCEPTED" && (
                      <button
                        type="button"
                        onClick={() => handleComplete(v.id)}
                        disabled={actionLoading === v.id}
                        className="py-2 px-3 rounded-xl bg-purple-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-purple-800 transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark as Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RESCHEDULE MODAL */}
        {rescheduleVisitId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl relative animate-in fade-in">
              <h3 className="text-base font-serif font-bold text-charcoal mb-2">
                Reschedule Visit Appointment
              </h3>
              <form onSubmit={handleConfirmReschedule} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">New Date</label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    required
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full p-2 border border-[#E8E4DD] rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">New Time</label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    required
                    className="w-full p-2 border border-[#E8E4DD] rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Message to Visitor</label>
                  <textarea
                    rows={2}
                    value={rescheduleRemarks}
                    onChange={(e) => setRescheduleRemarks(e.target.value)}
                    placeholder="e.g. Can we meet 1 hour later?"
                    className="w-full p-2 border border-[#E8E4DD] rounded-xl focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRescheduleVisitId(null)}
                    className="flex-1 py-2 rounded-xl border border-gray-300 text-charcoal"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-forest text-white font-semibold"
                  >
                    Send Proposal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* REJECT MODAL */}
        {rejectVisitId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl relative animate-in fade-in">
              <h3 className="text-base font-serif font-bold text-charcoal mb-2">
                Decline Visit Request
              </h3>
              <form onSubmit={handleConfirmReject} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Reason for Declining</label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Out of town, already under token"
                    required
                    className="w-full p-2 border border-[#E8E4DD] rounded-xl focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectVisitId(null)}
                    className="flex-1 py-2 rounded-xl border border-gray-300 text-charcoal"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-semibold"
                  >
                    Confirm Decline
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

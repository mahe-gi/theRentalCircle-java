"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquare, Calendar, Phone, Heart, Flag, CheckCircle, AlertCircle, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  contactOwner,
  sendEnquiry,
  requestVisit,
  toggleFavorite,
  getFavoriteStatus,
  submitReport
} from "@/lib/connections-api";
import type { ReportReason } from "@/types/property";

interface PropertyActionPanelProps {
  propertyId: number;
  propertyTitle: string;
}

export function PropertyActionPanel({ propertyId, propertyTitle }: PropertyActionPanelProps) {
  const { user, isAuthenticated } = useAuth();

  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Modals state
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [enquiryMessage, setEnquiryMessage] = useState("");
  const [enquirySending, setEnquirySending] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);

  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("10:00");
  const [visitMessage, setVisitMessage] = useState("");
  const [visitSending, setVisitSending] = useState(false);
  const [visitSuccess, setVisitSuccess] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("BROKER");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check initial favorite status
  useEffect(() => {
    if (isAuthenticated) {
      getFavoriteStatus(propertyId)
        .then(setIsFavorited)
        .catch(() => {});
    }
  }, [isAuthenticated, propertyId]);

  const handleWhatsApp = async () => {
    if (!isAuthenticated) return;
    setWhatsappLoading(true);
    setErrorMsg(null);
    try {
      const res = await contactOwner(propertyId);
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to initiate WhatsApp contact");
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated || favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      const res = await toggleFavorite(propertyId);
      setIsFavorited(res.isFavorited);
    } catch (err) {
      console.error("Favorite toggle failed", err);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleSendEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryMessage.trim()) return;
    setEnquirySending(true);
    setErrorMsg(null);
    try {
      await sendEnquiry(propertyId, enquiryMessage);
      setEnquirySuccess(true);
      setTimeout(() => {
        setShowEnquiryModal(false);
        setEnquirySuccess(false);
        setEnquiryMessage("");
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to send enquiry");
    } finally {
      setEnquirySending(false);
    }
  };

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitDate || !visitTime) return;
    setVisitSending(true);
    setErrorMsg(null);
    try {
      // formatted time with seconds
      const formattedTime = visitTime.length === 5 ? `${visitTime}:00` : visitTime;
      await requestVisit(propertyId, {
        preferredDate: visitDate,
        preferredTime: formattedTime,
        message: visitMessage || undefined
      });
      setVisitSuccess(true);
      setTimeout(() => {
        setShowVisitModal(false);
        setVisitSuccess(false);
        setVisitDate("");
        setVisitMessage("");
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to schedule visit");
    } finally {
      setVisitSending(false);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportSending(true);
    setErrorMsg(null);
    try {
      await submitReport({
        propertyId,
        reason: reportReason,
        description: reportDescription || undefined
      });
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
        setReportDescription("");
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to submit report");
    } finally {
      setReportSending(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 rounded-xl bg-sand border border-[#E8E4DD] text-center space-y-3">
        <span className="text-xs font-bold text-charcoal block">
          Connect Directly with Owner
        </span>
        <p className="text-xs text-charcoal-light">
          Direct WhatsApp contact, enquiry messages, site visit scheduling, and favorites unlock with an authenticated account.
        </p>
        <Link
          href={`/login?redirect=/properties/${propertyId}`}
          className="block w-full py-2.5 px-4 rounded-xl bg-forest text-white text-xs font-semibold hover:bg-forest/90 transition-colors shadow-sm"
        >
          Login to Contact Owner
        </Link>
        <span className="text-[10px] text-charcoal-light block">
          Zero brokerage. 100% direct verified connection.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Connection Actions */}
      <button
        type="button"
        onClick={handleWhatsApp}
        disabled={whatsappLoading}
        className="w-full py-3 px-4 rounded-xl bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-sm"
      >
        <Phone className="w-4 h-4" />
        {whatsappLoading ? "Connecting to WhatsApp..." : "Chat on WhatsApp (Direct)"}
      </button>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShowVisitModal(true)}
          className="py-2.5 px-3 rounded-xl bg-forest text-white font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-forest/90 transition"
        >
          <Calendar className="w-4 h-4" />
          Schedule Visit
        </button>

        <button
          type="button"
          onClick={() => setShowEnquiryModal(true)}
          className="py-2.5 px-3 rounded-xl border border-forest text-forest bg-white font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-forest-light transition"
        >
          <MessageSquare className="w-4 h-4" />
          Send Enquiry
        </button>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#F0ECE1]">
        <button
          type="button"
          onClick={handleToggleFavorite}
          disabled={favoriteLoading}
          className="text-xs font-medium text-charcoal-light flex items-center gap-1.5 hover:text-rose-600 transition"
        >
          <Heart
            className={`w-4 h-4 ${
              isFavorited ? "fill-rose-500 text-rose-500" : "text-charcoal-light"
            }`}
          />
          <span>{isFavorited ? "Saved in Favorites" : "Save to Favorites"}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowReportModal(true)}
          className="text-xs text-charcoal-light flex items-center gap-1 hover:text-amber-700 transition"
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Report Listing</span>
        </button>
      </div>

      {/* ENQUIRY MODAL */}
      {showEnquiryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in">
            <button
              onClick={() => setShowEnquiryModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-serif font-bold text-charcoal mb-1">
              Send Enquiry to Owner
            </h3>
            <p className="text-xs text-charcoal-light mb-4">
              Property: {propertyTitle}
            </p>

            {enquirySuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-semibold">Enquiry Sent Successfully!</p>
                <p className="text-xs text-emerald-700">The property owner has been notified.</p>
              </div>
            ) : (
              <form onSubmit={handleSendEnquiry} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Your Message
                  </label>
                  <textarea
                    rows={4}
                    value={enquiryMessage}
                    onChange={(e) => setEnquiryMessage(e.target.value)}
                    placeholder="Ask about lease duration, move-in flexibility, parking spots..."
                    required
                    className="w-full text-xs p-3 border border-[#E8E4DD] rounded-xl focus:outline-none focus:border-forest"
                  />
                </div>
                <button
                  type="submit"
                  disabled={enquirySending}
                  className="w-full py-2.5 rounded-xl bg-forest text-white text-xs font-semibold hover:bg-forest/90 transition"
                >
                  {enquirySending ? "Sending..." : "Submit Enquiry"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* VISIT MODAL */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in">
            <button
              onClick={() => setShowVisitModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-serif font-bold text-charcoal mb-1">
              Schedule Property Visit
            </h3>
            <p className="text-xs text-charcoal-light mb-4">
              Property: {propertyTitle}
            </p>

            {visitSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-semibold">Visit Request Submitted!</p>
                <p className="text-xs text-emerald-700">
                  The owner will review and confirm your requested time slot.
                </p>
              </div>
            ) : (
              <form onSubmit={handleScheduleVisit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-charcoal mb-1">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      required
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full text-xs p-2.5 border border-[#E8E4DD] rounded-xl focus:outline-none focus:border-forest"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-charcoal mb-1">
                      Preferred Time
                    </label>
                    <input
                      type="time"
                      value={visitTime}
                      onChange={(e) => setVisitTime(e.target.value)}
                      required
                      className="w-full text-xs p-2.5 border border-[#E8E4DD] rounded-xl focus:outline-none focus:border-forest"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Note for Owner (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={visitMessage}
                    onChange={(e) => setVisitMessage(e.target.value)}
                    placeholder="e.g. Visiting with family, will arrive by car..."
                    className="w-full text-xs p-3 border border-[#E8E4DD] rounded-xl focus:outline-none focus:border-forest"
                  />
                </div>
                <button
                  type="submit"
                  disabled={visitSending}
                  className="w-full py-2.5 rounded-xl bg-forest text-white text-xs font-semibold hover:bg-forest/90 transition"
                >
                  {visitSending ? "Scheduling..." : "Request Visit"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in">
            <button
              onClick={() => setShowReportModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-serif font-bold text-charcoal mb-1">
              Report this Listing
            </h3>
            <p className="text-xs text-charcoal-light mb-4">
              Help us keep RentalCircle 100% zero-brokerage and trustworthy.
            </p>

            {reportSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-semibold">Report Received</p>
                <p className="text-xs text-emerald-700">
                  Our trust & safety team will investigate this listing immediately.
                </p>
              </div>
            ) : (
              <form onSubmit={handleReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Reason for Report
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value as ReportReason)}
                    className="w-full text-xs p-2.5 border border-[#E8E4DD] rounded-xl focus:outline-none focus:border-forest"
                  >
                    <option value="BROKER">Broker / Agent Listing (Brokerage violation)</option>
                    <option value="FAKE_PROPERTY">Fake Property / Does Not Exist</option>
                    <option value="WRONG_PRICE">Incorrect Price Quoted</option>
                    <option value="ALREADY_RENTED">Already Rented / Sold</option>
                    <option value="SCAM">Suspicious / Scam Activity</option>
                    <option value="SPAM">Duplicate or Spam Listing</option>
                    <option value="OTHER">Other Issue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Details / Evidence
                  </label>
                  <textarea
                    rows={3}
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Describe what occurred or why this listing violates policies..."
                    className="w-full text-xs p-3 border border-[#E8E4DD] rounded-xl focus:outline-none focus:border-forest"
                  />
                </div>
                <button
                  type="submit"
                  disabled={reportSending}
                  className="w-full py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition"
                >
                  {reportSending ? "Submitting..." : "Submit Report for Investigation"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

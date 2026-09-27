"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, ArrowLeft, Loader2, Phone, Mail, CheckCircle } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { getReceivedEnquiries, updateEnquiryStatus } from "@/lib/connections-api";
import type { EnquiryResponse, EnquiryStatus } from "@/types/property";

export default function OwnerEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<EnquiryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadEnquiries = () => {
    getReceivedEnquiries(0, 50)
      .then((res) => setEnquiries(res.content || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEnquiries();
  }, []);

  const handleStatusChange = async (enquiryId: number, newStatus: EnquiryStatus) => {
    setUpdatingId(enquiryId);
    try {
      await updateEnquiryStatus(enquiryId, newStatus);
      loadEnquiries();
    } catch (err) {
      console.error("Failed to update enquiry status", err);
    } finally {
      setUpdatingId(null);
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
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal">
                Received Enquiries
              </h1>
              <p className="text-xs text-charcoal-light">
                Direct tenant and buyer enquiries on your listed properties.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-charcoal-light">
            <Loader2 className="w-8 h-8 animate-spin text-forest" />
            <span className="text-xs">Loading enquiries...</span>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-white border border-[#E8E4DD] p-8 space-y-3">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto" />
            <h2 className="font-serif font-bold text-lg text-charcoal">
              No enquiries received yet
            </h2>
            <p className="text-xs text-charcoal-light max-w-sm mx-auto">
              Once prospective tenants discover your live listings, their enquiries will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {enquiries.map((enq) => (
              <div
                key={enq.id}
                className="bg-white border border-[#E8E4DD] rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0ECE1] pb-3">
                  <div>
                    <span className="text-xs font-bold text-forest block">
                      Property: {enq.propertyTitle}
                    </span>
                    <span className="text-[11px] text-charcoal-light">
                      Received on {new Date(enq.createdAt).toLocaleDateString("en-IN")} at{" "}
                      {new Date(enq.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-charcoal-light">Status:</span>
                    <select
                      value={enq.status}
                      disabled={updatingId === enq.id}
                      onChange={(e) => handleStatusChange(enq.id, e.target.value as EnquiryStatus)}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-[#E8E4DD] bg-white focus:outline-none focus:border-forest"
                    >
                      <option value="NEW">NEW</option>
                      <option value="CONTACTED">CONTACTED</option>
                      <option value="VISIT_SCHEDULED">VISIT_SCHEDULED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-sand/30 border border-[#E8E4DD]/50 space-y-1">
                    <span className="font-semibold text-charcoal-light block">Prospect Details</span>
                    <p className="font-bold text-charcoal">{enq.userName}</p>
                    <p className="flex items-center gap-1 text-charcoal-light">
                      <Mail className="w-3 h-3 text-forest" />
                      {enq.userEmail}
                    </p>
                    {enq.userMobile && (
                      <p className="flex items-center gap-1 text-charcoal-light">
                        <Phone className="w-3 h-3 text-forest" />
                        {enq.userMobile}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2 p-3 rounded-xl bg-sand/40 border border-[#E8E4DD]/60">
                    <span className="font-semibold text-charcoal-light block mb-1">Prospect Message</span>
                    <p className="text-charcoal whitespace-pre-wrap">{enq.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, ArrowLeft, Loader2, Clock } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { getMyEnquiries } from "@/lib/connections-api";
import type { EnquiryResponse } from "@/types/property";

export default function MyEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<EnquiryResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyEnquiries(0, 50)
      .then((res) => setEnquiries(res.content || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">Pending Response</span>;
      case "CONTACTED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">Contacted by Owner</span>;
      case "VISIT_SCHEDULED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">Visit Scheduled</span>;
      case "CLOSED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">Closed</span>;
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
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal">
                My Enquiries
              </h1>
              <p className="text-xs text-charcoal-light">
                Track status of enquiries sent to property owners.
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
              No enquiries sent yet
            </h2>
            <p className="text-xs text-charcoal-light max-w-sm mx-auto">
              When you submit enquiries on property listings, you can track the owner's responses here.
            </p>
            <Link
              href="/properties"
              className="inline-block px-5 py-2.5 rounded-xl bg-forest text-white text-xs font-semibold hover:bg-forest/90 transition shadow-sm"
            >
              Search Properties
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {enquiries.map((enq) => (
              <div
                key={enq.id}
                className="bg-white border border-[#E8E4DD] rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0ECE1] pb-3">
                  <div>
                    <Link
                      href={`/properties/${enq.propertyId}`}
                      className="font-serif font-bold text-base text-charcoal hover:text-forest transition"
                    >
                      {enq.propertyTitle}
                    </Link>
                    <span className="text-[11px] text-charcoal-light flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      Sent on {new Date(enq.createdAt).toLocaleDateString("en-IN")} at{" "}
                      {new Date(enq.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div>{getStatusBadge(enq.status)}</div>
                </div>

                <div className="p-3 rounded-xl bg-sand/40 border border-[#E8E4DD]/60 text-xs text-charcoal">
                  <span className="font-semibold text-charcoal-light block mb-1">Your message:</span>
                  <p className="whitespace-pre-wrap">{enq.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

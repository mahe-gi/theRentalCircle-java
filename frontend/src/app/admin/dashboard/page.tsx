"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  Building,
  Flag,
  Calendar,
  MessageSquare,
  FileText,
  AlertTriangle,
  Loader2,
  ArrowRight
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { getAdminDashboardMetrics } from "@/lib/connections-api";
import type { AdminDashboardResponse } from "@/types/property";

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminDashboardMetrics()
      .then(setMetrics)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-charcoal">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-charcoal-light font-medium mb-1">
            <span className="px-2 py-0.5 rounded bg-forest text-white text-[10px] font-bold">
              ADMIN CONSOLE
            </span>
            <span>Platform Trust & Moderation</span>
          </div>
          <h1 className="font-serif font-bold text-3xl text-charcoal">
            Operations Dashboard
          </h1>
          <p className="text-xs text-charcoal-light">
            Live overview of users, owner verifications, property listings, and trust actions.
          </p>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-charcoal-light">
            <Loader2 className="w-8 h-8 animate-spin text-forest" />
            <span className="text-xs">Loading operational metrics...</span>
          </div>
        ) : metrics ? (
          <div className="space-y-8">
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white border border-[#E8E4DD] rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-charcoal-light">
                  <span className="text-xs font-semibold">Total Users</span>
                  <Users className="w-5 h-5 text-forest" />
                </div>
                <div className="text-3xl font-extrabold text-charcoal">
                  {metrics.totalUsers}
                </div>
                <Link
                  href="/admin/users"
                  className="text-[11px] font-semibold text-forest flex items-center gap-1 hover:underline pt-1"
                >
                  Manage Users <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="bg-white border border-[#E8E4DD] rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-charcoal-light">
                  <span className="text-xs font-semibold">Owner Profiles</span>
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-3xl font-extrabold text-charcoal">
                  {metrics.verifiedOwners}{" "}
                  <span className="text-xs font-normal text-charcoal-light">
                    / {metrics.totalOwners} verified
                  </span>
                </div>
                <Link
                  href="/admin/owners"
                  className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 hover:underline pt-1"
                >
                  Review KYC ({metrics.pendingOwners} pending) <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="bg-white border border-[#E8E4DD] rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-charcoal-light">
                  <span className="text-xs font-semibold">Properties</span>
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-extrabold text-charcoal">
                  {metrics.liveProperties}{" "}
                  <span className="text-xs font-normal text-charcoal-light">LIVE</span>
                </div>
                <Link
                  href="/admin/properties"
                  className="text-[11px] font-semibold text-blue-700 flex items-center gap-1 hover:underline pt-1"
                >
                  Moderate Listings ({metrics.pendingProperties} pending) <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="bg-white border border-[#E8E4DD] rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-charcoal-light">
                  <span className="text-xs font-semibold">Trust & Reports</span>
                  <Flag className="w-5 h-5 text-rose-600" />
                </div>
                <div className="text-3xl font-extrabold text-rose-700">
                  {metrics.openReports}
                </div>
                <Link
                  href="/admin/reports"
                  className="text-[11px] font-semibold text-rose-700 flex items-center gap-1 hover:underline pt-1"
                >
                  Investigate Reports <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Engagement Overview & Quick Links */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-[#E8E4DD] rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-serif font-bold text-lg text-charcoal">
                  Marketplace Engagement
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-sand/40 border border-[#E8E4DD]/60">
                    <span className="text-xs font-medium text-charcoal-light flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-forest" /> Scheduled Visits
                    </span>
                    <span className="font-bold text-base text-charcoal">{metrics.totalVisits}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-sand/40 border border-[#E8E4DD]/60">
                    <span className="text-xs font-medium text-charcoal-light flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-forest" /> Total Enquiries
                    </span>
                    <span className="font-bold text-base text-charcoal">{metrics.totalEnquiries}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white border border-[#E8E4DD] rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-serif font-bold text-lg text-charcoal">
                  Moderator Queues & Audit
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link
                    href="/admin/owners"
                    className="p-4 rounded-xl border border-[#E8E4DD] hover:border-forest hover:bg-forest-light/40 transition group"
                  >
                    <span className="font-bold text-xs text-charcoal group-hover:text-forest block mb-1">
                      Owner KYC Queue
                    </span>
                    <p className="text-[11px] text-charcoal-light">
                      Inspect title deeds and government IDs. Approve or request more information.
                    </p>
                  </Link>

                  <Link
                    href="/admin/properties"
                    className="p-4 rounded-xl border border-[#E8E4DD] hover:border-forest hover:bg-forest-light/40 transition group"
                  >
                    <span className="font-bold text-xs text-charcoal group-hover:text-forest block mb-1">
                      Property Review Queue
                    </span>
                    <p className="text-[11px] text-charcoal-light">
                      Review listing specifications, pricing, and photos before transition to LIVE.
                    </p>
                  </Link>

                  <Link
                    href="/admin/reports"
                    className="p-4 rounded-xl border border-[#E8E4DD] hover:border-rose-400 hover:bg-rose-50/40 transition group"
                  >
                    <span className="font-bold text-xs text-charcoal group-hover:text-rose-700 block mb-1">
                      Violation Reports
                    </span>
                    <p className="text-[11px] text-charcoal-light">
                      Investigate broker reports, scam listings, and enforce zero-brokerage policies.
                    </p>
                  </Link>

                  <Link
                    href="/admin/audit-logs"
                    className="p-4 rounded-xl border border-[#E8E4DD] hover:border-forest hover:bg-forest-light/40 transition group"
                  >
                    <span className="font-bold text-xs text-charcoal group-hover:text-forest block mb-1">
                      Audit Trail Logs
                    </span>
                    <p className="text-[11px] text-charcoal-light">
                      Immutable record of all admin decisions, document downloads, and user suspensions.
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  PlusCircle,
  Building2,
  FileText,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  MapPin,
  IndianRupee,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { Property } from "@/types/property";

export default function OwnerDashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Query owner properties
  const {
    data: propertiesData,
    isLoading: propertiesLoading,
    error: propertiesError,
  } = useQuery({
    queryKey: ["owner-properties"],
    queryFn: async () => {
      const res = await apiClient.get("/properties/my");
      // Handle both ApiResponse<T> or raw array
      const raw = res.data?.data ?? res.data;
      if (Array.isArray(raw)) {
        return raw as Property[];
      }
      if (raw && Array.isArray(raw.content)) {
        return raw.content as Property[];
      }
      return [] as Property[];
    },
    enabled: isAuthenticated,
  });

  const properties = propertiesData || [];
  const draftCount = properties.filter((p) => p.status === "DRAFT").length;
  const submittedCount = properties.filter(
    (p) => p.status === "SUBMITTED" || p.status === "UNDER_REVIEW"
  ).length;
  const liveCount = properties.filter((p) => p.status === "LIVE" || p.status === "APPROVED").length;

  return (
    <div className="min-h-screen bg-sand flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Top Header / Greeting */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E4DD] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-light mb-1">
              <span>Owner Portal</span>
              <span>•</span>
              <span className="text-forest font-bold">Dashboard</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal tracking-tight">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
            </h1>
            <p className="text-sm text-charcoal-light mt-1">
              Manage your direct zero-brokerage listings, review draft specifications, and monitor tenant visits.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/owner/properties"
              className="px-4 py-2.5 rounded-xl border border-[#E8E4DD] hover:border-forest/40 bg-white text-sm font-semibold text-charcoal hover:text-forest transition-colors flex items-center gap-2 shadow-sm"
            >
              <Building2 className="w-4 h-4 text-forest" />
              <span>My Properties</span>
            </Link>
            <Link
              href="/owner/properties/new"
              className="px-5 py-2.5 rounded-xl bg-forest hover:bg-forest-hover active:bg-[#072625] text-white text-sm font-semibold transition-all duration-150 flex items-center gap-2 shadow-md hover:shadow"
            >
              <PlusCircle className="w-4 h-4 text-amber" />
              <span>Add New Property</span>
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Drafts Stat Card */}
          <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD] shadow-sm hover:border-amber/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-charcoal-light">
                In-Progress Drafts
              </span>
              <div className="p-2 rounded-xl bg-amber/10 text-amber">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-charcoal">
                {propertiesLoading ? "..." : draftCount}
              </span>
              <span className="text-xs font-semibold text-amber">Pending upload</span>
            </div>
            <p className="text-xs text-charcoal-light mt-2">
              Ready to add photos and submit for review.
            </p>
          </div>

          {/* Submitted Stat Card */}
          <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD] shadow-sm hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-charcoal-light">
                Submitted for Review
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-charcoal">
                {propertiesLoading ? "..." : submittedCount}
              </span>
              <span className="text-xs font-semibold text-blue-600">Under moderation</span>
            </div>
            <p className="text-xs text-charcoal-light mt-2">
              Awaiting admin listing verification.
            </p>
          </div>

          {/* Active / Live Stat Card */}
          <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD] shadow-sm hover:border-emerald-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-charcoal-light">
                Live on Marketplace
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-charcoal">
                {propertiesLoading ? "..." : liveCount}
              </span>
              <span className="text-xs font-semibold text-emerald-700">Public listings</span>
            </div>
            <p className="text-xs text-charcoal-light mt-2">
              Receiving direct WhatsApp tenant connections.
            </p>
          </div>

          {/* Zero Brokerage Badge Stat Card */}
          <div className="p-6 rounded-2xl bg-forest text-white shadow-md relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-bold uppercase tracking-wider text-amber">
                Brokerage Saved
              </span>
              <div className="p-2 rounded-xl bg-white/10 text-amber">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 relative z-10 flex items-baseline gap-1">
              <span className="text-2xl font-serif font-bold text-white">
                100% Free
              </span>
            </div>
            <p className="text-xs text-white/80 mt-2 relative z-10">
              Zero commission taken from rent or sale proceeds.
            </p>
          </div>
        </div>

        {/* CTA Hero Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E8E4DD] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-light text-forest text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Direct Real Estate Network</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-charcoal">
              Ready to list a residential or commercial space?
            </h2>
            <p className="text-sm text-charcoal-light leading-relaxed">
              Create a listing in under 5 minutes with our guided step-by-step wizard. Add floor specs, amenities, exact locality, and upload crisp photos.
            </p>
          </div>
          <Link
            href="/owner/properties/new"
            className="w-full md:w-auto px-6 py-3.5 rounded-xl bg-forest hover:bg-forest-hover text-white font-semibold text-sm shadow-md hover:shadow transition-all flex items-center justify-center gap-2 group shrink-0"
          >
            <span>Add New Property</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Recent Properties Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold text-charcoal">
              Recent Listings
            </h3>
            <Link
              href="/owner/properties"
              className="text-xs sm:text-sm font-semibold text-forest hover:text-forest-hover flex items-center gap-1 transition-colors"
            >
              <span>View all properties ({properties.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {propertiesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white border border-[#E8E4DD] p-5 space-y-4 animate-pulse"
                >
                  <div className="w-full h-40 bg-[#E8E4DD] rounded-xl" />
                  <div className="h-4 bg-[#E8E4DD] rounded w-3/4" />
                  <div className="h-3 bg-[#E8E4DD] rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : properties.length === 0 ? (
            /* Empty State */
            <div className="rounded-3xl bg-white border border-[#E8E4DD] p-10 sm:p-14 text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-sand-muted mx-auto flex items-center justify-center text-forest">
                <Building2 className="w-8 h-8 text-forest" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-lg font-serif font-bold text-charcoal">
                  No properties listed yet
                </h4>
                <p className="text-xs sm:text-sm text-charcoal-light">
                  You haven&apos;t created any property listings yet. Start by creating your first draft listing today!
                </p>
              </div>
              <Link
                href="/owner/properties/new"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-forest hover:bg-forest-hover text-white text-sm font-semibold shadow-sm transition-colors"
              >
                <PlusCircle className="w-4 h-4 text-amber" />
                <span>Create Your First Property</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.slice(0, 6).map((property) => {
                const coverImage =
                  property.images?.find((img) => img.isPrimary) ||
                  property.images?.[0];
                const imageUrl = coverImage?.url || (coverImage?.storageKey ? `/uploads/${coverImage.storageKey}` : null);

                return (
                  <div
                    key={property.id}
                    className="rounded-2xl bg-white border border-[#E8E4DD] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Preview Banner */}
                      <div className="relative h-44 bg-[#E8E4DD] overflow-hidden">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-sand text-charcoal-light/60 gap-2">
                            <Building2 className="w-8 h-8" />
                            <span className="text-xs font-medium">No photo uploaded</span>
                          </div>
                        )}

                        {/* Status Badge */}
                        <div className="absolute top-3 left-3">
                          {property.status === "DRAFT" ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber text-white shadow-sm">
                              Draft
                            </span>
                          ) : property.status === "SUBMITTED" ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-600 text-white shadow-sm">
                              Submitted
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
                              {property.status}
                            </span>
                          )}
                        </div>

                        {/* Price Tag */}
                        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold text-forest shadow">
                          ₹{Number(property.price).toLocaleString("en-IN")}
                          {property.listingType === "RENT" ? " / mo" : ""}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs text-charcoal-light font-medium">
                          <MapPin className="w-3.5 h-3.5 text-forest" />
                          <span>
                            {property.locality}, {property.city}
                          </span>
                        </div>

                        <h4 className="font-serif font-bold text-base text-charcoal line-clamp-1">
                          {property.title}
                        </h4>

                        <div className="flex items-center gap-3 text-xs text-charcoal-light pt-1">
                          <span className="font-semibold text-charcoal">
                            {property.bhk ? `${property.bhk} BHK` : property.propertyType}
                          </span>
                          <span>•</span>
                          <span>{property.listingType === "RENT" ? "For Rent" : "For Sale"}</span>
                          {property.carpetArea && (
                            <>
                              <span>•</span>
                              <span>{property.carpetArea} sq.ft</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="px-5 pb-5 pt-2 border-t border-[#E8E4DD]/60 flex items-center justify-between">
                      {property.status === "DRAFT" ? (
                        <Link
                          href={`/owner/properties/new?id=${property.id}`}
                          className="w-full text-center py-2 rounded-xl bg-amber/10 hover:bg-amber/20 text-amber font-semibold text-xs transition-colors"
                        >
                          Continue Editing Draft
                        </Link>
                      ) : (
                        <Link
                          href={`/owner/properties`}
                          className="w-full text-center py-2 rounded-xl bg-forest-light hover:bg-forest/15 text-forest font-semibold text-xs transition-colors flex items-center justify-center gap-1"
                        >
                          <span>View Property Status</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

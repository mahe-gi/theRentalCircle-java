"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { PropertyCard } from "@/components/search/PropertyCard";
import { searchProperties } from "@/lib/search-api";
import {
  ShieldCheck,
  Search,
  Building2,
  MapPin,
  ArrowRight,
  MessageCircle,
  FileCheck,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [listingType, setListingType] = useState<"RENT" | "SALE">("RENT");
  const [city, setCity] = useState("");
  const [propertyType, setPropertyType] = useState("");

  const { data: searchData, isLoading } = useQuery({
    queryKey: ["homepage-featured-properties"],
    queryFn: () => searchProperties({ size: 4, sort: "NEWEST" }),
  });

  const featuredProperties = searchData?.content || [];
  const totalCount = searchData?.totalElements || 0;

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (listingType) params.append("listingType", listingType);
    if (city.trim()) params.append("city", city.trim());
    if (propertyType) params.append("propertyType", propertyType);
    router.push(`/properties?${params.toString()}`);
  };

  const popularCities = [
    "Bengaluru",
    "Mumbai",
    "Delhi NCR",
    "Hyderabad",
    "Pune",
    "Chennai",
  ];

  return (
    <main className="min-h-screen bg-[#FBF9F5] text-[#1A1D20] flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-16 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center w-full">
        {/* Trust Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8F0EC] text-[#1B4D3E] text-xs font-semibold mb-6 shadow-sm border border-[#1B4D3E]/10">
          <ShieldCheck className="w-3.5 h-3.5 text-[#1B4D3E]" />
          <span>Verified Property Owners Only</span>
          <span className="text-[#1B4D3E]/40">•</span>
          <span>Zero Brokerage Fees</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-[#1A1D20] max-w-4xl mx-auto leading-tight font-serif">
          Direct Real-Estate Marketplace for{" "}
          <span className="text-[#1B4D3E] underline decoration-[#C27D38]/40 decoration-4 underline-offset-8">
            India
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-[#5A6065] max-w-2xl mx-auto font-normal leading-relaxed">
          Connect directly with verified title owners for residential and commercial
          properties. Zero broker fees, structured site visits, and instant WhatsApp
          connections.
        </p>

        {/* Interactive Search Bar Box */}
        <div className="mt-8 max-w-3xl mx-auto bg-white rounded-2xl shadow-xl shadow-black/5 border border-[#E8E4DD] p-5 text-left transition-all">
          {/* Rent / Buy Tabs */}
          <div className="flex border-b border-[#E8E4DD] pb-3 mb-4 space-x-6 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setListingType("RENT")}
              className={`pb-2.5 transition-all flex items-center gap-1.5 ${
                listingType === "RENT"
                  ? "text-[#1B4D3E] border-b-2 border-[#1B4D3E] font-bold"
                  : "text-[#5A6065] hover:text-[#1A1D20]"
              }`}
            >
              <span>Rent</span>
            </button>

            <button
              type="button"
              onClick={() => setListingType("SALE")}
              className={`pb-2.5 transition-all flex items-center gap-1.5 ${
                listingType === "SALE"
                  ? "text-[#1B4D3E] border-b-2 border-[#1B4D3E] font-bold"
                  : "text-[#5A6065] hover:text-[#1A1D20]"
              }`}
            >
              <span>Buy / Sale</span>
            </button>

            <span className="text-[#E8E4DD] self-center">|</span>
            <span className="text-xs text-[#5A6065] self-center font-normal">
              100% Direct Owner Listings
            </span>
          </div>

          {/* Search Inputs Grid */}
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* City / Locality Input */}
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-[#5A6065] mb-1.5">
                City / Locality
              </label>
              <div className="relative flex items-center">
                <MapPin className="absolute left-3 w-4 h-4 text-[#5A6065]/60" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bangalore, Indiranagar, Mumbai..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-[#E8E4DD] focus:border-[#1B4D3E] focus:ring-2 focus:ring-[#1B4D3E]/20 text-[#1A1D20] placeholder-[#5A6065]/50 font-medium transition"
                />
              </div>
            </div>

            {/* Property Type Dropdown */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-[#5A6065] mb-1.5">
                Property Type
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E8E4DD] focus:border-[#1B4D3E] focus:ring-2 focus:ring-[#1B4D3E]/20 text-[#1A1D20] font-medium transition bg-white"
              >
                <option value="">All Types</option>
                <option value="APARTMENT">Apartment</option>
                <option value="VILLA">Villa / House</option>
                <option value="INDEPENDENT_FLOOR">Independent Floor</option>
                <option value="PLOT">Plot / Land</option>
              </select>
            </div>

            {/* Explore Button */}
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B4D3E] hover:bg-[#153E32] active:bg-[#0e2c24] text-white font-semibold text-sm transition-all shadow-md shadow-[#1B4D3E]/20"
              >
                <Search className="w-4 h-4" />
                <span>Explore</span>
              </button>
            </div>
          </form>

          {/* Quick Popular Cities */}
          <div className="mt-4 pt-3 border-t border-[#E8E4DD]/60 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[#5A6065] font-medium">Popular:</span>
            {popularCities.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCity(c);
                  router.push(`/properties?city=${encodeURIComponent(c)}&listingType=${listingType}`);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#F5F2EB] hover:bg-[#E8F0EC] text-[#1A1D20] hover:text-[#1B4D3E] transition-colors font-medium border border-transparent hover:border-[#1B4D3E]/20"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured LIVE Properties Section */}
      <section className="bg-white border-y border-[#E8E4DD] py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C27D38] mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Verified Fresh Listings</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[#1A1D20]">
                Featured Properties Direct from Owners
              </h2>
              <p className="text-sm text-[#5A6065] mt-1">
                KYC-verified owners, guaranteed zero brokerage, and direct contact.
              </p>
            </div>

            <Link
              href="/properties"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1B4D3E] hover:text-[#153E32] transition group"
            >
              <span>Explore All {totalCount > 0 ? `${totalCount}+` : ""} Properties</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Properties Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-80 rounded-2xl bg-white border border-[#E8E4DD] animate-pulse p-4 space-y-3"
                >
                  <div className="w-full h-44 bg-[#F5F2EB] rounded-xl" />
                  <div className="h-4 bg-[#F5F2EB] rounded w-3/4" />
                  <div className="h-4 bg-[#F5F2EB] rounded w-1/2" />
                  <div className="h-6 bg-[#F5F2EB] rounded w-1/3 mt-4" />
                </div>
              ))}
            </div>
          ) : featuredProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProperties.map((prop) => (
                <PropertyCard key={prop.id} property={prop} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-[#FBF9F5] rounded-2xl border border-[#E8E4DD]">
              <Building2 className="w-12 h-12 text-[#5A6065]/40 mx-auto mb-3" />
              <h3 className="font-semibold text-base text-[#1A1D20]">
                No properties published yet
              </h3>
              <p className="text-sm text-[#5A6065] mt-1">
                Be the first verified owner to list a property on RentalCircle.
              </p>
              <Link
                href="/owner/become-owner"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B4D3E] text-white text-sm font-medium shadow-sm hover:bg-[#153E32] transition"
              >
                List Your Property
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Trust & Architecture Baseline Indicator */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[#1A1D20]">
            The RentalCircle Difference
          </h2>
          <p className="text-sm text-[#5A6065] mt-2">
            Engineered from day one for verified trust, complete transparency, and zero brokerage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD] shadow-sm hover:border-[#1B4D3E]/30 transition">
            <div className="w-10 h-10 rounded-xl bg-[#E8F0EC] text-[#1B4D3E] flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#1A1D20] text-base mb-2 font-serif">
              Two-Tier Trust Model
            </h3>
            <p className="text-sm text-[#5A6065] leading-relaxed">
              Every owner submits identity documents. Properties must undergo moderation and verification before transitioning to LIVE status. No fake listings.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD] shadow-sm hover:border-[#1B4D3E]/30 transition">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#C27D38] flex items-center justify-center mb-4">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#1A1D20] text-base mb-2 font-serif">
              Direct Connections
            </h3>
            <p className="text-sm text-[#5A6065] leading-relaxed">
              Instant WhatsApp deep-links with verified owners, structured property enquiries, and scheduled site visits without intermediary commission cuts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD] shadow-sm hover:border-[#1B4D3E]/30 transition">
            <div className="w-10 h-10 rounded-xl bg-[#E8F0EC] text-[#1B4D3E] flex items-center justify-center mb-4">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#1A1D20] text-base mb-2 font-serif">
              Zero Brokerage Guarantee
            </h3>
            <p className="text-sm text-[#5A6065] leading-relaxed">
              Strict anti-brokerage policies enforced by algorithmic checks, user reporting, and swift admin moderation to ensure a pure peer-to-peer ecosystem.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E8E4DD] bg-white py-8 px-4 text-center text-xs text-[#5A6065]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-sm text-[#1B4D3E]">RentalCircle</span>
            <span>• Direct Owner Real-Estate Marketplace</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/properties" className="hover:text-[#1B4D3E] transition">
              Search Properties
            </Link>
            <Link href="/owner/become-owner" className="hover:text-[#1B4D3E] transition">
              List Property
            </Link>
            <Link href="/login" className="hover:text-[#1B4D3E] transition">
              Sign In
            </Link>
          </div>
          <div>© {new Date().getFullYear()} RentalCircle India. Zero Brokerage.</div>
        </div>
      </footer>
    </main>
  );
}

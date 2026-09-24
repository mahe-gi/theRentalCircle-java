import React from "react";
import { Navbar } from "@/components/navbar";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#FBF9F5] text-[#1A1D20]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-20 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8F0EC] text-[#1B4D3E] text-xs font-medium mb-6">
          <span>🛡️ Verified Property Owners Only</span>
          <span>•</span>
          <span>Zero Middlemen</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-[#1A1D20] max-w-4xl mx-auto leading-tight">
          Direct Real-Estate Marketplace for <span className="text-[#1B4D3E]">India</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-[#5A6065] max-w-2xl mx-auto font-normal">
          Connect directly with verified title owners for residential and commercial properties.
          Zero broker fees, structured site visits, and instant WhatsApp connections.
        </p>

        {/* Discovery Search Preview Bar */}
        <div className="mt-10 max-w-3xl mx-auto bg-white rounded-2xl shadow-xl shadow-black/5 border border-[#E8E4DD] p-4 text-left">
          <div className="flex border-b border-[#E8E4DD] pb-3 mb-4 space-x-4 text-sm font-semibold">
            <button className="text-[#1B4D3E] border-b-2 border-[#1B4D3E] pb-1">
              Rent
            </button>
            <button className="text-[#5A6065] hover:text-[#1A1D20] pb-1">
              Buy
            </button>
            <span className="text-[#E8E4DD]">|</span>
            <span className="text-xs text-[#5A6065] self-center">
              Residential & Commercial
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5A6065] mb-1">
                City / Locality
              </label>
              <input
                type="text"
                placeholder="e.g. Bangalore, Indiranagar"
                className="w-full text-sm border-0 focus:ring-0 p-0 text-[#1A1D20] placeholder-[#5A6065]/60 font-medium"
                readOnly
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5A6065] mb-1">
                Property Type
              </label>
              <div className="text-sm font-medium text-[#1A1D20]">
                Apartment / Villa
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#1B4D3E] hover:bg-[#153E32] text-white font-medium text-sm transition-colors shadow-sm">
                Explore Listings
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Architecture Baseline Indicator */}
      <section className="bg-white border-t border-[#E8E4DD] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
          <div className="p-6 rounded-2xl bg-[#FBF9F5] border border-[#E8E4DD]">
            <h3 className="font-semibold text-[#1A1D20] text-base mb-2">
              1. Two-Tier Trust Model
            </h3>
            <p className="text-sm text-[#5A6065]">
              Owner identity (KYC/Aadhaar/PAN) is verified independently. Listings transition to LIVE only after both owner and property approval.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FBF9F5] border border-[#E8E4DD]">
            <h3 className="font-semibold text-[#1A1D20] text-base mb-2">
              2. Direct Owner Connections
            </h3>
            <p className="text-sm text-[#5A6065]">
              Direct WhatsApp deep links, structured form enquiries, and scheduled site visits without intermediary brokers or commission cuts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FBF9F5] border border-[#E8E4DD]">
            <h3 className="font-semibold text-[#1A1D20] text-base mb-2">
              3. Modular Monolith Architecture
            </h3>
            <p className="text-sm text-[#5A6065]">
              Spring Boot 4.1.1 on Java 21 LTS + PostgreSQL 17.11 + Next.js 16.x App Router + Nginx 1.30. Zero premature microservices overhead.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

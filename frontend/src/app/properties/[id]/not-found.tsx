import React from "react";
import Link from "next/link";
import { Building2, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";

export default function PropertyNotFound() {
  return (
    <div className="min-h-screen bg-sand flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-sand-dark text-forest flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-forest" />
        </div>
        <h1 className="font-serif font-bold text-2xl text-charcoal mb-2">
          This property is no longer available
        </h1>
        <p className="text-sm text-charcoal-light mb-6">
          The listing may have been rented, sold, or is currently under moderation review.
        </p>
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest text-white text-sm font-semibold hover:bg-forest/90 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Browse Available Properties
        </Link>
      </main>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ArrowLeft, Loader2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { PropertyCard } from "@/components/search/PropertyCard";
import { getMyFavorites } from "@/lib/connections-api";
import type { PropertySearchResult } from "@/types/property";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<PropertySearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    getMyFavorites(page, 20)
      .then((res) => {
        setFavorites(res.content || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-charcoal">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/properties"
            className="inline-flex items-center gap-1.5 text-xs text-charcoal-light hover:text-forest transition font-medium mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Search
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600">
              <Heart className="w-6 h-6 fill-rose-500" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal">
                My Saved Properties
              </h1>
              <p className="text-xs text-charcoal-light">
                Zero-brokerage listings you have favorited for quick access.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-charcoal-light">
            <Loader2 className="w-8 h-8 animate-spin text-forest" />
            <span className="text-xs">Loading saved properties...</span>
          </div>
        ) : favorites.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-white border border-[#E8E4DD] p-8 space-y-3">
            <Heart className="w-12 h-12 text-gray-300 mx-auto" />
            <h2 className="font-serif font-bold text-lg text-charcoal">
              No saved properties yet
            </h2>
            <p className="text-xs text-charcoal-light max-w-sm mx-auto">
              Browse our verified zero-brokerage listings and tap the heart icon to save listings here.
            </p>
            <Link
              href="/properties"
              className="inline-block px-5 py-2.5 rounded-xl bg-forest text-white text-xs font-semibold hover:bg-forest/90 transition shadow-sm"
            >
              Explore Properties
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((prop) => (
              <PropertyCard
                key={prop.id}
                property={prop}
                isHighlighted={false}
                onHover={() => {}}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

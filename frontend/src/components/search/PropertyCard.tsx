"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bed, Maximize2, Heart, MapPin, Loader2 } from "lucide-react";
import type { PropertySearchResult } from "@/types/property";
import { toggleFavorite } from "@/lib/connections-api";
import { useAuth } from "@/lib/auth-context";

interface PropertyCardProps {
  property: PropertySearchResult;
  isHighlighted?: boolean;
  onHover?: (id: number | null) => void;
  initialFavorited?: boolean;
}

export function PropertyCard({
  property,
  isHighlighted = false,
  onHover,
  initialFavorited = false,
}: PropertyCardProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [favLoading, setFavLoading] = useState(false);

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString("en-IN")}`;
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push("/login?redirect=/favorites");
      return;
    }
    if (favLoading) return;
    setFavLoading(true);
    setFavorited((prev) => !prev); // optimistic
    try {
      const res = await toggleFavorite(property.id);
      setFavorited(res.isFavorited);
    } catch {
      setFavorited((prev) => !prev); // revert
    } finally {
      setFavLoading(false);
    }
  };

  return (
    <div
      onMouseEnter={() => onHover?.(property.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`group relative bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col ${
        isHighlighted
          ? "border-amber ring-2 ring-amber/30 shadow-lg scale-[1.01]"
          : "border-[#E8E4DD] hover:border-forest/40 hover:shadow-md"
      }`}
    >
      <Link href={`/properties/${property.id}`} className="block relative w-full h-48 bg-sand-dark">
        {property.primaryImageUrl ? (
          <img
            src={property.primaryImageUrl}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-charcoal-light bg-[#F5F2EB]">
            <MapPin className="w-8 h-8 text-charcoal-light/50 mb-1" />
            <span className="text-xs font-medium">No photo available</span>
          </div>
        )}

        {/* Listing Type Tag */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest text-white shadow-sm">
            {property.listingType === "RENT" ? "For Rent" : "For Sale"}
          </span>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm text-charcoal border border-[#E8E4DD]">
            {property.propertyType.replace("_", " ")}
          </span>
        </div>

        {/* Favorite Button */}
        <button
          type="button"
          onClick={handleFavorite}
          aria-label={favorited ? "Remove from saved" : "Save property"}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors shadow-sm ${
            favorited
              ? "bg-rose-500 text-white hover:bg-rose-600"
              : "bg-white/80 text-charcoal hover:text-rose-500 hover:bg-white"
          }`}
        >
          {favLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Heart className={`w-4 h-4 ${favorited ? "fill-white" : ""}`} />
          )}
        </button>
      </Link>

      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          {/* Price & Maintenance */}
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-sans text-forest tracking-tight">
                {formatPrice(property.price)}
              </span>
              {property.listingType === "RENT" && (
                <span className="text-xs text-charcoal-light font-medium">/month</span>
              )}
            </div>
            {property.maintenanceCharges && property.maintenanceCharges > 0 ? (
              <span className="text-[11px] text-charcoal-light font-medium">
                +₹{property.maintenanceCharges.toLocaleString("en-IN")} maint.
              </span>
            ) : null}
          </div>

          {/* Title */}
          <Link href={`/properties/${property.id}`}>
            <h3 className="font-serif font-bold text-base text-charcoal group-hover:text-forest line-clamp-1 transition-colors">
              {property.title}
            </h3>
          </Link>

          {/* Location */}
          <p className="text-xs text-charcoal-light flex items-center gap-1 mt-1 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-forest shrink-0" />
            <span>{property.locality}, {property.district || property.city}</span>
          </p>

          {/* Specs Grid */}
          <div className="flex items-center gap-3.5 text-xs text-charcoal font-medium mt-3 pt-3 border-t border-[#F0ECE1]">
            {property.bhk ? (
              <div className="flex items-center gap-1">
                <Bed className="w-3.5 h-3.5 text-charcoal-light" />
                <span>{property.bhk} BHK</span>
              </div>
            ) : null}

            {property.carpetArea ? (
              <div className="flex items-center gap-1">
                <Maximize2 className="w-3.5 h-3.5 text-charcoal-light" />
                <span>{property.carpetArea} sq.ft</span>
              </div>
            ) : null}

            {property.furnishing ? (
              <span className="capitalize text-[11px] px-2 py-0.5 rounded bg-sand text-charcoal">
                {property.furnishing.replace("_", " ").toLowerCase()}
              </span>
            ) : null}
          </div>
        </div>

        {/* Amenities Highlights */}
        {property.amenities && property.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {property.amenities.slice(0, 3).map((a) => (
              <span
                key={a}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F5F2EB] text-charcoal-light"
              >
                {a.replace("_", " ")}
              </span>
            ))}
            {property.amenities.length > 3 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-charcoal-light">
                +{property.amenities.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

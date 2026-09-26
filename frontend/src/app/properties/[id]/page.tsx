import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  ShieldCheck,
  MapPin,
  Lock,
  Building,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { PhotoGallery } from "@/components/property/PhotoGallery";
import { MiniMap } from "@/components/map/MiniMap";
import type { PublicPropertyDetail } from "@/types/property";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchProperty(id: string): Promise<PublicPropertyDetail | null> {
  const backendBase =
    process.env.BACKEND_INTERNAL_URL ||
    (typeof window === "undefined"
      ? "http://platform-backend:8080"
      : "http://localhost:8080");

  try {
    const res = await fetch(`${backendBase}/api/v1/properties/${id}`, {
      cache: "no-store",
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await fetchProperty(id);

  if (!property) {
    return {
      title: "Property Not Found | RentalCircle",
      description: "The requested listing could not be found.",
    };
  }

  const priceText =
    property.listingType === "RENT"
      ? `₹${property.price.toLocaleString("en-IN")}/month`
      : `₹${property.price.toLocaleString("en-IN")}`;

  const desc =
    property.description?.slice(0, 160) ||
    `${property.bhk ? property.bhk + " BHK " : ""}${property.propertyType} for ${
      property.listingType === "RENT" ? "rent" : "sale"
    } in ${property.locality}, ${property.city}. Direct from verified owner.`;

  const primaryImage =
    property.images?.find((img) => img.isPrimary)?.url ||
    property.images?.[0]?.url;

  return {
    title: `${property.title} — ${property.locality}, ${property.city} | RentalCircle`,
    description: desc,
    openGraph: {
      title: `${property.title} | ${priceText}`,
      description: desc,
      images: primaryImage ? [{ url: primaryImage }] : [],
      type: "website",
    },
  };
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const property = await fetchProperty(id);

  if (!property) {
    notFound();
  }

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    if (price >= 100000) {
      return `₹${(price / 100000).toFixed(2)} L`;
    }
    return `₹${price.toLocaleString("en-IN")}`;
  };

  return (
    <div className="min-h-screen bg-sand flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Back Link */}
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 text-xs font-semibold text-charcoal hover:text-forest transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Search Results
        </Link>

        {/* Gallery */}
        <PhotoGallery images={property.images || []} title={property.title} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Details Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Header / Title / Badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-forest text-white">
                  {property.listingType === "RENT" ? "For Rent" : "For Sale"}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sand-dark text-charcoal border border-[#E8E4DD]">
                  {property.propertyType.replace("_", " ")}
                </span>
                {property.owner?.verifiedBadge && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    Verified Owner Listing
                  </span>
                )}
              </div>

              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal">
                {property.title}
              </h1>

              <p className="text-sm text-charcoal-light flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-forest shrink-0" />
                <span>
                  {property.locality}, {property.district}, {property.city},{" "}
                  {property.state} — {property.pincode}
                </span>
              </p>
            </div>

            {/* Price Box Mobile */}
            <div className="lg:hidden p-4 rounded-2xl bg-white border border-[#E8E4DD] shadow-sm">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-forest font-sans">
                  {formatPrice(property.price)}
                </span>
                {property.listingType === "RENT" && (
                  <span className="text-sm font-medium text-charcoal-light">/month</span>
                )}
              </div>
              {property.maintenanceCharges ? (
                <p className="text-xs text-charcoal-light mt-1">
                  + ₹{property.maintenanceCharges.toLocaleString("en-IN")} maintenance charges
                </p>
              ) : null}
            </div>

            {/* Specifications Grid */}
            <div className="bg-white border border-[#E8E4DD] rounded-2xl p-6 shadow-sm">
              <h2 className="font-serif font-bold text-lg text-charcoal mb-4">
                Property Overview
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {property.bhk ? (
                  <div className="p-3 rounded-xl bg-sand/50 border border-[#E8E4DD]/60">
                    <div className="flex items-center gap-1.5 text-xs text-charcoal-light mb-1">
                      <Bed className="w-4 h-4 text-forest" />
                      <span>Configuration</span>
                    </div>
                    <span className="text-sm font-bold text-charcoal">
                      {property.bhk} BHK ({property.bedrooms || property.bhk} Bed, {property.bathrooms || 1} Bath)
                    </span>
                  </div>
                ) : null}

                {property.carpetArea ? (
                  <div className="p-3 rounded-xl bg-sand/50 border border-[#E8E4DD]/60">
                    <div className="flex items-center gap-1.5 text-xs text-charcoal-light mb-1">
                      <Maximize2 className="w-4 h-4 text-forest" />
                      <span>Carpet Area</span>
                    </div>
                    <span className="text-sm font-bold text-charcoal">
                      {property.carpetArea} sq.ft
                    </span>
                  </div>
                ) : null}

                {property.furnishing ? (
                  <div className="p-3 rounded-xl bg-sand/50 border border-[#E8E4DD]/60">
                    <div className="flex items-center gap-1.5 text-xs text-charcoal-light mb-1">
                      <Building className="w-4 h-4 text-forest" />
                      <span>Furnishing</span>
                    </div>
                    <span className="text-sm font-bold text-charcoal capitalize">
                      {property.furnishing.replace("_", " ").toLowerCase()}
                    </span>
                  </div>
                ) : null}

                {property.floorNumber != null ? (
                  <div className="p-3 rounded-xl bg-sand/50 border border-[#E8E4DD]/60">
                    <div className="flex items-center gap-1.5 text-xs text-charcoal-light mb-1">
                      <Building className="w-4 h-4 text-forest" />
                      <span>Floor Level</span>
                    </div>
                    <span className="text-sm font-bold text-charcoal">
                      {property.floorNumber === 0 ? "Ground" : `${property.floorNumber}th`} of{" "}
                      {property.totalFloors || "?"} Floors
                    </span>
                  </div>
                ) : null}
              </div>

              {property.securityDeposit ? (
                <div className="mt-4 pt-4 border-t border-[#F0ECE1] flex items-center justify-between text-xs">
                  <span className="text-charcoal-light font-medium">Security Deposit:</span>
                  <span className="font-bold text-charcoal">
                    ₹{property.securityDeposit.toLocaleString("en-IN")}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Description */}
            {property.description && (
              <div className="bg-white border border-[#E8E4DD] rounded-2xl p-6 shadow-sm space-y-3">
                <h2 className="font-serif font-bold text-lg text-charcoal">Description</h2>
                <p className="text-sm text-charcoal leading-relaxed whitespace-pre-line">
                  {property.description}
                </p>
              </div>
            )}

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="bg-white border border-[#E8E4DD] rounded-2xl p-6 shadow-sm space-y-3">
                <h2 className="font-serif font-bold text-lg text-charcoal">Amenities & Features</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {property.amenities.map((a) => (
                    <div
                      key={a}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-sand/40 border border-[#E8E4DD]/70 text-xs font-semibold text-charcoal"
                    >
                      <div className="w-2 h-2 rounded-full bg-forest" />
                      <span>{a.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location & Privacy Notice */}
            <div className="bg-white border border-[#E8E4DD] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif font-bold text-lg text-charcoal">Location</h2>
                <span className="text-xs font-semibold text-forest flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {property.locality}, {property.city}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Privacy Protected Address:</span> Exact flat number
                  and building name are disclosed directly to authenticated tenants upon contact
                  request to protect owner privacy and prevent unauthorized broker harvesting.
                </div>
              </div>

              {property.latitude != null && property.longitude != null ? (
                <MiniMap
                  latitude={property.latitude}
                  longitude={property.longitude}
                  locality={property.locality}
                />
              ) : null}
            </div>
          </div>

          {/* Right Column: Sticky Contact / Price Card */}
          <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-6">
            <div className="bg-white border border-[#E8E4DD] rounded-2xl p-6 shadow-sm space-y-6">
              {/* Desktop Price */}
              <div className="hidden lg:block pb-4 border-b border-[#F0ECE1]">
                <span className="text-xs font-semibold text-charcoal-light uppercase tracking-wider block mb-1">
                  {property.listingType === "RENT" ? "Rental Price" : "Total Price"}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-forest font-sans">
                    {formatPrice(property.price)}
                  </span>
                  {property.listingType === "RENT" && (
                    <span className="text-sm font-medium text-charcoal-light">/month</span>
                  )}
                </div>
                {property.maintenanceCharges ? (
                  <p className="text-xs text-charcoal-light mt-1">
                    + ₹{property.maintenanceCharges.toLocaleString("en-IN")} maintenance charges
                  </p>
                ) : null}
              </div>

              {/* Owner Trust Badge */}
              <div className="p-3.5 rounded-xl bg-forest-light border border-forest/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-forest text-white flex items-center justify-center font-serif font-bold text-lg">
                  ✓
                </div>
                <div>
                  <span className="text-xs font-bold text-forest block">
                    Zero Brokerage Listing
                  </span>
                  <span className="text-[11px] text-charcoal-light">
                    Direct {property.owner?.ownershipType === "AUTHORIZED_REPRESENTATIVE" ? "Authorized Representative" : "Property Owner"}
                  </span>
                </div>
              </div>

              {/* Deferred Connection Card */}
              <div className="p-4 rounded-xl bg-sand border border-[#E8E4DD] text-center space-y-3">
                <span className="text-xs font-bold text-charcoal block">
                  Connect Directly with Owner
                </span>
                <p className="text-xs text-charcoal-light">
                  WhatsApp direct link, enquiries, and site visit scheduling unlock with an authenticated account.
                </p>
                <Link
                  href={`/login?redirect=/properties/${property.id}`}
                  className="block w-full py-2.5 px-4 rounded-xl bg-forest text-white text-xs font-semibold hover:bg-forest/90 transition-colors shadow-sm"
                >
                  Login to Contact Owner
                </Link>
                <span className="text-[10px] text-charcoal-light block">
                  No brokerage fee. 100% direct connection.
                </span>
              </div>

              {/* Listed Metadata */}
              <div className="text-[11px] text-charcoal-light pt-2 space-y-1">
                {property.availabilityDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-forest" />
                    <span>Available from: {property.availabilityDate}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span>Listed on: {new Date(property.createdAt).toLocaleDateString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

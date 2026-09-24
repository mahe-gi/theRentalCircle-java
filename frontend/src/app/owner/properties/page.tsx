"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlusCircle,
  Building2,
  MapPin,
  IndianRupee,
  Search,
  Filter,
  Trash2,
  Edit3,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { Property, PropertyStatus } from "@/types/property";

export default function OwnerPropertiesPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  // Fetch owner's properties
  const {
    data: propertiesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["owner-properties"],
    queryFn: async () => {
      const res = await apiClient.get("/properties/my");
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/properties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-properties"] });
      setPropertyToDelete(null);
      setDeleteErrorMessage(null);
    },
    onError: (err: unknown) => {
      const errorObj = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setDeleteErrorMessage(
        errorObj.response?.data?.message ||
          errorObj.message ||
          "Failed to delete property draft."
      );
    },
  });

  const properties = propertiesData || [];

  // Filter properties by search and status
  const filteredProperties = properties.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.locality.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.city.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === "ALL") return true;
    if (statusFilter === "DRAFT") return item.status === "DRAFT";
    if (statusFilter === "SUBMITTED")
      return item.status === "SUBMITTED" || item.status === "UNDER_REVIEW";
    if (statusFilter === "LIVE")
      return item.status === "LIVE" || item.status === "APPROVED";
    return true;
  });

  const renderStatusBadge = (status: PropertyStatus) => {
    switch (status) {
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber/15 text-amber border border-amber/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber" />
            Draft
          </span>
        );
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Submitted
          </span>
        );
      case "APPROVED":
      case "LIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Live
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-sand flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E4DD] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-light mb-1">
              <Link href="/owner/dashboard" className="hover:text-forest">
                Owner Portal
              </Link>
              <span>/</span>
              <span className="text-forest font-bold">My Properties</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal tracking-tight">
              My Listed Properties
            </h1>
            <p className="text-sm text-charcoal-light mt-1">
              Review draft listings, monitor review approvals, or edit property specs.
            </p>
          </div>

          <Link
            href="/owner/properties/new"
            className="px-5 py-2.5 rounded-xl bg-forest hover:bg-forest-hover active:bg-[#072625] text-white text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 shadow-md hover:shadow self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4 text-amber" />
            <span>Add New Property</span>
          </Link>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E8E4DD] shadow-sm">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-charcoal-light absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, locality, or city..."
              className="w-full pl-10 pr-4 py-2 bg-sand/60 border border-[#E8E4DD] rounded-xl text-xs sm:text-sm text-charcoal placeholder-charcoal-light/60 focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: `All (${properties.length})` },
              {
                id: "DRAFT",
                label: `Drafts (${properties.filter((p) => p.status === "DRAFT").length})`,
              },
              {
                id: "SUBMITTED",
                label: `Submitted (${
                  properties.filter(
                    (p) => p.status === "SUBMITTED" || p.status === "UNDER_REVIEW"
                  ).length
                })`,
              },
              {
                id: "LIVE",
                label: `Live (${
                  properties.filter((p) => p.status === "LIVE" || p.status === "APPROVED")
                    .length
                })`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? "bg-forest text-white shadow-sm"
                    : "bg-sand hover:bg-sand-muted text-charcoal"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Properties Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-white border border-[#E8E4DD] p-5 space-y-4 animate-pulse"
              >
                <div className="w-full h-44 bg-[#E8E4DD] rounded-xl" />
                <div className="h-5 bg-[#E8E4DD] rounded w-3/4" />
                <div className="h-4 bg-[#E8E4DD] rounded w-1/2" />
                <div className="h-9 bg-[#E8E4DD] rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="rounded-3xl bg-white border border-[#E8E4DD] p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-sand mx-auto flex items-center justify-center text-forest">
              <Building2 className="w-8 h-8 text-forest" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-lg font-serif font-bold text-charcoal">
                {properties.length === 0
                  ? "You have no properties yet"
                  : "No matching properties found"}
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-light">
                {properties.length === 0
                  ? "Start by creating your first property draft with our guided 5-step wizard."
                  : "Try adjusting your search criteria or filter tags."}
              </p>
            </div>
            {properties.length === 0 ? (
              <Link
                href="/owner/properties/new"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-forest hover:bg-forest-hover text-white text-sm font-semibold shadow-sm transition-colors"
              >
                <PlusCircle className="w-4 h-4 text-amber" />
                <span>Create New Listing</span>
              </Link>
            ) : (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="text-xs font-bold text-forest hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => {
              const coverImage =
                property.images?.find((img) => img.isPrimary) ||
                property.images?.[0];
              const imageUrl =
                coverImage?.url ||
                (coverImage?.storageKey ? `/uploads/${coverImage.storageKey}` : null);

              const isDraft = property.status === "DRAFT";

              return (
                <div
                  key={property.id}
                  className="rounded-3xl bg-white border border-[#E8E4DD] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Image Header with Status */}
                    <div className="relative h-48 bg-[#E8E4DD] overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={property.title}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-sand text-charcoal-light/60 gap-2">
                          <Building2 className="w-10 h-10 text-charcoal-light/40" />
                          <span className="text-xs font-medium">No cover image</span>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-3 left-3">
                        {renderStatusBadge(property.status)}
                      </div>

                      {/* Images count badge */}
                      {property.images && property.images.length > 0 && (
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                          {property.images.length} {property.images.length === 1 ? "photo" : "photos"}
                        </div>
                      )}

                      {/* Price Pill */}
                      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-forest shadow">
                        ₹{Number(property.price).toLocaleString("en-IN")}
                        {property.listingType === "RENT" ? " / mo" : ""}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs text-charcoal-light font-medium">
                        <MapPin className="w-3.5 h-3.5 text-forest shrink-0" />
                        <span className="truncate">
                          {property.locality}, {property.city}
                        </span>
                      </div>

                      <h3 className="font-serif font-bold text-lg text-charcoal line-clamp-1">
                        {property.title}
                      </h3>

                      {/* Specs pills */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-charcoal-light">
                        <span className="font-semibold text-charcoal px-2 py-0.5 rounded-lg bg-sand border border-[#E8E4DD]">
                          {property.bhk ? `${property.bhk} BHK` : property.propertyType}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-sand border border-[#E8E4DD]">
                          {property.listingType === "RENT" ? "Rent" : "Sale"}
                        </span>
                        {property.carpetArea && (
                          <span className="px-2 py-0.5 rounded-lg bg-sand border border-[#E8E4DD]">
                            {property.carpetArea} sq.ft
                          </span>
                        )}
                        {property.furnishing && (
                          <span className="px-2 py-0.5 rounded-lg bg-sand border border-[#E8E4DD] text-[11px]">
                            {property.furnishing.replace("_", " ")}
                          </span>
                        )}
                      </div>

                      {/* Moderation / Draft Notice */}
                      {property.status === "SUBMITTED" && (
                        <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center gap-2 text-xs text-blue-700">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>Submitted for verification review</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="px-5 pb-5 pt-3 border-t border-[#E8E4DD]/60 flex items-center justify-between gap-2">
                    {isDraft ? (
                      <>
                        <Link
                          href={`/owner/properties/new?id=${property.id}`}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-amber/15 hover:bg-amber/25 text-amber text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Draft</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPropertyToDelete(property)}
                          className="p-2.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 transition-colors"
                          title="Delete Draft"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedProperty(property)}
                        className="w-full py-2.5 px-4 rounded-xl bg-forest-light hover:bg-forest/15 text-forest text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View Details Modal */}
        {selectedProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#E8E4DD] shadow-2xl p-6 sm:p-8 space-y-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-[#E8E4DD] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {renderStatusBadge(selectedProperty.status)}
                    <span className="text-xs text-charcoal-light font-semibold">
                      Property ID #{selectedProperty.id}
                    </span>
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-charcoal">
                    {selectedProperty.title}
                  </h3>
                  <p className="text-xs text-charcoal-light flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-forest" />
                    <span>
                      {selectedProperty.address}, {selectedProperty.locality},{" "}
                      {selectedProperty.district}, {selectedProperty.city} -{" "}
                      {selectedProperty.pincode}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProperty(null)}
                  className="p-2 rounded-xl text-charcoal-light hover:bg-sand"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Price & Key Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-sand p-4 rounded-2xl border border-[#E8E4DD]">
                <div>
                  <span className="text-[11px] font-bold uppercase text-charcoal-light">
                    {selectedProperty.listingType === "RENT" ? "Monthly Rent" : "Price"}
                  </span>
                  <p className="text-base font-bold text-forest">
                    ₹{Number(selectedProperty.price).toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-charcoal-light">
                    Deposit
                  </span>
                  <p className="text-base font-bold text-charcoal">
                    ₹{Number(selectedProperty.securityDeposit || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-charcoal-light">
                    Carpet Area
                  </span>
                  <p className="text-base font-bold text-charcoal">
                    {selectedProperty.carpetArea ? `${selectedProperty.carpetArea} sq.ft` : "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-charcoal-light">
                    Furnishing
                  </span>
                  <p className="text-base font-bold text-charcoal">
                    {selectedProperty.furnishing ? selectedProperty.furnishing.replace("_", " ") : "N/A"}
                  </p>
                </div>
              </div>

              {/* Image Preview Gallery */}
              {selectedProperty.images && selectedProperty.images.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal">
                    Uploaded Photos ({selectedProperty.images.length})
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {selectedProperty.images.map((img) => (
                      <div
                        key={img.id}
                        className="relative h-24 rounded-xl overflow-hidden bg-sand border border-[#E8E4DD]"
                      >
                        <img
                          src={img.url || `/uploads/${img.storageKey}`}
                          alt="Property preview"
                          className="w-full h-full object-cover"
                        />
                        {img.isPrimary && (
                          <span className="absolute bottom-1 left-1 bg-amber text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            Cover
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedProperty.description && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal">
                    Description
                  </h4>
                  <p className="text-xs text-charcoal-light leading-relaxed bg-sand/60 p-3.5 rounded-xl border border-[#E8E4DD]">
                    {selectedProperty.description}
                  </p>
                </div>
              )}

              {/* Amenities */}
              {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal">
                    Amenities Included
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProperty.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-forest-light text-forest border border-forest/15"
                      >
                        ✓ {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Note */}
              <div className="p-4 rounded-2xl bg-sand border border-[#E8E4DD] text-xs text-charcoal-light flex items-center justify-between">
                <span>
                  Listing created on:{" "}
                  {selectedProperty.createdAt
                    ? new Date(selectedProperty.createdAt).toLocaleDateString()
                    : "Recently"}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedProperty(null)}
                  className="px-4 py-2 rounded-xl bg-forest text-white font-semibold hover:bg-forest-hover transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {propertyToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full border border-[#E8E4DD] shadow-2xl p-6 space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-serif text-xl font-bold text-charcoal">
                  Delete Property Draft?
                </h3>
                <p className="text-xs text-charcoal-light mt-1 leading-relaxed">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-charcoal">
                    &ldquo;{propertyToDelete.title}&rdquo;
                  </span>
                  ? This will permanently remove the draft and any uploaded photos.
                </p>
              </div>

              {deleteErrorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                  {deleteErrorMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPropertyToDelete(null);
                    setDeleteErrorMessage(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-[#E8E4DD] text-xs font-semibold text-charcoal hover:bg-sand"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(propertyToDelete.id)}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

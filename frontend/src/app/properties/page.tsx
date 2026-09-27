"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { FilterPanel } from "@/components/search/FilterPanel";
import { PropertyCard } from "@/components/search/PropertyCard";
import { PropertyMap } from "@/components/map/PropertyMap";
import { Pagination } from "@/components/search/Pagination";
import { searchProperties } from "@/lib/search-api";
import type { SearchFilters } from "@/types/property";
import { Building2, List, Map as MapIcon, SlidersHorizontal } from "lucide-react";

function PropertiesSearchContent() {
  const searchParams = useSearchParams();
  const initialCity = searchParams.get("city") || undefined;
  const initialListingType = (searchParams.get("listingType") as "RENT" | "SALE") || undefined;
  const initialPropertyType = searchParams.get("propertyType") || undefined;

  const [filters, setFilters] = useState<SearchFilters>({
    sort: "NEWEST",
    page: 0,
    size: 20,
    city: initialCity,
    listingType: initialListingType,
    propertyType: initialPropertyType,
  });

  useEffect(() => {
    const city = searchParams.get("city") || undefined;
    const listingType = (searchParams.get("listingType") as "RENT" | "SALE") || undefined;
    const propertyType = searchParams.get("propertyType") || undefined;
    setFilters((prev) => {
      if (prev.city === city && prev.listingType === listingType && prev.propertyType === propertyType) {
        return prev;
      }
      return {
        ...prev,
        city,
        listingType,
        propertyType,
        page: 0,
      };
    });
  }, [searchParams]);

  const [hoveredPropertyId, setHoveredPropertyId] = useState<number | null>(null);
  const [mobileTab, setMobileTab] = useState<"list" | "map">("list");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["properties-search", filters],
    queryFn: () => searchProperties(filters),
  });

  const properties = data?.content || [];
  const totalElements = data?.totalElements || 0;
  const totalPages = data?.totalPages || 0;
  const currentPage = data?.page || 0;

  const handleFilterChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      sort: "NEWEST",
      page: 0,
      size: 20,
    });
  };

  const handleBoundsChange = (bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }) => {
    setFilters((prev) => ({
      ...prev,
      minLat: bounds.minLat,
      maxLat: bounds.maxLat,
      minLng: bounds.minLng,
      maxLng: bounds.maxLng,
      page: 0,
    }));
  };

  const handlePinClick = (id: number) => {
    setHoveredPropertyId(id);
    if (mobileTab === "map") {
      setMobileTab("list");
    }
    const el = document.getElementById(`property-card-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-screen bg-sand flex flex-col">
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mobile Tab Toggle & Filter Drawer Button */}
        <div className="md:hidden flex items-center justify-between gap-3 mb-4">
          <div className="flex bg-white rounded-xl border border-[#E8E4DD] p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setMobileTab("list")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mobileTab === "list"
                  ? "bg-forest text-white shadow-sm"
                  : "text-charcoal-light hover:text-charcoal"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("map")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mobileTab === "map"
                  ? "bg-forest text-white shadow-sm"
                  : "text-charcoal-light hover:text-charcoal"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Map
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E8E4DD] text-xs font-semibold text-charcoal shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-forest" />
            Filters
          </button>
        </div>

        {/* Mobile Filter Sheet */}
        {mobileFilterOpen && (
          <div className="md:hidden mb-4">
            <FilterPanel
              filters={filters}
              onChange={(f) => {
                handleFilterChange(f);
                setMobileFilterOpen(false);
              }}
              onClear={handleClearFilters}
            />
          </div>
        )}

        {/* Desktop Split Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Filters + Listings */}
          <div
            className={`md:col-span-7 lg:col-span-7 space-y-6 ${
              mobileTab === "map" ? "hidden md:block" : "block"
            }`}
          >
            {/* Desktop Filter Panel */}
            <div className="hidden md:block">
              <FilterPanel
                filters={filters}
                onChange={handleFilterChange}
                onClear={handleClearFilters}
              />
            </div>

            {/* Results Count Header */}
            <div className="flex items-center justify-between text-xs text-charcoal-light px-1">
              <span className="font-semibold text-charcoal">
                {isLoading
                  ? "Searching verified properties..."
                  : `${totalElements} verified listings found`}
              </span>
              <span>Sorted by {filters.sort === "NEWEST" ? "Newest" : "Price"}</span>
            </div>

            {/* Error State */}
            {isError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">Unable to fetch properties</span>
                  <span className="text-[11px] text-rose-600">
                    {(error as any)?.response?.data?.message || (error as any)?.message || "Please check your network connection or try clearing filters."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="shrink-0 font-bold underline hover:text-rose-900 px-2 py-1 rounded hover:bg-rose-100"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading Skeletons */}
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-80 rounded-2xl bg-white border border-[#E8E4DD] animate-pulse p-4 space-y-3"
                  >
                    <div className="w-full h-40 bg-sand rounded-xl" />
                    <div className="h-4 bg-sand rounded w-3/4" />
                    <div className="h-4 bg-sand rounded w-1/2" />
                    <div className="h-6 bg-sand rounded w-1/3 mt-4" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !isError && properties.length === 0 && (
              <div className="bg-white border border-[#E8E4DD] rounded-2xl p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-forest-light text-forest mx-auto flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-lg text-charcoal">
                  No verified properties found
                </h3>
                <p className="text-xs text-charcoal-light max-w-sm mx-auto">
                  Try adjusting your filters or expanding your search area to find zero-brokerage listings.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-xs font-semibold px-4 py-2 rounded-xl bg-forest text-white hover:bg-forest/90 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}

            {/* Property Cards Grid */}
            {!isLoading && !isError && properties.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {properties.map((prop) => (
                  <div key={prop.id} id={`property-card-${prop.id}`}>
                    <PropertyCard
                      property={prop}
                      isHighlighted={hoveredPropertyId === prop.id}
                      onHover={setHoveredPropertyId}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
            />
          </div>

          {/* Right Column: Sticky Interactive Google Map */}
          <div
            className={`md:col-span-5 lg:col-span-5 md:sticky md:top-20 h-[calc(100vh-6rem)] rounded-2xl overflow-hidden border border-[#E8E4DD] shadow-sm ${
              mobileTab === "list" ? "hidden md:block" : "block h-[70vh]"
            }`}
          >
            <PropertyMap
              properties={properties}
              hoveredPropertyId={hoveredPropertyId}
              onBoundsChange={handleBoundsChange}
              onPinClick={handlePinClick}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PropertiesSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-sand flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest mb-2"></div>
          <span className="text-xs font-medium text-charcoal-light">Loading marketplace...</span>
        </div>
      }
    >
      <PropertiesSearchContent />
    </Suspense>
  );
}


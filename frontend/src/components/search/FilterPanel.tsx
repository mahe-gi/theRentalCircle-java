"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, X, RotateCcw, Check } from "lucide-react";
import { suggestLocations } from "@/lib/search-api";
import type { SearchFilters } from "@/types/property";

interface FilterPanelProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  onClear: () => void;
}

const PROPERTY_TYPES = [
  { label: "All Types", value: "" },
  { label: "Apartment", value: "APARTMENT" },
  { label: "Independent House", value: "INDEPENDENT_HOUSE" },
  { label: "Villa", value: "VILLA" },
  { label: "Plot", value: "PLOT" },
  { label: "Office", value: "OFFICE" },
  { label: "Shop", value: "SHOP" },
  { label: "Commercial", value: "COMMERCIAL_SPACE" },
];

const BHK_OPTIONS = [1, 2, 3, 4];

const AMENITY_OPTIONS = [
  "PARKING",
  "LIFT",
  "GYM",
  "SWIMMING_POOL",
  "POWER_BACKUP",
  "SECURITY",
  "WATER_SUPPLY",
  "GAS_PIPELINE",
];

export function FilterPanel({ filters, onChange, onClear }: FilterPanelProps) {
  const [cityInput, setCityInput] = useState(filters.city || "");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (cityInput.trim().length >= 2) {
      suggestLocations(cityInput, "CITY")
        .then((res) => {
          setSuggestions(res.cities || []);
          setShowSuggestions(true);
        })
        .catch(() => setSuggestions([]));
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [cityInput]);

  const handleListingType = (type: "RENT" | "SALE" | undefined) => {
    onChange({ ...filters, listingType: type, page: 0 });
  };

  const handlePropertyType = (val: string) => {
    onChange({ ...filters, propertyType: val || undefined, page: 0 });
  };

  const handleCitySelect = (city: string) => {
    setCityInput(city);
    setShowSuggestions(false);
    onChange({ ...filters, city, page: 0 });
  };

  const handleBhkToggle = (bhk: number) => {
    const current = filters.bhk || [];
    const next = current.includes(bhk)
      ? current.filter((b) => b !== bhk)
      : [...current, bhk];
    onChange({ ...filters, bhk: next.length > 0 ? next : undefined, page: 0 });
  };

  const handleAmenityToggle = (amenity: string) => {
    const current = filters.amenities || [];
    const next = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity];
    onChange({ ...filters, amenities: next.length > 0 ? next : undefined, page: 0 });
  };

  return (
    <div className="bg-white border border-[#E8E4DD] rounded-2xl p-5 shadow-sm space-y-6">
      {/* Header & Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1]">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-forest" />
          <h2 className="font-serif font-bold text-lg text-charcoal">Filters</h2>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-semibold text-charcoal-light hover:text-forest flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Listing Type Toggle (Rent / Buy) */}
      <div>
        <label className="text-xs font-semibold text-charcoal block mb-2">Intent</label>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-sand rounded-xl border border-[#E8E4DD]">
          <button
            type="button"
            onClick={() => handleListingType(undefined)}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
              !filters.listingType
                ? "bg-white text-forest shadow-sm"
                : "text-charcoal-light hover:text-charcoal"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => handleListingType("RENT")}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filters.listingType === "RENT"
                ? "bg-forest text-white shadow-sm"
                : "text-charcoal-light hover:text-charcoal"
            }`}
          >
            Rent
          </button>
          <button
            type="button"
            onClick={() => handleListingType("SALE")}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filters.listingType === "SALE"
                ? "bg-forest text-white shadow-sm"
                : "text-charcoal-light hover:text-charcoal"
            }`}
          >
            Buy
          </button>
        </div>
      </div>

      {/* City Autocomplete */}
      <div className="relative">
        <label className="text-xs font-semibold text-charcoal block mb-1.5">City</label>
        <div className="relative">
          <input
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onFocus={() => cityInput.trim().length >= 2 && setShowSuggestions(true)}
            placeholder="e.g. Bengaluru, Chennai"
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8E4DD] bg-sand/40 text-charcoal placeholder:text-charcoal-light/60 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
          />
          {cityInput && (
            <button
              type="button"
              onClick={() => {
                setCityInput("");
                onChange({ ...filters, city: undefined, page: 0 });
              }}
              className="absolute right-2.5 top-2.5 text-charcoal-light hover:text-charcoal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Suggestion Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E8E4DD] rounded-xl shadow-lg z-20 py-1 max-h-48 overflow-y-auto">
            {suggestions.map((c) => (
              <li
                key={c}
                onClick={() => handleCitySelect(c)}
                className="px-3 py-2 text-xs text-charcoal hover:bg-forest-light/40 cursor-pointer flex items-center justify-between"
              >
                <span>{c}</span>
                <span className="text-[10px] text-charcoal-light">Verified City</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Property Type Dropdown */}
      <div>
        <label className="text-xs font-semibold text-charcoal block mb-1.5">Property Type</label>
        <select
          value={filters.propertyType || ""}
          onChange={(e) => handlePropertyType(e.target.value)}
          className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#E8E4DD] bg-sand/40 text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
        >
          {PROPERTY_TYPES.map((pt) => (
            <option key={pt.value} value={pt.value}>
              {pt.label}
            </option>
          ))}
        </select>
      </div>

      {/* BHK Multi-Select */}
      <div>
        <label className="text-xs font-semibold text-charcoal block mb-1.5">Bedrooms (BHK)</label>
        <div className="grid grid-cols-4 gap-1.5">
          {BHK_OPTIONS.map((bhk) => {
            const isSelected = filters.bhk?.includes(bhk);
            return (
              <button
                key={bhk}
                type="button"
                onClick={() => handleBhkToggle(bhk)}
                className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                  isSelected
                    ? "bg-forest text-white border-forest shadow-sm"
                    : "bg-white text-charcoal border-[#E8E4DD] hover:border-forest/40"
                }`}
              >
                {bhk} BHK
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="text-xs font-semibold text-charcoal block mb-1.5">Price Range (₹)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min Price"
            value={filters.minPrice || ""}
            onChange={(e) =>
              onChange({
                ...filters,
                minPrice: e.target.value ? Number(e.target.value) : undefined,
                page: 0,
              })
            }
            className="w-full text-xs px-3 py-2 rounded-xl border border-[#E8E4DD] bg-sand/40 text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
          <input
            type="number"
            placeholder="Max Price"
            value={filters.maxPrice || ""}
            onChange={(e) =>
              onChange({
                ...filters,
                maxPrice: e.target.value ? Number(e.target.value) : undefined,
                page: 0,
              })
            }
            className="w-full text-xs px-3 py-2 rounded-xl border border-[#E8E4DD] bg-sand/40 text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>
      </div>

      {/* Furnishing */}
      <div>
        <label className="text-xs font-semibold text-charcoal block mb-1.5">Furnishing</label>
        <select
          value={filters.furnishing || ""}
          onChange={(e) =>
            onChange({
              ...filters,
              furnishing: e.target.value || undefined,
              page: 0,
            })
          }
          className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#E8E4DD] bg-sand/40 text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20"
        >
          <option value="">Any Furnishing</option>
          <option value="FURNISHED">Fully Furnished</option>
          <option value="SEMI_FURNISHED">Semi Furnished</option>
          <option value="UNFURNISHED">Unfurnished</option>
        </select>
      </div>

      {/* Amenities (AND Semantics) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-charcoal">Must Have Amenities</label>
          <span className="text-[10px] text-amber font-semibold">ALL selected required</span>
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
          {AMENITY_OPTIONS.map((a) => {
            const isChecked = filters.amenities?.includes(a);
            return (
              <label
                key={a}
                onClick={() => handleAmenityToggle(a)}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium cursor-pointer border transition-colors select-none ${
                  isChecked
                    ? "bg-forest-light text-forest border-forest/30 font-semibold"
                    : "bg-sand/30 text-charcoal-light border-transparent hover:bg-sand"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                    isChecked ? "bg-forest border-forest text-white" : "border-charcoal-light/50"
                  }`}
                >
                  {isChecked && <Check className="w-2.5 h-2.5" />}
                </div>
                <span className="truncate">{a.replace("_", " ")}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Sort Dropdown */}
      <div>
        <label className="text-xs font-semibold text-charcoal block mb-1.5">Sort Results By</label>
        <select
          value={filters.sort || "NEWEST"}
          onChange={(e) =>
            onChange({
              ...filters,
              sort: e.target.value as any,
              page: 0,
            })
          }
          className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#E8E4DD] bg-sand/40 text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20"
        >
          <option value="NEWEST">Newest Listings</option>
          <option value="PRICE_ASC">Price: Low to High</option>
          <option value="PRICE_DESC">Price: High to Low</option>
        </select>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { PropertySearchResult } from "@/types/property";

const PropertyMapInner = dynamic(() => import("./PropertyMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] bg-sand flex flex-col items-center justify-center text-charcoal-light">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest mb-2" />
      <span className="text-xs font-medium">Loading interactive map...</span>
    </div>
  ),
});

interface PropertyMapProps {
  properties: PropertySearchResult[];
  hoveredPropertyId?: number | null;
  onBoundsChange?: (bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }) => void;
  onPinClick?: (propertyId: number) => void;
}

export function PropertyMap(props: PropertyMapProps) {
  return <PropertyMapInner {...props} />;
}

"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import type { PropertySearchResult } from "@/types/property";
import { MapPin, Search } from "lucide-react";

interface PropertyMapInnerProps {
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

export default function PropertyMapInner({
  properties,
  hoveredPropertyId,
  onBoundsChange,
  onPinClick,
}: PropertyMapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<number, any>>(new Map());
  const isProgrammaticMoveRef = useRef<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSearchThisArea, setShowSearchThisArea] = useState(false);

  // Load Google Maps SDK
  useEffect(() => {
    let isCancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!isCancelled) setMapLoaded(true);
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error("Failed to load Google Maps SDK:", err);
          setLoadError("Could not load Google Maps. Please check your internet connection.");
        }
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    const defaultCenter = { lat: 12.9716, lng: 77.5946 }; // Bengaluru
    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 12,
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
        position: window.google.maps.ControlPosition.TOP_LEFT,
      },
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_CENTER,
      },
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    // Detect user pan/zoom interactions without triggering infinite fetch loops
    map.addListener("dragend", () => {
      setShowSearchThisArea(true);
    });

    map.addListener("zoom_changed", () => {
      if (!isProgrammaticMoveRef.current) {
        setShowSearchThisArea(true);
      }
    });

    map.addListener("idle", () => {
      if (isProgrammaticMoveRef.current) {
        isProgrammaticMoveRef.current = false;
      }
    });

    mapInstanceRef.current = map;
  }, [mapLoaded]);

  const handleSearchCurrentArea = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !onBoundsChange) return;

    const bounds = map.getBounds();
    if (!bounds) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    setShowSearchThisArea(false);
    onBoundsChange({
      minLat: sw.lat(),
      maxLat: ne.lat(),
      minLng: sw.lng(),
      maxLng: ne.lng(),
    });
  }, [onBoundsChange]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    const validProps = properties.filter(
      (p) => p.latitude != null && p.longitude != null
    );

    const bounds = new window.google.maps.LatLngBounds();

    validProps.forEach((prop) => {
      const isHovered = hoveredPropertyId === prop.id;
      const priceText =
        prop.price >= 10000000
          ? `₹${(prop.price / 10000000).toFixed(1)}Cr`
          : prop.price >= 100000
          ? `₹${(prop.price / 100000).toFixed(1)}L`
          : `₹${Math.round(prop.price / 1000)}k`;

      const fillColor = isHovered ? "%23D97706" : "%230F4C4A";
      const svgIcon = `data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="76" height="30" viewBox="0 0 76 30"><rect x="1" y="1" width="74" height="28" rx="14" fill="${fillColor}" stroke="%23FFFFFF" stroke-width="2"/><text x="38" y="19" fill="%23FFFFFF" font-size="11" font-weight="bold" font-family="sans-serif" text-anchor="middle">${priceText}</text></svg>`;

      const marker = new window.google.maps.Marker({
        position: { lat: prop.latitude!, lng: prop.longitude! },
        map,
        title: `${prop.title} • ${priceText}`,
        icon: {
          url: svgIcon,
          scaledSize: new window.google.maps.Size(76, 30),
          anchor: new window.google.maps.Point(38, 15),
        },
        zIndex: isHovered ? 999 : 1,
      });

      marker.addListener("click", () => {
        onPinClick?.(prop.id);
      });

      markersRef.current.set(prop.id, marker);
      bounds.extend({ lat: prop.latitude!, lng: prop.longitude! });
    });

    // Fit bounds only if properties changed and not during a hover update
    if (validProps.length > 0 && !hoveredPropertyId) {
      isProgrammaticMoveRef.current = true;
      map.fitBounds(bounds);
      // Avoid excessive zoom on single pin
      const listener = window.google.maps.event.addListener(map, "idle", () => {
        if (map.getZoom() > 16) {
          map.setZoom(16);
        }
        window.google.maps.event.removeListener(listener);
      });
    }
  }, [properties, hoveredPropertyId, onPinClick]);

  if (loadError) {
    return (
      <div className="w-full h-full min-h-[300px] bg-sand flex flex-col items-center justify-center p-6 text-center text-charcoal-light">
        <MapPin className="w-8 h-8 text-rose-500 mb-2" />
        <span className="text-xs font-semibold text-charcoal mb-1">Google Maps Unavailable</span>
        <p className="text-[11px] text-charcoal-light max-w-xs">{loadError}</p>
      </div>
    );
  }

  if (!mapLoaded) {
    return (
      <div className="w-full h-full min-h-[300px] bg-sand flex flex-col items-center justify-center text-charcoal-light">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest mb-2" />
        <span className="text-xs font-medium">Loading Google Maps...</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[300px]">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating "Search this area" button */}
      {showSearchThisArea && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 animate-in fade-in slide-in-from-top-2 duration-150">
          <button
            type="button"
            onClick={handleSearchCurrentArea}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-forest text-white text-xs font-semibold shadow-lg hover:bg-forest-hover active:bg-[#072625] transition-all border border-white/20"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search this area</span>
          </button>
        </div>
      )}
    </div>
  );
}

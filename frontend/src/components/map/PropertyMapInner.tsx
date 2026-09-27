"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Map as MapLibreMap,
  Marker,
  Popup,
  LngLatBounds,
  NavigationControl,
  FullscreenControl,
  AttributionControl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  DEFAULT_MAP_STYLE,
  configureMapLibreWorker,
  isValidCoordinate,
  formatPriceBadge,
} from "@/lib/maplibre-config";
import type { PropertySearchResult } from "@/types/property";
import { Search, MapPin } from "lucide-react";

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
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<number, { marker: Marker; element: HTMLElement }>>(new Map());
  const isProgrammaticMoveRef = useRef<boolean>(false);

  const [mapReady, setMapReady] = useState(false);
  const [showSearchThisArea, setShowSearchThisArea] = useState(false);

  // Filter properties with strictly valid geographic coordinates
  const validProperties = useMemo(() => {
    return properties.filter((p) => isValidCoordinate(p.latitude, p.longitude));
  }, [properties]);

  // Initialize MapLibre GL JS map with OpenFreeMap style
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    configureMapLibreWorker();

    // Default neutral center: India
    const defaultCenter: [number, number] = validProperties.length > 0
      ? [validProperties[0].longitude!, validProperties[0].latitude!]
      : [78.9629, 20.5937]; // [longitude, latitude]

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: DEFAULT_MAP_STYLE,
      center: defaultCenter,
      zoom: validProperties.length > 0 ? 12 : 4.5,
      attributionControl: false, // Customized below to ensure clear, readable attribution
    });

    // Navigation & Fullscreen controls
    map.addControl(new NavigationControl({ showCompass: true }), "top-left");
    map.addControl(new FullscreenControl(), "top-left");

    // Mandatory OpenFreeMap and OpenStreetMap attribution
    map.addControl(
      new AttributionControl({
        compact: false,
        customAttribution:
          '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      }),
      "bottom-right"
    );

    map.on("load", () => {
      setMapReady(true);
    });

    // User drag/zoom interactions activate the controlled "Search this area" button
    map.on("dragend", () => {
      setShowSearchThisArea(true);
    });

    map.on("zoomend", () => {
      if (!isProgrammaticMoveRef.current) {
        setShowSearchThisArea(true);
      }
    });

    map.on("moveend", () => {
      if (isProgrammaticMoveRef.current) {
        isProgrammaticMoveRef.current = false;
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // Run once on mount

  // Update property markers when validProperties or hoveredPropertyId changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current.clear();

    const bounds = new LngLatBounds();

    validProperties.forEach((prop) => {
      const priceText = formatPriceBadge(prop.price);
      const isHovered = hoveredPropertyId === prop.id;

      // Custom HTML Marker Element styled to match RentalCircle brand palette
      const markerEl = document.createElement("div");
      markerEl.className = "property-pin-marker group cursor-pointer transition-transform duration-150";
      markerEl.style.zIndex = isHovered ? "50" : "10";
      markerEl.innerHTML = `
        <div class="px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-md border-2 border-white flex items-center gap-1 transition-all ${
          isHovered
            ? "bg-[#D97706] scale-110 shadow-lg ring-2 ring-[#D97706]/40"
            : "bg-[#0F4C4A] hover:bg-[#1B4D3E]"
        }">
          <span>${priceText}</span>
        </div>
      `;

      // Public-safe popup with property preview
      const escapeHtml = (str: string) =>
        str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

      const popupContent = `
        <div style="font-family: inherit; padding: 4px; max-width: 220px; font-size: 12px; color: #111827;">
          ${
            prop.primaryImageUrl
              ? `<img src="${prop.primaryImageUrl}" alt="${escapeHtml(prop.title)}" style="width: 100%; height: 95px; object-fit: cover; border-radius: 8px; margin-bottom: 6px;" />`
              : ""
          }
          <div style="font-weight: 700; font-size: 13px; line-height: 1.3; margin-bottom: 2px;">${escapeHtml(prop.title)}</div>
          <div style="font-size: 11px; color: #4B5563; margin-bottom: 6px;">${escapeHtml(prop.locality)}, ${escapeHtml(prop.city)}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F0ECE1; padding-top: 6px; margin-top: 4px;">
            <span style="font-weight: 700; font-size: 13px; color: #0F4C4A;">${priceText}${prop.listingType === "RENT" ? "/mo" : ""}</span>
            <a href="/properties/${prop.id}" style="display: inline-block; font-size: 11px; font-weight: 600; background: #0F4C4A; color: #FFFFFF; text-decoration: none; padding: 3px 8px; border-radius: 6px;">View →</a>
          </div>
        </div>
      `;

      const popup = new Popup({
        offset: 18,
        closeButton: true,
        closeOnClick: false,
        maxWidth: "240px",
      }).setHTML(popupContent);

      markerEl.addEventListener("click", () => {
        onPinClick?.(prop.id);
      });

      // MapLibre Marker: [longitude, latitude]
      const marker = new Marker({ element: markerEl, anchor: "center" })
        .setLngLat([prop.longitude!, prop.latitude!])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.set(prop.id, { marker, element: markerEl });
      bounds.extend([prop.longitude!, prop.latitude!]);
    });

    // Auto-fit bounds on initial property set or filter update (unless currently user-hovering)
    if (validProperties.length > 0 && !hoveredPropertyId) {
      isProgrammaticMoveRef.current = true;
      map.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
        duration: 500,
      });
    }
  }, [validProperties, onPinClick]);

  // Synchronize hover state from parent without re-rendering all markers
  useEffect(() => {
    markersRef.current.forEach(({ element }, id) => {
      const isHovered = hoveredPropertyId === id;
      element.style.zIndex = isHovered ? "50" : "10";
      const badge = element.querySelector("div");
      if (badge) {
        if (isHovered) {
          badge.className =
            "px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-lg border-2 border-white flex items-center gap-1 transition-all bg-[#D97706] scale-110 ring-2 ring-[#D97706]/40";
        } else {
          badge.className =
            "px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-md border-2 border-white flex items-center gap-1 transition-all bg-[#0F4C4A] hover:bg-[#1B4D3E]";
        }
      }
    });
  }, [hoveredPropertyId]);

  // Handle Controlled Viewport Bounding-Box Search
  const handleSearchCurrentArea = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !onBoundsChange) return;

    const bounds = map.getBounds();
    setShowSearchThisArea(false);

    onBoundsChange({
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth(),
      minLng: bounds.getWest(),
      maxLng: bounds.getEast(),
    });
  }, [onBoundsChange]);

  return (
    <div className="relative w-full h-full min-h-[350px] bg-[#F4F1EA] select-none overflow-hidden rounded-2xl">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating "Search this area" Button */}
      {showSearchThisArea && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
          <button
            type="button"
            onClick={handleSearchCurrentArea}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0F4C4A] text-white text-xs font-semibold shadow-lg hover:bg-[#1B4D3E] active:bg-[#072625] transition-all border border-white/20"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search this area</span>
          </button>
        </div>
      )}

      {/* Empty State Banner if no valid coordinates returned */}
      {validProperties.length === 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-10 p-3 rounded-xl bg-white/95 backdrop-blur-md border border-[#E8E4DD] shadow-md flex items-center gap-2 text-xs text-charcoal">
          <MapPin className="w-4 h-4 text-forest shrink-0" />
          <span>No property coordinates found for the current search area.</span>
        </div>
      )}
    </div>
  );
}

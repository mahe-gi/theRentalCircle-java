"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PropertySearchResult } from "@/types/property";

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
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [12.9716, 77.5946], // Default Bengaluru
      zoom: 12,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    map.on("moveend", () => {
      if (!onBoundsChange) return;
      const b = map.getBounds();
      onBoundsChange({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
      });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    const validProps = properties.filter(
      (p) => p.latitude != null && p.longitude != null
    );

    const bounds = L.latLngBounds([]);

    validProps.forEach((prop) => {
      const isHovered = hoveredPropertyId === prop.id;
      const priceText =
        prop.price >= 10000000
          ? `₹${(prop.price / 10000000).toFixed(1)}Cr`
          : prop.price >= 100000
          ? `₹${(prop.price / 100000).toFixed(1)}L`
          : `₹${prop.price.toLocaleString("en-IN")}`;

      const icon = L.divIcon({
        className: "custom-property-pin",
        html: `
          <div style="
            background-color: ${isHovered ? "#D97706" : "#0F4C4A"};
            color: white;
            font-weight: 700;
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 9999px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
            border: 2px solid white;
            white-space: nowrap;
            transform: translate(-50%, -50%);
            transition: all 0.2s ease;
          ">
            ${priceText}
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker([prop.latitude!, prop.longitude!], { icon })
        .addTo(map)
        .on("click", () => onPinClick?.(prop.id));

      markersRef.current.set(prop.id, marker);
      bounds.extend([prop.latitude!, prop.longitude!]);
    });

    if (validProps.length > 0 && !hoveredPropertyId) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [properties, hoveredPropertyId, onPinClick]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[300px] z-0" />;
}

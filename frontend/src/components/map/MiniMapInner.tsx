"use client";

import React, { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  AttributionControl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  DEFAULT_MAP_STYLE,
  configureMapLibreWorker,
  isValidCoordinate,
  createGeoJsonCircle,
} from "@/lib/maplibre-config";
import { ShieldCheck, MapPin } from "lucide-react";

interface MiniMapInnerProps {
  latitude: number;
  longitude: number;
  locality?: string;
}

export default function MiniMapInner({
  latitude,
  longitude,
  locality,
}: MiniMapInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const hasValidCoords = isValidCoordinate(latitude, longitude);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !hasValidCoords) return;

    configureMapLibreWorker();

    const center: [number, number] = [longitude, latitude]; // [longitude, latitude]

    const map = new MapLibreMap({
      container: containerRef.current,
      style: DEFAULT_MAP_STYLE,
      center,
      zoom: 14.5,
      scrollZoom: false, // Prevent inadvertent page scroll hijacking
      attributionControl: false,
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-left");

    // Mandatory attribution
    map.addControl(
      new AttributionControl({
        compact: true,
        customAttribution:
          '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OSM</a>',
      }),
      "bottom-right"
    );

    map.on("load", () => {
      // Add 350m privacy circle polygon
      const circleGeoJson = createGeoJsonCircle(center, 350);

      map.addSource("privacy-circle-source", {
        type: "geojson",
        data: circleGeoJson,
      });

      map.addLayer({
        id: "privacy-circle-fill",
        type: "fill",
        source: "privacy-circle-source",
        paint: {
          "fill-color": "#0F4C4A",
          "fill-opacity": 0.15,
        },
      });

      map.addLayer({
        id: "privacy-circle-line",
        type: "line",
        source: "privacy-circle-source",
        paint: {
          "line-color": "#0F4C4A",
          "line-width": 2,
          "line-opacity": 0.75,
        },
      });

      // Center dot marker
      const markerEl = document.createElement("div");
      markerEl.className = "w-4 h-4 rounded-full bg-[#0F4C4A] border-2 border-white shadow-md";

      new Marker({ element: markerEl, anchor: "center" })
        .setLngLat(center)
        .addTo(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, hasValidCoords]);

  if (!hasValidCoords) {
    return (
      <div className="w-full h-64 rounded-2xl bg-[#F4F1EA] border border-[#E8E4DD] flex flex-col items-center justify-center p-6 text-center text-charcoal-light shadow-sm">
        <MapPin className="w-8 h-8 text-forest/60 mb-2" />
        <span className="text-xs font-semibold text-charcoal">Location: {locality || "Verified Area"}</span>
        <span className="text-[11px] text-charcoal-light mt-1">Coordinates not publicly mapped</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-[#E8E4DD] shadow-sm">
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Address Privacy Badge */}
      <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-sm border border-[#E8E4DD] text-[10px] font-semibold text-forest flex items-center gap-1 shadow-sm pointer-events-none">
        <ShieldCheck className="w-3 h-3 text-forest" />
        <span>Approximate locality shown for address privacy</span>
      </div>
    </div>
  );
}

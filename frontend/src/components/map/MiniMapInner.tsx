"use client";

import React, { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { MapPin, ShieldCheck } from "lucide-react";

interface MiniMapInnerProps {
  latitude: number;
  longitude: number;
  locality?: string;
}

export default function MiniMapInner({ latitude, longitude, locality }: MiniMapInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!isCancelled) setMapLoaded(true);
      })
      .catch((err) => {
        if (!isCancelled) {
          // Fallback gracefully without showing an error box
          setMapLoaded(false);
        }
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapLoaded || !containerRef.current || mapRef.current || !window.google?.maps) return;

    const center = { lat: latitude, lng: longitude };
    const map = new window.google.maps.Map(containerRef.current, {
      center,
      zoom: 15,
      mapTypeControl: false,
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

    // Approximate area circle for address privacy
    new window.google.maps.Circle({
      strokeColor: "#0F4C4A",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#0F4C4A",
      fillOpacity: 0.15,
      map,
      center,
      radius: 350, // 350m privacy radius
    });

    const marker = new window.google.maps.Marker({
      position: center,
      map,
      title: locality || "Property Area",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: "#0F4C4A",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 2,
      },
    });

    mapRef.current = map;
  }, [mapLoaded, latitude, longitude, locality]);

  // If live Google Maps is loaded, render the Google Maps container
  if (mapLoaded) {
    return (
      <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-[#E8E4DD] shadow-sm">
        <div ref={containerRef} className="w-full h-full z-0" />
        <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-sm border border-[#E8E4DD] text-[10px] font-semibold text-forest flex items-center gap-1 shadow-sm">
          <ShieldCheck className="w-3 h-3 text-forest" />
          <span>Approximate locality shown for address privacy</span>
        </div>
      </div>
    );
  }

  // Graceful Fallback Vector Map preview
  return (
    <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-[#F4F1EA] border border-[#E8E4DD] flex items-center justify-center shadow-sm select-none">
      {/* Background Coordinate Grid */}
      <svg className="w-full h-full absolute inset-0 pointer-events-none opacity-40">
        <defs>
          <pattern id="mini-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#D5CFBE" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mini-grid)" />
      </svg>

      {/* 350m Privacy Area Circle Representation */}
      <div className="absolute w-44 h-44 rounded-full border-2 border-[#0F4C4A]/40 bg-[#0F4C4A]/10 animate-pulse pointer-events-none" />

      {/* Pin with Locality Badge */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="px-3 py-1.5 rounded-full bg-forest text-white text-xs font-bold shadow-md border-2 border-white flex items-center gap-1.5 mb-1">
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span>{locality || "Verified Location"}</span>
        </div>
        <span className="text-[10px] text-charcoal-light bg-white/80 px-2 py-0.5 rounded-full border border-[#E8E4DD]">
          {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
        </span>
      </div>

      <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-sm border border-[#E8E4DD] text-[10px] font-semibold text-forest flex items-center gap-1 shadow-sm">
        <ShieldCheck className="w-3 h-3 text-forest" />
        <span>Approximate locality shown for address privacy</span>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { MapPin } from "lucide-react";

interface MiniMapInnerProps {
  latitude: number;
  longitude: number;
  locality?: string;
}

export default function MiniMapInner({ latitude, longitude, locality }: MiniMapInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!isCancelled) setMapLoaded(true);
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error("Failed to load Google Maps for MiniMap:", err);
          setError("Could not load Google Maps");
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

    const marker = new window.google.maps.Marker({
      position: center,
      map,
      title: locality || "Property Location",
    });

    // Approximate area circle for address privacy
    new window.google.maps.Circle({
      strokeColor: "#0F4C4A",
      strokeOpacity: 0.6,
      strokeWeight: 2,
      fillColor: "#0F4C4A",
      fillOpacity: 0.12,
      map,
      center,
      radius: 350, // 350m privacy radius
    });

    mapRef.current = map;
  }, [mapLoaded, latitude, longitude, locality]);

  if (error) {
    return (
      <div className="w-full h-64 rounded-2xl bg-sand flex flex-col items-center justify-center p-6 text-center text-charcoal-light border border-[#E8E4DD]">
        <MapPin className="w-8 h-8 text-rose-500 mb-2" />
        <span className="text-xs font-semibold text-charcoal">Location: {locality || "Verified Area"}</span>
        <span className="text-[11px] text-charcoal-light mt-1">Google Maps preview unavailable</span>
      </div>
    );
  }

  if (!mapLoaded) {
    return (
      <div className="w-full h-64 rounded-2xl bg-sand flex flex-col items-center justify-center text-charcoal-light border border-[#E8E4DD]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-forest mb-2" />
        <span className="text-xs font-medium">Loading Google Maps...</span>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-64 rounded-2xl overflow-hidden border border-[#E8E4DD] z-0" />;
}

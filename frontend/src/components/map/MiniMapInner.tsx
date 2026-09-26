"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MiniMapInnerProps {
  latitude: number;
  longitude: number;
  locality?: string;
}

export default function MiniMapInner({ latitude, longitude, locality }: MiniMapInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 14,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    const icon = L.divIcon({
      className: "mini-map-pin",
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background-color: #0F4C4A;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          transform: translate(-50%, -50%);
        "></div>
      `,
      iconSize: [0, 0],
    });

    L.marker([latitude, longitude], { icon }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude]);

  return <div ref={containerRef} className="w-full h-64 rounded-2xl overflow-hidden border border-[#E8E4DD] z-0" />;
}

"use client";

import React from "react";
import dynamic from "next/dynamic";

const MiniMapInner = dynamic(() => import("./MiniMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 rounded-2xl bg-sand flex items-center justify-center text-charcoal-light">
      <span className="text-xs font-medium">Loading location map...</span>
    </div>
  ),
});

interface MiniMapProps {
  latitude: number;
  longitude: number;
  locality?: string;
}

export function MiniMap(props: MiniMapProps) {
  return <MiniMapInner {...props} />;
}

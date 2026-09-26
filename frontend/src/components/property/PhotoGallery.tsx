"use client";

import React, { useState } from "react";
import { MapPin } from "lucide-react";

interface PhotoGalleryProps {
  images: Array<{
    id: number;
    url: string;
    displayOrder: number;
    isPrimary: boolean;
  }>;
  title: string;
}

export function PhotoGallery({ images, title }: PhotoGalleryProps) {
  const sorted = [...images].sort((a, b) => {
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    return a.displayOrder - b.displayOrder;
  });

  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!sorted || sorted.length === 0) {
    return (
      <div className="w-full aspect-video rounded-2xl bg-[#F5F2EB] flex flex-col items-center justify-center text-charcoal-light border border-[#E8E4DD]">
        <MapPin className="w-12 h-12 text-charcoal-light/40 mb-2" />
        <span className="text-sm font-medium">No verified photos uploaded</span>
      </div>
    );
  }

  const current = sorted[selectedIndex] || sorted[0];

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div className="w-full aspect-video sm:aspect-[16/9] rounded-2xl overflow-hidden bg-sand border border-[#E8E4DD] shadow-sm relative group">
        <img
          src={current.url}
          alt={`${title} - Photo ${selectedIndex + 1}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
          {selectedIndex + 1} / {sorted.length}
        </div>
      </div>

      {/* Thumbnails */}
      {sorted.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {sorted.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`relative w-20 h-16 sm:w-24 sm:h-18 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                selectedIndex === idx
                  ? "border-forest shadow-md scale-105"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={img.url}
                alt={`${title} - Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

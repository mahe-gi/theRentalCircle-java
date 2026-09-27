"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  loadGoogleMaps,
  getGoogleMapsApiKey,
  setGoogleMapsApiKey,
  hasGoogleMapsApiKey,
} from "@/lib/google-maps-loader";
import type { PropertySearchResult } from "@/types/property";
import {
  MapPin,
  Search,
  KeyRound,
  ExternalLink,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import Link from "next/link";

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
  const infoWindowRef = useRef<any>(null);
  const isProgrammaticMoveRef = useRef<boolean>(false);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [showSearchThisArea, setShowSearchThisArea] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [activePropertyTooltip, setActivePropertyTooltip] = useState<PropertySearchResult | null>(null);

  // Fallback vector map state (for when no Google Maps key is supplied)
  const [viewCenter, setViewCenter] = useState({ lat: 17.385, lng: 78.4867 }); // Hyderabad default
  const [zoomLevel, setZoomLevel] = useState(11);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const currentApiKey = typeof window !== "undefined" ? getGoogleMapsApiKey() : "";

  // Helper to format price for pin badges
  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
    return `₹${Math.round(price / 1000)}k`;
  };

  const validProperties = useMemo(() => {
    return properties.filter((p) => p.latitude != null && p.longitude != null);
  }, [properties]);

  // Load Google Maps SDK
  const attemptGoogleMapsLoad = useCallback(() => {
    setAuthError(false);
    loadGoogleMaps()
      .then(() => {
        setMapLoaded(true);
        setAuthError(false);
      })
      .catch((err) => {
        setMapLoaded(false);
        if (err?.message !== "MISSING_API_KEY") {
          console.warn("[PropertyMap] Google Maps load fallback:", err);
        }
      });
  }, []);

  useEffect(() => {
    attemptGoogleMapsLoad();

    const handleAuthFailed = () => {
      setAuthError(true);
      setMapLoaded(false);
    };

    const handleKeyChanged = () => {
      mapInstanceRef.current = null;
      attemptGoogleMapsLoad();
    };

    window.addEventListener("google-maps-auth-failed", handleAuthFailed);
    window.addEventListener("google-maps-key-changed", handleKeyChanged);

    return () => {
      window.removeEventListener("google-maps-auth-failed", handleAuthFailed);
      window.removeEventListener("google-maps-key-changed", handleKeyChanged);
    };
  }, [attemptGoogleMapsLoad]);

  // Initialize Google Maps instance
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || mapInstanceRef.current || !window.google?.maps) {
      return;
    }

    const defaultCenter = validProperties.length > 0
      ? { lat: validProperties[0].latitude!, lng: validProperties[0].longitude! }
      : { lat: 17.385, lng: 78.4867 }; // Hyderabad

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

    infoWindowRef.current = new window.google.maps.InfoWindow();

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
  }, [mapLoaded, validProperties]);

  // Update Google Maps markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    const bounds = new window.google.maps.LatLngBounds();

    validProperties.forEach((prop) => {
      const isHovered = hoveredPropertyId === prop.id;
      const priceText = formatPrice(prop.price);
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
        setActivePropertyTooltip(prop);

        // Open InfoWindow
        if (infoWindowRef.current) {
          const content = `
            <div style="font-family: sans-serif; padding: 6px; max-width: 220px;">
              ${prop.primaryImageUrl ? `<img src="${prop.primaryImageUrl}" style="width: 100%; height: 95px; object-fit: cover; border-radius: 8px; margin-bottom: 6px;" />` : ""}
              <div style="font-weight: bold; font-size: 13px; color: #111827; margin-bottom: 2px;">${prop.title}</div>
              <div style="font-size: 11px; color: #4B5563; margin-bottom: 6px;">${prop.locality}, ${prop.city}</div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; font-size: 13px; color: #0F4C4A;">${priceText}${prop.listingType === "RENT" ? "/mo" : ""}</span>
                <a href="/properties/${prop.id}" style="font-size: 11px; background: #0F4C4A; color: #ffffff; text-decoration: none; padding: 3px 8px; border-radius: 6px; font-weight: 600;">View →</a>
              </div>
            </div>
          `;
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(map, marker);
        }
      });

      markersRef.current.set(prop.id, marker);
      bounds.extend({ lat: prop.latitude!, lng: prop.longitude! });
    });

    // Auto-fit bounds on initial property load or list update (not on card hover)
    if (validProperties.length > 0 && !hoveredPropertyId) {
      isProgrammaticMoveRef.current = true;
      map.fitBounds(bounds);
      const listener = window.google.maps.event.addListener(map, "idle", () => {
        if (map.getZoom() > 16) {
          map.setZoom(16);
        }
        window.google.maps.event.removeListener(listener);
      });
    }
  }, [mapLoaded, validProperties, hoveredPropertyId, onPinClick]);

  // Synchronize center when validProperties change in Fallback mode
  useEffect(() => {
    if (!mapLoaded && validProperties.length > 0) {
      const avgLat = validProperties.reduce((acc, p) => acc + p.latitude!, 0) / validProperties.length;
      const avgLng = validProperties.reduce((acc, p) => acc + p.longitude!, 0) / validProperties.length;
      setViewCenter({ lat: avgLat, lng: avgLng });
    }
  }, [validProperties, mapLoaded]);

  const handleSearchCurrentArea = useCallback(() => {
    setShowSearchThisArea(false);
    if (mapLoaded && mapInstanceRef.current && onBoundsChange) {
      const bounds = mapInstanceRef.current.getBounds();
      if (!bounds) return;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      onBoundsChange({
        minLat: sw.lat(),
        maxLat: ne.lat(),
        minLng: sw.lng(),
        maxLng: ne.lng(),
      });
    } else if (onBoundsChange) {
      // Calculate approximate bounds for fallback vector map
      const latDelta = 0.08 * Math.pow(2, 12 - zoomLevel);
      const lngDelta = 0.08 * Math.pow(2, 12 - zoomLevel);
      onBoundsChange({
        minLat: viewCenter.lat - latDelta,
        maxLat: viewCenter.lat + latDelta,
        minLng: viewCenter.lng - lngDelta,
        maxLng: viewCenter.lng + lngDelta,
      });
    }
  }, [mapLoaded, onBoundsChange, viewCenter, zoomLevel]);

  const handleSaveApiKey = () => {
    if (keyInput.trim()) {
      setGoogleMapsApiKey(keyInput.trim());
      setShowKeyModal(false);
      setKeyInput("");
      attemptGoogleMapsLoad();
    }
  };

  // Convert (lat, lng) to vector SVG percentage coordinates relative to viewCenter
  const projectCoordinates = useCallback(
    (lat: number, lng: number) => {
      const latSpan = 0.12 * Math.pow(2, 12 - zoomLevel);
      const lngSpan = 0.14 * Math.pow(2, 12 - zoomLevel);

      const x = 50 + ((lng - viewCenter.lng) / lngSpan) * 50;
      const y = 50 - ((lat - viewCenter.lat) / latSpan) * 50;

      return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
    },
    [viewCenter, zoomLevel]
  );

  return (
    <div className="relative w-full h-full min-h-[350px] bg-[#F4F1EA] select-none overflow-hidden rounded-2xl">
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        {/* Status Indicator */}
        <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm border border-[#E8E4DD] shadow-sm text-[11px] font-medium text-charcoal">
          <span
            className={`w-2 h-2 rounded-full ${
              mapLoaded ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`}
          />
          <span>{mapLoaded ? "Google Maps Live" : "Interactive Map Preview"}</span>
        </div>

        {/* API Key Settings Button */}
        <button
          type="button"
          onClick={() => setShowKeyModal(true)}
          className="pointer-events-auto flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm border border-[#E8E4DD] shadow-sm text-[11px] font-semibold text-forest hover:bg-white hover:text-forest-hover transition-all"
          title="Configure Google Maps API Key"
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
          <span>{hasGoogleMapsApiKey() ? "API Key Configured" : "Add Google Maps Key"}</span>
        </button>
      </div>

      {/* Floating "Search this area" button */}
      {showSearchThisArea && (
        <div className="absolute top-14 left-1/2 transform -translate-x-1/2 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
          <button
            type="button"
            onClick={handleSearchCurrentArea}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-forest text-white text-xs font-semibold shadow-lg hover:bg-forest/90 active:bg-forest-hover transition-all border border-white/20"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search this area</span>
          </button>
        </div>
      )}

      {/* Mode A: Google Maps Native Container */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full z-0 transition-opacity duration-300 ${
          mapLoaded ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0"
        }`}
      />

      {/* Mode B: Interactive Fallback Vector Map (Rendered when no Google Maps Key is present or auth failed) */}
      {!mapLoaded && (
        <div
          className="w-full h-full relative cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => {
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
          }}
          onMouseMove={(e) => {
            if (!isDragging || !dragStart) return;
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;
            setDragStart({ x: e.clientX, y: e.clientY });

            const factor = 0.0003 * Math.pow(2, 12 - zoomLevel);
            setViewCenter((prev) => ({
              lat: prev.lat + dy * factor,
              lng: prev.lng - dx * factor,
            }));
            setShowSearchThisArea(true);
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        >
          {/* Subtle Vector Background Grid */}
          <svg className="w-full h-full absolute inset-0 pointer-events-none opacity-40">
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#D5CFBE" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>

          {/* Fallback Notice Banner */}
          <div className="absolute bottom-4 left-4 right-4 z-10 p-3 rounded-xl bg-white/95 backdrop-blur-md border border-[#E8E4DD] shadow-md flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-forest shrink-0" />
              <span className="text-charcoal text-[11px]">
                {authError
                  ? "Google Maps key rejected or billing not enabled. Using interactive fallback map."
                  : "Using vector map view. Enter a Google Maps API key to activate live satellite and road tiles."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowKeyModal(true)}
              className="shrink-0 font-bold px-3 py-1 rounded-lg bg-forest text-white text-[11px] hover:bg-forest/90"
            >
              Enter API Key
            </button>
          </div>

          {/* Zoom Controls for Vector Map */}
          <div className="absolute right-4 bottom-20 z-10 flex flex-col gap-1 bg-white rounded-xl shadow-md border border-[#E8E4DD] p-1">
            <button
              type="button"
              onClick={() => {
                setZoomLevel((z) => Math.min(z + 1, 16));
                setShowSearchThisArea(true);
              }}
              className="p-1.5 hover:bg-sand rounded-lg text-charcoal"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="h-[1px] bg-[#E8E4DD] mx-1" />
            <button
              type="button"
              onClick={() => {
                setZoomLevel((z) => Math.max(z - 1, 6));
                setShowSearchThisArea(true);
              }}
              className="p-1.5 hover:bg-sand rounded-lg text-charcoal"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="h-[1px] bg-[#E8E4DD] mx-1" />
            <button
              type="button"
              onClick={() => {
                if (validProperties.length > 0) {
                  const avgLat = validProperties.reduce((acc, p) => acc + p.latitude!, 0) / validProperties.length;
                  const avgLng = validProperties.reduce((acc, p) => acc + p.longitude!, 0) / validProperties.length;
                  setViewCenter({ lat: avgLat, lng: avgLng });
                  setZoomLevel(11);
                }
              }}
              className="p-1.5 hover:bg-sand rounded-lg text-charcoal"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Property Markers in Vector View */}
          {validProperties.map((prop) => {
            const { x, y } = projectCoordinates(prop.latitude!, prop.longitude!);
            const isHovered = hoveredPropertyId === prop.id;
            const priceText = formatPrice(prop.price);

            return (
              <div
                key={prop.id}
                style={{
                  position: "absolute",
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `translate(-50%, -50%) scale(${isHovered ? 1.15 : 1})`,
                  zIndex: isHovered ? 30 : 10,
                  transition: "transform 0.15s ease",
                }}
                className="cursor-pointer group"
                onClick={() => {
                  onPinClick?.(prop.id);
                  setActivePropertyTooltip(prop);
                }}
              >
                <div
                  className={`px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-md border-2 border-white transition-colors flex items-center gap-1 ${
                    isHovered ? "bg-[#D97706]" : "bg-[#0F4C4A]"
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  <span>{priceText}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Property Details Tooltip Modal (When pin clicked in fallback mode) */}
      {activePropertyTooltip && !mapLoaded && (
        <div className="absolute top-16 left-4 right-4 z-30 p-4 rounded-2xl bg-white border border-[#E8E4DD] shadow-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex gap-3">
            {activePropertyTooltip.primaryImageUrl && (
              <img
                src={activePropertyTooltip.primaryImageUrl}
                alt={activePropertyTooltip.title}
                className="w-20 h-20 rounded-xl object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-charcoal truncate">
                {activePropertyTooltip.title}
              </h4>
              <p className="text-xs text-charcoal-light truncate mb-1">
                {activePropertyTooltip.locality}, {activePropertyTooltip.city}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold text-forest text-sm">
                  {formatPrice(activePropertyTooltip.price)}
                  {activePropertyTooltip.listingType === "RENT" ? "/mo" : ""}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePropertyTooltip(null)}
                    className="px-2.5 py-1 text-xs text-charcoal-light hover:text-charcoal"
                  >
                    Close
                  </button>
                  <Link
                    href={`/properties/${activePropertyTooltip.id}`}
                    className="px-3 py-1 rounded-lg bg-forest text-white text-xs font-semibold hover:bg-forest/90"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Maps API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E8E4DD] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0ECE1]">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-forest" />
                <h3 className="font-serif font-bold text-lg text-charcoal">
                  Google Maps API Configuration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="text-charcoal-light hover:text-charcoal text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-charcoal-light leading-relaxed">
              Google Maps requires an API key with <strong>Maps JavaScript API</strong> enabled to load live road and satellite tiles.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-charcoal block">
                Google Maps API Key:
              </label>
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={currentApiKey ? "••••••••••••••••" : "AIzaSy..."}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E4DD] text-xs focus:outline-none focus:ring-2 focus:ring-forest text-charcoal"
              />
              {currentApiKey && (
                <div className="flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                  <span>An API key is currently saved.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleMapsApiKey("");
                      setMapLoaded(false);
                      setKeyInput("");
                    }}
                    className="text-rose-600 font-semibold hover:underline"
                  >
                    Clear Key
                  </button>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-sand border border-[#E8E4DD] text-[11px] text-charcoal-light space-y-1">
              <p className="font-semibold text-charcoal flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                How to get a free API key:
              </p>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Go to Google Cloud Console.</li>
                <li>Enable the "Maps JavaScript API".</li>
                <li>Create credentials (API Key) and paste here.</li>
              </ol>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal-light hover:text-charcoal"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                disabled={!keyInput.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-forest text-white hover:bg-forest/90 disabled:opacity-50 transition-colors shadow-sm"
              >
                Save & Load Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

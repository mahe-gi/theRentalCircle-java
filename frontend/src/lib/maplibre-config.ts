import { setWorkerUrl } from 'maplibre-gl';

let workerConfigured = false;

export const DEFAULT_MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  'https://tiles.openfreemap.org/styles/liberty';

export function configureMapLibreWorker(): void {
  if (typeof window === 'undefined') return;
  if (workerConfigured) return;

  try {
    setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
    workerConfigured = true;
  } catch (err) {
    console.warn('[MapLibre] Could not set custom worker URL, using default:', err);
  }
}

export function isValidCoordinate(
  latitude?: number | null,
  longitude?: number | null
): boolean {
  if (latitude == null || longitude == null) return false;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  // Ignore null island (0, 0)
  if (latitude === 0 && longitude === 0) return false;
  return true;
}

export function formatPriceBadge(price: number): string {
  if (price >= 10000000) {
    return `₹${(price / 10000000).toFixed(1)}Cr`;
  }
  if (price >= 100000) {
    return `₹${(price / 100000).toFixed(1)}L`;
  }
  return `₹${Math.round(price / 1000)}k`;
}

/**
 * Creates a GeoJSON circle polygon for address privacy (e.g. 350m radius).
 * Center coordinates: [longitude, latitude]
 */
export function createGeoJsonCircle(
  centerLngLat: [number, number],
  radiusInMeters = 350,
  points = 64
) {
  const coords: [number, number][] = [];
  const km = radiusInMeters / 1000;
  const distanceX = km / (111.32 * Math.cos((centerLngLat[1] * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([centerLngLat[0] + x, centerLngLat[1] + y]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords],
    },
    properties: {},
  };
}

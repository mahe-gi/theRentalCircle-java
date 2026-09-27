let loadPromise: Promise<void> | null = null;
let authFailed = false;

const STORAGE_KEY = "rentalcircle_google_maps_api_key";

export function getGoogleMapsApiKey(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  }
  const localKey = localStorage.getItem(STORAGE_KEY);
  if (localKey && localKey.trim()) {
    return localKey.trim();
  }
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
}

export function setGoogleMapsApiKey(key: string): void {
  if (typeof window === "undefined") return;
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  authFailed = false;
  loadPromise = null;

  // Remove existing script if any
  const existingScript = document.getElementById("google-maps-sdk");
  if (existingScript) {
    existingScript.remove();
  }
  if (window.google?.maps) {
    // @ts-ignore
    delete window.google.maps;
  }

  window.dispatchEvent(new CustomEvent("google-maps-key-changed", { detail: { apiKey: trimmed } }));
}

export function hasGoogleMapsApiKey(): boolean {
  return Boolean(getGoogleMapsApiKey());
}

export function isGoogleMapsAuthFailed(): boolean {
  return authFailed;
}

export function loadGoogleMaps(forceKey?: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cannot load Google Maps on server"));
  }

  if (window.google?.maps && !authFailed) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  // Intercept Google Maps authentication failure to prevent default browser alert modal:
  // "This page can't load Google Maps correctly. Do you own this website?"
  window.gm_authFailure = () => {
    console.warn("[RentalCircle] Google Maps authentication failed. API key is missing, invalid, or billing is not enabled.");
    authFailed = true;
    loadPromise = null;
    window.dispatchEvent(new CustomEvent("google-maps-auth-failed"));
  };

  const apiKey = forceKey || getGoogleMapsApiKey();

  // If no API key is configured, reject early so UI renders the key config prompt + interactive map
  if (!apiKey) {
    return Promise.reject(new Error("MISSING_API_KEY"));
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById("google-maps-sdk");
    if (existingScript) {
      if (window.google?.maps && !authFailed) {
        resolve();
        return;
      }
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.id = "google-maps-sdk";
    script.type = "text/javascript";
    script.async = true;
    script.defer = true;

    window.initGoogleMaps = () => {
      authFailed = false;
      resolve();
    };

    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry&callback=initGoogleMaps`;

    script.onerror = (err) => {
      loadPromise = null;
      console.error("[RentalCircle] Failed to load Google Maps SDK script:", err);
      reject(err);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

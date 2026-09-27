let loadPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cannot load Google Maps on server"));
  }

  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    // Check if script already exists in document
    const existingScript = document.getElementById("google-maps-sdk");
    if (existingScript) {
      if (window.google?.maps) {
        resolve();
        return;
      }
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", (e) => reject(e));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-sdk";
    script.type = "text/javascript";
    script.async = true;
    script.defer = true;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    const keyParam = apiKey ? `key=${apiKey}&` : "";

    window.initGoogleMaps = () => {
      resolve();
    };

    script.src = `https://maps.googleapis.com/maps/api/js?${keyParam}libraries=places,geometry&callback=initGoogleMaps`;

    script.onerror = (err) => {
      loadPromise = null;
      reject(err);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

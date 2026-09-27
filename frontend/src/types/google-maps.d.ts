declare global {
  interface Window {
    google?: any;
    initGoogleMaps?: () => void;
  }
}

export {};

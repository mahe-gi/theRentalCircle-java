declare global {
  interface Window {
    google?: any;
    initGoogleMaps?: () => void;
    gm_authFailure?: () => void;
  }
}

export {};

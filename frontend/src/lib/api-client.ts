import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// Base API URL defaulting to /api/v1 (proxied or direct)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enables sending and receiving HttpOnly refresh cookies
});

// In-memory access token storage initialized from localStorage if available
let inMemoryAccessToken: string | null = null;
if (typeof window !== "undefined") {
  try {
    inMemoryAccessToken = localStorage.getItem("rc_access_token");
  } catch {
    // Ignore storage errors in private browsing modes
  }
}

export const setAccessToken = (token: string | null): void => {
  inMemoryAccessToken = token;
  if (typeof window !== "undefined") {
    try {
      if (token) {
        localStorage.setItem("rc_access_token", token);
      } else {
        localStorage.removeItem("rc_access_token");
      }
    } catch {
      // Ignore storage errors
    }
  }
};

export const getAccessToken = (): string | null => {
  return inMemoryAccessToken;
};

// Callback to invoke when authentication fails completely (refresh rejected)
type AuthFailureHandler = () => void;
let onAuthFailureCallback: AuthFailureHandler | null = null;

export const setOnAuthFailure = (callback: AuthFailureHandler | null): void => {
  onAuthFailureCallback = callback;
};

// Separate unintercepted axios client for refresh calls to avoid cyclical recursion
export const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Deduplicated refresh promise to prevent concurrent calls (React StrictMode, multiple components, 401 queue)
export interface RefreshPayload {
  accessToken: string;
  user: any;
  expiresIn?: number;
}

let refreshPromise: Promise<RefreshPayload> | null = null;

export const refreshSession = async (): Promise<RefreshPayload> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await refreshClient.post("/auth/refresh");
      const payload = response.data?.data || response.data;
      const newAccessToken = payload?.accessToken;

      if (!newAccessToken) {
        throw new Error("Missing access token in refresh response");
      }

      setAccessToken(newAccessToken);
      processQueue(null, newAccessToken);
      return payload;
    } catch (refreshError) {
      processQueue(refreshError, null);
      setAccessToken(null);
      if (onAuthFailureCallback) {
        onAuthFailureCallback();
      }
      throw refreshError;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Request interceptor: normalizes URL path and attaches Authorization: Bearer <accessToken> if present
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Normalize URL to prevent accidental /api/v1/api/v1 prefix duplication
    if (config.url?.startsWith("/api/v1/")) {
      config.url = config.url.replace(/^\/api\/v1/, "");
    } else if (config.url?.startsWith("api/v1/")) {
      config.url = config.url.replace(/^api\/v1/, "");
    }

    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor: on 401, attempts deduplicated call to POST /api/v1/auth/refresh
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Do not intercept 401s from the refresh, login, or public search routes
    const isAuthRoute =
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/login");

    const isPublicSearchRoute =
      originalRequest.url?.includes("/properties/search");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute && !isPublicSearchRoute) {
      if (refreshPromise) {
        // Refresh already in progress; queue this request
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;

      try {
        const payload = await refreshSession();
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${payload.accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

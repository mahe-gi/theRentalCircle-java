"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  apiClient,
  refreshClient,
  setAccessToken,
  setOnAuthFailure,
} from "./api-client";

export interface User {
  id: number;
  email: string;
  mobile?: string;
  firstName: string;
  lastName: string;
  userType: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  isMobileVerified?: boolean;
  roles?: string[];
  createdAt?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  mobile?: string;
  userType?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithToken: (accessToken: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  // Silent refresh to exchange HttpOnly refresh cookie for access token + user info
  const refreshAuth = useCallback(async (): Promise<User | null> => {
    try {
      const response = await refreshClient.post("/auth/refresh");
      const payload = response.data?.data || response.data;
      if (payload?.accessToken && payload?.user) {
        setAccessToken(payload.accessToken);
        setUser(payload.user);
        return payload.user;
      }
      clearAuth();
      return null;
    } catch {
      clearAuth();
      return null;
    }
  }, [clearAuth]);

  // Handle on-mount authentication initialization
  useEffect(() => {
    let isMounted = true;

    // Register callback for when api-client encounters 401 refresh rejection
    setOnAuthFailure(() => {
      if (isMounted) {
        clearAuth();
      }
    });

    const initAuth = async () => {
      try {
        await refreshAuth();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      setOnAuthFailure(null);
    };
  }, [clearAuth, refreshAuth]);

  const login = async (email: string, password: string): Promise<User> => {
    const response = await apiClient.post("/auth/login", {
      email,
      password,
    });

    const payload = response.data?.data || response.data;
    if (!payload?.accessToken || !payload?.user) {
      throw new Error("Invalid response received from login endpoint");
    }

    setAccessToken(payload.accessToken);
    setUser(payload.user);
    return payload.user;
  };

  // Used by OAuth2 callback — token already obtained, just fetch user profile
  const loginWithToken = async (accessToken: string): Promise<User> => {
    setAccessToken(accessToken);
    const response = await apiClient.get("/auth/me");
    const profile = response.data?.data || response.data;
    setUser(profile);
    return profile;
  };

  const register = async (data: RegisterData): Promise<User> => {
    const response = await apiClient.post("/auth/register", data);
    const registeredUser = response.data?.data || response.data;
    return registeredUser;
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Even if network error occurs, guarantee client-side cleanup
    } finally {
      clearAuth();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithToken,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

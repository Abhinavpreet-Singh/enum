"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { proxy } from "@/app/proxy";
import {
  setMemoryToken,
  clearMemoryToken,
  purgePersistedAccessToken,
} from "@/lib/tokenStore";
import { mapBackendAccountType, type AccountType } from "@/lib/account-session";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  role?: string;
  [key: string]: unknown;
}

export interface AuthState {
  user: AuthUser | null;
  accountType: AccountType;
  accessToken: string | null;
  loading: boolean;
  authenticated: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: { email?: string; username?: string; password: string }) => Promise<{
    user: AuthUser | null;
    accountType: AccountType;
    accessToken: string;
  }>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refresh: () => Promise<string | null>;
  setAccessToken: (token: string | null) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside <AuthProvider>");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accountType: "student",
    accessToken: null,
    loading: true,
    authenticated: false,
  });

  const refreshingRef = useRef(false);
  const mountedRef = useRef(false);

  const setAccessToken = useCallback((token: string | null) => {
    setMemoryToken(token);
    setState((prev) => ({
      ...prev,
      accessToken: token,
      loading: false,
      authenticated: Boolean(token),
    }));
  }, []);

  // ── Initialize: call /me with the refresh cookie ──────────────────────────

  const initialize = useCallback(async () => {
    try {
      const res = await axios.get(`${proxy}/api/v1/auth/me`, {
        withCredentials: true,
      });
      if (!mountedRef.current) return;
      const { data, accessToken, accountType } = res.data;
      if (accessToken) {
        setMemoryToken(accessToken);
      }
      setState({
        user: data ?? null,
        accountType: mapBackendAccountType(accountType, data?.role),
        accessToken: accessToken ?? null,
        loading: false,
        authenticated: !!accessToken,
      });
    } catch {
      if (!mountedRef.current) return;
      clearMemoryToken();
      setState({
        user: null,
        accountType: "student",
        accessToken: null,
        loading: false,
        authenticated: false,
      });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    purgePersistedAccessToken();
    initialize();
    return () => {
      mountedRef.current = false;
    };
  }, [initialize]);

  // ── Login ─────────────────────────────────────────────────────────────────

  const login = useCallback(
    async (credentials: { email?: string; username?: string; password: string }) => {
      const res = await axios.post(`${proxy}/api/v1/auth/login`, credentials, {
        withCredentials: true,
      });
      const { data, accessToken, accountType } = res.data;
      if (!accessToken) throw new Error("No access token returned from login.");
      const resolvedAccountType = mapBackendAccountType(accountType, data?.role);
      setMemoryToken(accessToken);
      setState({
        user: data ?? null,
        accountType: resolvedAccountType,
        accessToken,
        loading: false,
        authenticated: true,
      });
      return {
        user: data ?? null,
        accountType: resolvedAccountType,
        accessToken,
      };
    },
    [],
  );

  // ── Refresh ───────────────────────────────────────────────────────────────

  const refresh = useCallback(async (): Promise<string | null> => {
    if (refreshingRef.current) return null;
    refreshingRef.current = true;
    try {
      const res = await axios.post(
        `${proxy}/api/v1/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const { accessToken, accountType } = res.data;
      if (accessToken) {
        setMemoryToken(accessToken);
        setState((prev) => ({
          ...prev,
          accessToken,
          accountType: mapBackendAccountType(accountType, prev.user?.role as string),
          authenticated: true,
        }));
        return accessToken;
      }
      return null;
    } catch {
      clearMemoryToken();
      setState({
        user: null,
        accountType: "student",
        accessToken: null,
        loading: false,
        authenticated: false,
      });
      return null;
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    try {
      await axios.post(`${proxy}/api/v1/auth/logout`, {}, { withCredentials: true });
    } catch { /* Ignore errors — clean up locally regardless */ }
    clearMemoryToken();
    setState({
      user: null,
      accountType: "student",
      accessToken: null,
      loading: false,
      authenticated: false,
    });
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      const token = state.accessToken;
      await axios.post(
        `${proxy}/api/v1/auth/logout-all`,
        {},
        {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
    } catch { /* Ignore errors — clean up locally regardless */ }
    clearMemoryToken();
    setState({
      user: null,
      accountType: "student",
      accessToken: null,
      loading: false,
      authenticated: false,
    });
  }, [state.accessToken]);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    logoutAll,
    refresh,
    setAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

"use client";

/**
 * Fetches public platform settings from /api/v1/platform/settings.
 * Returns a stable record of key→value strings.
 * Cached in module-level memory for the lifetime of the tab (settings rarely change;
 * admin can hard-refresh if needed).
 */
import { useState, useEffect } from "react";
import { proxy } from "@/app/proxy";

type Settings = Record<string, string>;

const DEFAULT_SETTINGS: Settings = {
  signup_enabled: "true",
  org_self_register: "true",
  leaderboard_public: "true",
  collab_enabled: "true",
  incidents_enabled: "true",
  dsa_arena_enabled: "true",
  simulations_enabled: "true",
  max_attempts_per_assessment: "5",
  max_test_duration_minutes: "180",
  platform_name: "Enum",
  support_email: "support@enum.live",
};

let cachedSettings: Settings | null = null;
let cacheTs = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

export function usePlatformSettings() {
  const [settings, setSettings] = useState<Settings>(cachedSettings ?? DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(!cachedSettings);

  useEffect(() => {
    const now = Date.now();
    if (cachedSettings && now - cacheTs < CACHE_TTL_MS) {
      setSettings(cachedSettings);
      setLoading(false);
      return;
    }
    fetch(`${proxy}/api/v1/platform/settings`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        const data: Settings = { ...DEFAULT_SETTINGS, ...(json.data ?? {}) };
        cachedSettings = data;
        cacheTs = Date.now();
        setSettings(data);
      })
      .catch(() => {
        // Fail-open: use defaults
        setSettings(DEFAULT_SETTINGS);
      })
      .finally(() => setLoading(false));
  }, []);

  /** Returns true when the boolean setting is enabled (default: true) */
  const isEnabled = (key: string): boolean => {
    return settings[key] !== "false";
  };

  /** Returns the numeric value or a fallback */
  const getNumber = (key: string, fallback: number): number => {
    const n = parseInt(settings[key], 10);
    return isNaN(n) ? fallback : n;
  };

  return { settings, loading, isEnabled, getNumber };
}

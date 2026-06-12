/**
 * Feature-gate middleware factory.
 * Usage: router.post("/register", featureGate("signup_enabled"), handler)
 *
 * Reads the PlatformSetting from DB each call (lightweight — cached by Node HTTP
 * keep-alive; can add Redis later).  Falls back to enabled=true if setting is
 * absent so a fresh install works out of the box.
 */
import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { env } from "../config/env.js";

const DISABLED_MESSAGES = {
  signup_enabled: "New student registrations are currently disabled by the platform admin.",
  org_self_register: "Organization self-registration is currently disabled. Please contact the platform admin.",
  leaderboard_public: "The leaderboard is currently set to private by the platform admin.",
  collab_enabled: "Collaboration rooms are currently disabled by the platform admin.",
  incidents_enabled: "Incident simulations are currently disabled by the platform admin.",
  dsa_arena_enabled: "The DSA Arena is currently disabled by the platform admin.",
  simulations_enabled: "Production simulations are currently disabled by the platform admin.",
};

export async function isSettingEnabled(key) {
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key } });
    if (!row) return true; // default: enabled
    return row.value !== "false";
  } catch {
    return true; // fail-open: if DB unreachable, don't block
  }
}

/**
 * Middleware that blocks the request if a feature flag is disabled.
 * @param {string} settingKey - key in PlatformSetting table
 */
export function featureGate(settingKey) {
  return async (req, res, next) => {
    const enabled = await isSettingEnabled(settingKey);
    if (!enabled) {
      const message = DISABLED_MESSAGES[settingKey] || "This feature is currently disabled.";
      throw new ApiError(403, message);
    }
    next();
  };
}

/**
 * Blocks OAuth routes when student signups are disabled.
 * Redirects the browser to the login page instead of returning JSON.
 */
export async function oauthSignupGate(req, res, next) {
  const enabled = await isSettingEnabled("signup_enabled");
  if (!enabled) {
    const frontend = env.FRONTEND_URL || env.FRONTEND_URL_FALLBACK || "http://localhost:3000";
    const url = new URL("/login", frontend);
    url.searchParams.set("error", "signup_disabled");
    return res.redirect(url.toString());
  }
  next();
}

/**
 * Expose all settings publicly so the frontend can gate pages client-side too.
 * No auth required — values are non-sensitive (booleans + strings).
 */
export const getPublicSettings = async (_req, res) => {
  const DEFAULT_SETTINGS = [
    { key: "signup_enabled", value: "true" },
    { key: "org_self_register", value: "true" },
    { key: "leaderboard_public", value: "true" },
    { key: "collab_enabled", value: "true" },
    { key: "incidents_enabled", value: "true" },
    { key: "dsa_arena_enabled", value: "true" },
    { key: "simulations_enabled", value: "true" },
    { key: "max_attempts_per_assessment", value: "5" },
    { key: "max_test_duration_minutes", value: "180" },
    { key: "platform_name", value: "Enum" },
    { key: "support_email", value: "support@enum.live" },
  ];

  try {
    const stored = await prisma.platformSetting.findMany();
    const storedMap = Object.fromEntries(stored.map((s) => [s.key, s.value]));
    const merged = Object.fromEntries(
      DEFAULT_SETTINGS.map(({ key, value }) => [key, storedMap[key] ?? value])
    );
    return res.status(200).json({ message: "Settings fetched.", data: merged });
  } catch {
    // Return defaults on DB error
    const merged = Object.fromEntries(DEFAULT_SETTINGS.map(({ key, value }) => [key, value]));
    return res.status(200).json({ message: "Settings fetched.", data: merged });
  }
};

/**
 * Get active announcements for a given audience.
 * audience: "all" | "students" | "organizations"
 */
export const getPublicAnnouncements = async (req, res) => {
  const { audience = "all" } = req.query;
  try {
    const announcements = await prisma.announcement.findMany({
      where: {
        active: true,
        OR: [{ audience: "all" }, { audience: audience }],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, body: true, type: true, audience: true, createdAt: true },
    });
    return res.status(200).json({ message: "Announcements fetched.", data: announcements });
  } catch {
    return res.status(200).json({ message: "Announcements fetched.", data: [] });
  }
};

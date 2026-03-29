"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { proxy } from "@/app/proxy.js";

const normalizeToken = (value: string | null) => {
  if (!value) return "";

  let token = value.trim();

  try {
    token = decodeURIComponent(token);
  } catch {
    // Keep original when value is already decoded.
  }

  token = token.replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "").trim();
  return token;
};

const findTokenFromUrl = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  const candidates = [
    searchParams.get("token"),
    searchParams.get("accessToken"),
    searchParams.get("access_token"),
    searchParams.get("jwt"),
    hashParams.get("token"),
    hashParams.get("accessToken"),
    hashParams.get("access_token"),
    hashParams.get("jwt"),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeToken(candidate);
    if (normalized) return normalized;
  }

  // Fallback for uncommon callback formats where token is embedded in the full URL.
  const rawHref = window.location.href;
  const match = rawHref.match(/(?:token|access[_-]?token|jwt)=([^&#]+)/i);
  if (match?.[1]) {
    return normalizeToken(match[1]);
  }

  return "";
};

export default function OAuthSuccessPage() {
  const router = useRouter();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const exchangeCodeForToken = async () => {
      const search = window.location.search;
      const params = new URLSearchParams(search);

      if (!params.get("code")) return "";

      const callbacks = [
        `${proxy}/auth/google/callback${search}`,
        `${proxy}/auth/github/callback${search}`,
      ];

      for (const callbackUrl of callbacks) {
        try {
          const response = await axios.get(callbackUrl, {
            withCredentials: true,
          });

          const resolved = normalizeToken(
            response?.data?.token ||
              response?.data?.accessToken ||
              response?.data?.data?.token ||
              null
          );

          if (resolved) return resolved;
        } catch {
          // Try next provider callback endpoint.
        }
      }

      return "";
    };

    const run = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      let token = findTokenFromUrl();

      const oauthError =
        searchParams.get("error") ||
        hashParams.get("error") ||
        searchParams.get("message") ||
        hashParams.get("message");

      if (oauthError) {
        setError(decodeURIComponent(oauthError));
        router.replace("/login");
        return;
      }

      try {
        if (!token) {
          token = await exchangeCodeForToken();
        }

        if (token) {
          localStorage.setItem("accessToken", token);
        }

        // Hydrate basic user info so dashboard/sidebar doesn't show Guest.
        try {
          const headers = token
            ? { Authorization: `Bearer ${token}` }
            : undefined;

          const profileRes = await axios.get(`${proxy}/api/v1/users/profile`, {
            headers,
            withCredentials: true,
          });

          const user = profileRes?.data?.data;
          if (user) {
            const responseToken = normalizeToken(
              profileRes?.data?.accessToken || profileRes?.data?.token || null
            );

            if (!token && responseToken) {
              localStorage.setItem("accessToken", responseToken);
            }

            if (user.username) localStorage.setItem("Name", user.username);
            if (user.id || user._id) localStorage.setItem("id", user.id ?? user._id);
            if (user.displayName) localStorage.setItem("displayName", user.displayName);
            if (user.avatar) localStorage.setItem("userAvatar", user.avatar);
            router.replace("/dashboard");
            return;
          }
        } catch {
          // Fallback below handles missing profile/token state.
        }

        const storedToken = normalizeToken(localStorage.getItem("accessToken"));
        if (storedToken) {
          router.replace("/dashboard");
          return;
        }

        setError("Missing token from OAuth callback.");
        router.replace("/login");
      } catch {
        setError("OAuth login failed. Please try again.");
        localStorage.removeItem("accessToken");
        router.replace("/login");
      }
    };

    run();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black px-4">
      <div className="w-full max-w-sm border border-gray-300 dark:border-white bg-white dark:bg-neutral-950 p-6">
        <div className="flex items-center gap-3">
          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-black dark:border-white border-r-transparent" />
          <p className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
            COMPLETING SIGN IN…
          </p>
        </div>

        {error ? (
          <p className="mt-3 font-mono text-xs text-red-700 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

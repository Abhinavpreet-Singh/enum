"use client";

import { apiUrl } from "@/lib/api-config";
import { useContext, useEffect, useRef, useState } from "react";
import { setMemoryToken } from "@/lib/tokenStore";
import { AuthContext } from "@/providers/AuthProvider";

function loginUrl(errorCode?: string) {
  if (!errorCode) return "/login/";
  return `/login/?error=${encodeURIComponent(errorCode)}`;
}

export default function OAuthSuccessPage() {
  const authCtx = useContext(AuthContext);
  const setAccessTokenRef = useRef(authCtx?.setAccessToken);
  setAccessTokenRef.current = authCtx?.setAccessToken;

  const [error, setError] = useState<string>("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const returnTo = searchParams.get("returnTo") || "/dashboard";

      const oauthError =
        searchParams.get("error") ||
        searchParams.get("message");

      if (oauthError) {
        setError(decodeURIComponent(oauthError));
        window.location.replace(loginUrl());
        return;
      }

      try {
        // Use fetch (not the shared axios client) so a missing refresh cookie
        // cannot deadlock in the 401→refresh interceptor loop.
        const res = await fetch(apiUrl("/api/v1/auth/me"), {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("OAuth session not established.");
        }

        const body = await res.json();
        const { data, accessToken, accountType } = body;

        if (accessToken) {
          setMemoryToken(accessToken);
          setAccessTokenRef.current?.(accessToken);
        }

        if (data?.avatar) localStorage.setItem("userAvatar", data.avatar);

        const destination =
          accountType === "admin"
            ? "/dashboard/admin/overview"
            : returnTo.startsWith("/dashboard/admin")
              ? "/dashboard"
              : returnTo;

        // Full page navigation so AuthProvider re-initializes with the session cookie.
        window.location.replace(destination);
      } catch {
        setError("OAuth login failed. Please try again.");
        window.location.replace(loginUrl("oauth_failed"));
      }
    };

    run();
  }, []);

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

"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { proxy } from "@/app/proxy.js";
import { setMemoryToken } from "@/lib/tokenStore";
import { AuthContext } from "@/providers/AuthProvider";

export default function OAuthSuccessPage() {
  const router = useRouter();
  const authCtx = useContext(AuthContext);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const returnTo = searchParams.get("returnTo") || "/dashboard";

      const oauthError =
        searchParams.get("error") ||
        searchParams.get("message");

      if (oauthError) {
        setError(decodeURIComponent(oauthError));
        router.replace("/login");
        return;
      }

      try {
        // The backend set an HttpOnly refresh cookie on the OAuth callback redirect.
        // Call /me to get the access token and user object.
        const res = await axios.get(`${proxy}/api/v1/auth/me`, {
          withCredentials: true,
        });

        const { data, accessToken, accountType } = res.data;

        if (accessToken) {
          setMemoryToken(accessToken);
          if (authCtx) {
            authCtx.setAccessToken(accessToken);
          }
        }

        // Access token stays in memory; identity comes from backend/AuthProvider.
        if (data?.avatar) localStorage.setItem("userAvatar", data.avatar);

        const destination =
          accountType === "admin"
            ? "/dashboard/admin/overview"
            : returnTo.startsWith("/dashboard/admin")
              ? "/dashboard"
              : returnTo;

        router.replace(destination);
      } catch {
        setError("OAuth login failed. Please try again.");
        router.replace("/login");
      }
    };

    run();
  }, [router, authCtx]);

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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { proxy } from "@/app/proxy.js";

export default function OAuthSuccessPage() {
  const router = useRouter();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      const token = new URLSearchParams(window.location.search).get("token");

      if (!token) {
        setError("Missing token from OAuth callback.");
        router.replace("/login");
        return;
      }

      try {
        localStorage.setItem("accessToken", token);

        // Hydrate basic user info so dashboard/sidebar doesn't show Guest.
        try {
          const profileRes = await axios.get(`${proxy}/api/v1/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          });

          const user = profileRes?.data?.data;
          if (user) {
            if (user.username) localStorage.setItem("Name", user.username);
            if (user.id || user._id) localStorage.setItem("id", user.id ?? user._id);
            if (user.displayName) localStorage.setItem("displayName", user.displayName);
            if (user.avatar) localStorage.setItem("userAvatar", user.avatar);
          }
        } catch {
          // If profile fetch fails, token is still stored; dashboard can lazily load user.
        }

        router.replace("/dashboard");
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

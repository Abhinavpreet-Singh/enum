"use client";

import { apiUrl } from "@/lib/api-config";
import { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMemoryToken,
  setMemoryToken,
  persistOAuthHandoff,
} from "@/lib/tokenStore";
import { AuthContext } from "@/providers/AuthProvider";
import { mapBackendAccountType } from "@/lib/account-session";
import type { AuthUser } from "@/providers/AuthProvider";

function loginUrl(errorCode?: string) {
  if (!errorCode) return "/login/";
  return `/login/?error=${encodeURIComponent(errorCode)}`;
}

function readAccessTokenFromHash(): string | null {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const token = params.get("accessToken");
  if (!token) return null;

  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
  return token;
}

type OAuthSession = {
  data: AuthUser | null;
  accessToken: string;
  accountType: string;
};

async function establishOAuthSession(
  preferredAccessToken?: string | null,
): Promise<OAuthSession> {
  const token = preferredAccessToken || getMemoryToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const meRes = await fetch(apiUrl("/api/v1/auth/me"), {
    credentials: "include",
    headers,
  });

  if (meRes.ok) {
    const body = await meRes.json();
    return {
      data: (body.data as AuthUser | null) ?? null,
      accessToken: body.accessToken || token || "",
      accountType: body.accountType || "student",
    };
  }

  if (!token) {
    throw new Error("OAuth session not established.");
  }

  const sessionRes = await fetch(apiUrl("/api/v1/auth/session"), {
    credentials: "include",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!sessionRes.ok) {
    throw new Error("OAuth session not established.");
  }

  const json = await sessionRes.json();
  const sessionData = json.data;
  const user =
    (sessionData?.user as AuthUser | undefined) ??
    (sessionData?.organization as AuthUser | undefined) ??
    (sessionData?.admin as AuthUser | undefined) ??
    null;

  return {
    data: user,
    accessToken: token,
    accountType: sessionData?.accountType || "student",
  };
}

export default function OAuthSuccessPage() {
  const router = useRouter();
  const authCtx = useContext(AuthContext);
  const establishSessionRef = useRef(authCtx?.establishSession);
  establishSessionRef.current = authCtx?.establishSession;

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
        router.replace(loginUrl());
        return;
      }

      try {
        const hashToken = readAccessTokenFromHash();
        if (hashToken) {
          setMemoryToken(hashToken);
        }

        const { data, accessToken, accountType } = await establishOAuthSession(
          hashToken,
        );

        if (!accessToken) {
          throw new Error("OAuth session not established.");
        }

        persistOAuthHandoff(accessToken);
        establishSessionRef.current?.({
          user: data,
          accessToken,
          accountType,
        });

        const resolvedAccountType = mapBackendAccountType(
          accountType,
          data?.role,
        );

        if (data?.avatar) {
          localStorage.setItem("userAvatar", String(data.avatar));
        }

        const destination =
          resolvedAccountType === "admin"
            ? "/dashboard/admin/overview/"
            : returnTo.startsWith("/dashboard/admin")
              ? "/dashboard/"
              : returnTo.endsWith("/")
                ? returnTo
                : `${returnTo}/`;

        router.replace(destination);
      } catch {
        setError("OAuth login failed. Please try again.");
        router.replace(loginUrl("oauth_failed"));
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

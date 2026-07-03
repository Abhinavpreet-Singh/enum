"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import useAccountType from "@/hooks/useAccountType";

const ADMIN_HOME = "/dashboard/admin/overview/";
const ADMIN_SETTINGS = "/dashboard/admin/settings/";
const ADMIN_BASE = "/dashboard/admin";

const SHARED_NON_ADMIN_PREFIXES = ["/dashboard/settings", "/dashboard/profile"];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAdminAllowedPath(pathname: string | null) {
  if (!pathname) return true;
  return pathname === ADMIN_BASE || pathname.startsWith(`${ADMIN_BASE}/`);
}

function isSharedNonAdminPath(pathname: string | null) {
  if (!pathname) return false;
  return matchesPrefix(pathname, SHARED_NON_ADMIN_PREFIXES);
}

export default function AdminDashboardGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const accountType = useAccountType();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (accountType !== "admin") return;
    if (
      pathname === "/dashboard" ||
      pathname === "/dashboard/admin" ||
      pathname === "/dashboard/admin/"
    ) {
      router.replace(ADMIN_HOME);
      return;
    }
    if (isSharedNonAdminPath(pathname)) {
      if (pathname?.startsWith("/dashboard/settings")) {
        router.replace(ADMIN_SETTINGS);
      }
      return;
    }
    if (pathname?.startsWith("/dashboard/") && !isAdminAllowedPath(pathname)) {
      router.replace(ADMIN_HOME);
    }
  }, [accountType, pathname, router]);

  if (
    accountType === "admin" &&
    pathname &&
    !isAdminAllowedPath(pathname) &&
    !isSharedNonAdminPath(pathname)
  ) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="font-mono text-xs tracking-wider text-gray-400">
          Redirecting to admin dashboard…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

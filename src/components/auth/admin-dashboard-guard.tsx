"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import useAccountType from "@/hooks/useAccountType";

const ADMIN_HOME = "/dashboard/admin";

function isAdminAllowedPath(pathname: string | null) {
  if (!pathname) return true;
  return pathname === ADMIN_HOME || pathname.startsWith(`${ADMIN_HOME}/`);
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
    if (pathname === "/dashboard") {
      router.replace(ADMIN_HOME);
      return;
    }
    if (pathname?.startsWith("/dashboard/") && !isAdminAllowedPath(pathname)) {
      router.replace(ADMIN_HOME);
    }
  }, [accountType, pathname, router]);

  if (accountType === "admin" && pathname && !isAdminAllowedPath(pathname)) {
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

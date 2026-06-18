"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { Construction } from "lucide-react";
import { useAccountSession } from "@/hooks/useAccountType";

interface MaintenanceEntry {
  path: string;
  message: string;
}

function normalizePath(pathname: string) {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

const productionHosts = (() => {
  try {
    const hostname = new URL(
      process.env.NEXT_PUBLIC_APP_URL || "https://enum.live",
    ).hostname;
    return hostname.startsWith("www.")
      ? [hostname]
      : [hostname, `www.${hostname}`];
  } catch {
    return ["enum.live", "www.enum.live"];
  }
})();

/** Maintenance blocks only apply on the live production site, not local dev. */
function isProductionSite() {
  if (typeof window === "undefined") return false;
  return productionHosts.includes(window.location.hostname);
}

function MaintenanceScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
      <div className="w-full max-w-lg border border-black/20 bg-white/90 p-8 text-center dark:border-white/25 dark:bg-black/80">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20">
          <Construction className="h-7 w-7 text-amber-600 dark:text-amber-400" />
        </div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-amber-600 dark:text-amber-400">
          Under Maintenance
        </p>
        <h1 className="mb-3 font-mono text-lg font-bold text-black dark:text-white">
          Page temporarily unavailable
        </h1>
        <p className="font-mono text-xs leading-relaxed text-gray-600 dark:text-gray-400">
          {message}
        </p>
      </div>
    </div>
  );
}

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { accountType, verified, isLoading } = useAccountSession();
  const [pages, setPages] = useState<MaintenanceEntry[] | null>(null);
  const [match, setMatch] = useState<MaintenanceEntry | null>(null);

  useEffect(() => {
    if (!isProductionSite()) return;

    let cancelled = false;

    const load = async () => {
      try {
        const res = await axios.get(`${proxy}/api/v1/maintenance/pages`);
        if (!cancelled) {
          setPages(res.data?.data?.pages ?? []);
        }
      } catch {
        if (!cancelled) setPages([]);
      }
    };

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!isProductionSite() || !pages || !pathname) {
      setMatch(null);
      return;
    }

    if (isLoading || !verified || accountType === "admin") {
      setMatch(null);
      return;
    }

    const current = normalizePath(pathname);
    const hit = pages.find((p) => normalizePath(p.path) === current) ?? null;
    setMatch(hit);
  }, [accountType, isLoading, pages, pathname, verified]);

  if (isProductionSite() && match) {
    return <MaintenanceScreen message={match.message} />;
  }

  return <>{children}</>;
}

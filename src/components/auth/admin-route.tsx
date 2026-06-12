"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAccountSession } from "@/lib/account-session";

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchAccountSession()
      .then((session) => {
        if (cancelled) return;
        if (session.accountType === "admin") {
          setIsAuthorized(true);
        } else {
          router.push("/login?returnTo=/dashboard/admin/overview");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="font-mono text-sm tracking-wider">VERIFYING ACCESS...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="font-mono text-sm tracking-wider text-red-600 dark:text-red-400">
            UNAUTHORIZED ACCESS
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

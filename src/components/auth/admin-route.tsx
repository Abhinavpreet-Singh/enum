"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in as admin
    const accountType = localStorage.getItem("accountType");
    
    if (accountType === "admin") {
      setIsAuthorized(true);
    } else {
      // Redirect to login if not admin
      router.push("/login?returnTo=/dashboard/admin");
    }
    setLoading(false);
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

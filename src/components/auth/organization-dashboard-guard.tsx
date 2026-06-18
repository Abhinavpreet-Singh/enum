"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccountSession } from "@/hooks/useAccountType";

const ORG_PREFIXES = [
  "/dashboard/tests",
  "/dashboard/question-banks",
  "/dashboard/candidates",
  "/dashboard/analytics",
  "/dashboard/certificates",
  "/dashboard/settings",
];

const STUDENT_PREFIXES = [
  "/dashboard/simulations",
  "/dashboard/incidents",
  "/dashboard/dsa-arena",
  "/dashboard/leaderboard",
  "/dashboard/collab",
  "/dashboard/activity",
  "/dashboard/tracks",
  "/dashboard/linux-arena",
];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isOrgPath(pathname: string | null) {
  if (!pathname) return false;
  return matchesPrefix(pathname, ORG_PREFIXES);
}

function isStudentPath(pathname: string | null) {
  if (!pathname) return false;
  return matchesPrefix(pathname, STUDENT_PREFIXES);
}

export default function OrganizationDashboardGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { accountType, verified, isLoading } = useAccountSession();
  const pathname = usePathname();
  const router = useRouter();

  const blocked =
    verified &&
    ((accountType === "organization" && isStudentPath(pathname)) ||
      (accountType === "student" && isOrgPath(pathname)));

  useEffect(() => {
    if (isLoading || !verified) return;
    if (accountType === "admin") return;
    if (accountType === "organization" && isStudentPath(pathname)) {
      router.replace("/dashboard");
    }
    if (accountType === "student" && isOrgPath(pathname)) {
      router.replace("/dashboard");
    }
  }, [accountType, verified, isLoading, pathname, router]);

  if (isLoading || !verified) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="font-mono text-xs tracking-wider text-gray-400">
          Verifying access…
        </p>
      </div>
    );
  }

  if (accountType !== "admin" && blocked) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="font-mono text-xs tracking-wider text-gray-400">
          Redirecting…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

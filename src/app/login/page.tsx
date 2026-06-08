"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AuthForm from "@/components/auth/auth-form";
import PublicRoute from "@/components/auth/public-route";

function LoginContent() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? undefined;

  return (
    <PublicRoute returnTo={returnTo}>
      <AuthForm initialReturnTo={returnTo} />
    </PublicRoute>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}


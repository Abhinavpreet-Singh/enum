"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PasswordResetForm from "@/components/auth/password-reset-form";
import PublicRoute from "@/components/auth/public-route";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || undefined;

  return (
    <PublicRoute>
      <PasswordResetForm mode="confirm" token={token} />
    </PublicRoute>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}

import PasswordResetForm from "@/components/auth/password-reset-form";
import PublicRoute from "@/components/auth/public-route";

export default function ForgotPasswordPage() {
  return (
    <PublicRoute>
      <PasswordResetForm mode="request" />
    </PublicRoute>
  );
}

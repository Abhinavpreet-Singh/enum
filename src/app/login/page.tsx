import AuthForm from "@/components/auth/auth-form";
import PublicRoute from "@/components/auth/public-route";

export default function LoginPage() {
  return (
    <PublicRoute>
      <AuthForm />
    </PublicRoute>
  );
}

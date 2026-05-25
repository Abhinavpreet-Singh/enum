import AuthForm from "@/components/auth/auth-form";
import PublicRoute from "@/components/auth/public-route";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { returnTo?: string };
}) {
  const returnTo = searchParams?.returnTo;

  return (
    <PublicRoute>
      <AuthForm initialReturnTo={returnTo} />
    </PublicRoute>
  );
}

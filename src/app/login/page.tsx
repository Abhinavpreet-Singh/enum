import AuthForm from "@/components/auth/auth-form";
import PublicRoute from "@/components/auth/public-route";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const returnTo = resolvedSearchParams?.returnTo;

  return (
    <PublicRoute returnTo={returnTo}>
      <AuthForm initialReturnTo={returnTo} />
    </PublicRoute>
  );
}

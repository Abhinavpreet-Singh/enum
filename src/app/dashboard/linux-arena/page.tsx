import { redirect } from "next/navigation";

interface DashboardLinuxArenaPageProps {
  searchParams?: Promise<{
    id?: string;
  }>;
}

export default async function Page({
  searchParams,
}: DashboardLinuxArenaPageProps) {
  const resolvedSearchParams = await searchParams;

  redirect(
    resolvedSearchParams?.id
      ? `/dashboard/simulations/linux?id=${encodeURIComponent(resolvedSearchParams.id)}`
      : "/dashboard/simulations/linux",
  );
}

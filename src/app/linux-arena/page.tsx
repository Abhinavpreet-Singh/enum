import { redirect } from "next/navigation";

interface LinuxArenaRouteProps {
  searchParams?: Promise<{
    id?: string;
  }>;
}

export default async function Page({ searchParams }: LinuxArenaRouteProps) {
  const resolvedSearchParams = await searchParams;
  redirect(
    resolvedSearchParams?.id
      ? `/dashboard/simulations/linux?id=${encodeURIComponent(resolvedSearchParams.id)}`
      : "/dashboard/simulations/linux",
  );
}

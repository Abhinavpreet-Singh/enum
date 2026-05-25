import LinuxArenaPage from "@/components/linux/LinuxArenaPage";

interface LinuxSimulationRouteProps {
  searchParams?: Promise<{
    id?: string;
  }>;
}

export default async function Page({
  searchParams,
}: LinuxSimulationRouteProps) {
  const resolvedSearchParams = await searchParams;
  return <LinuxArenaPage initialQuestionId={resolvedSearchParams?.id} />;
}

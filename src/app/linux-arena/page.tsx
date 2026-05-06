import LinuxArenaPage from "@/components/linux/LinuxArenaPage";

interface LinuxArenaRouteProps {
  searchParams?: Promise<{
    id?: string;
  }>;
}

export default async function Page({ searchParams }: LinuxArenaRouteProps) {
  const resolvedSearchParams = await searchParams;
  return <LinuxArenaPage initialQuestionId={resolvedSearchParams?.id} />;
}
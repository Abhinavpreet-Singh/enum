import LinuxArenaPage from "@/components/linux/LinuxArenaPage";

interface LinuxArenaRouteProps {
  searchParams?: {
    id?: string;
  };
}

export default function Page({ searchParams }: LinuxArenaRouteProps) {
  return <LinuxArenaPage initialQuestionId={searchParams?.id} />;
}
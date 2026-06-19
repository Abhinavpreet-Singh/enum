"use client";
import { getMemoryToken } from "@/lib/tokenStore";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import axios from "axios";
import { proxy } from "@/app/proxy";
import type { IncidentSimulation } from "@/types/incident";
import IncidentWorkspace from "@/components/incidents/IncidentWorkspace";
import { formatIncidentCode } from "@/components/incidents/incident-display";

export default function IncidentDetailClientPage() {
  const params = useParams();
  const id = params?.id as string;

  const [incident, setIncident] = useState<IncidentSimulation | null>(null);
  const [scenarioLabel, setScenarioLabel] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIncident = async () => {
      try {
        setIsLoading(true);
        const token = getMemoryToken();
        const [detailRes, listRes] = await Promise.all([
          axios.get(`${proxy}/api/v1/incidents/${id}`),
          axios.get(`${proxy}/api/v1/incidents`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
        ]);
        setIncident(detailRes.data.data);
        const list = listRes.data.data as IncidentSimulation[];
        const idx = list.findIndex((item) => item.id === id);
        if (idx >= 0) setScenarioLabel(formatIncidentCode(idx));
      } catch (err) {
        const message =
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : "Failed to load incident";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchIncident();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-white dark:bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-black dark:text-white" />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white px-4 dark:bg-black">
        <AlertCircle className="mb-4 h-12 w-12 text-red-500 dark:text-red-400" />
        <p className="mb-2 text-lg font-semibold text-black dark:text-white">
          {error || "Incident not found"}
        </p>
        <Link
          href="/dashboard/incidents"
          className="mt-4 flex items-center gap-1 font-mono text-sm text-black underline-offset-4 hover:underline dark:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Incidents
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <IncidentWorkspace incident={incident} scenarioLabel={scenarioLabel} />
    </div>
  );
}

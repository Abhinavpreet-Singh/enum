"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import axios from "axios";
import { proxy } from "@/app/proxy";
import type { IncidentSimulation } from "@/types/incident";
import IncidentWorkspace from "@/components/incidents/IncidentWorkspace";

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [incident, setIncident] = useState<IncidentSimulation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIncident = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(
          `${proxy}/api/v1/incidents/${id}`,
        );

        setIncident(response.data.data);
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
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-gray-900 mb-2">
          {error || "Incident not found"}
        </p>
        <Link
          href="/dashboard/incidents"
          className="text-blue-600 hover:underline flex items-center gap-1 mt-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Incidents
        </Link>
      </div>
    );
  }

  return <IncidentWorkspace incident={incident} />;
}

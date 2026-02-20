"use client";

import { useParams } from "next/navigation";
import { getSimulationById } from "@/data/simulations";
import SimulationWorkspace from "@/components/simulations/simulation-workspace";
import ProtectedRoute from "@/components/auth/protected-route";
import Sidebar from "@/components/dashboard/sidebar";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SimulationDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const simulation = getSimulationById(id);

  if (!simulation) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Sidebar collapsed={true} />
          <div className="text-center lg:ml-16">
            <h1 className="text-2xl font-bold text-black mb-2">
              Simulation Not Found
            </h1>
            <p className="text-gray-600 mb-4">
              The simulation you&apos;re looking for doesn&apos;t exist.
            </p>
            <Link
              href="/dashboard/simulations"
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Simulations
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen">
        <Sidebar collapsed={true} />
        <div className="flex-1 lg:ml-16">
          <SimulationWorkspace simulation={simulation} />
        </div>
      </div>
    </ProtectedRoute>
  );
}

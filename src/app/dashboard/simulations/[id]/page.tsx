"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import SimulationWorkspace from "@/components/simulations/simulation-workspace";
import SimulationContainer from "@/components/simulations/SimulationContainer";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import axios from "axios";
import { proxy } from "@/app/proxy";
import type { Simulation } from "@/data/simulations";

/** Categories that use the backend coding simulation environment */
const BACKEND_CATEGORIES = new Set(["backend", "fullstack", "devops"]);

export default function SimulationDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchSimulation = async () => {
      try {
        const response = await axios.get(
          `${proxy}/api/v1/simulations/getSimulation/${id}`
        );
        const data = response.data.data;

        const solutionObj: Record<string, string> = {};
        if (data.solution) {
          if (data.solution instanceof Map) {
            data.solution.forEach((value: string, key: string) => {
              solutionObj[key] = value;
            });
          } else if (typeof data.solution === "object") {
            Object.entries(data.solution).forEach(([key, value]) => {
              solutionObj[key] = value as string;
            });
          }
        }

        const sim: Simulation = {
          id: data.id,
          title: data.title,
          category: data.category,
          difficulty: data.difficulty,
          description: data.description,
          incident: data.incident,
          steps: data.steps || [],
          initialFiles: (data.initialFiles || []).map((f: Record<string, string>) => ({
            name: f.name || "",
            path: f.path || "",
            content: f.content || "",
            language: f.language || "javascript",
            cloudinaryUrl: f.cloudinaryUrl || "",
            cloudinaryPublicId: f.cloudinaryPublicId || "",
          })),
          solution: solutionObj,
          hints: data.hints || [],
          estimatedTime: data.estimatedTime,
          tags: data.tags || [],
          xpReward: data.xpReward,
          entryFile: data.entryFile || "index.js",
          expectedOutput: data.expectedOutput || "",
        };

        setSimulation(sim);
      } catch (err) {
        console.error("Error fetching simulation:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSimulation();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          <span className="text-gray-500 font-mono text-sm">Loading simulation...</span>
        </div>
      </div>
    );
  }

  if (error || !simulation) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
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
    );
  }

  const useBackendWorkspace = BACKEND_CATEGORIES.has(simulation.category);

  return (
    <div className="h-[calc(100vh-theme(spacing.20))] lg:h-screen -mb-20 lg:mb-0">
      {useBackendWorkspace ? (
        <SimulationContainer simulation={simulation} />
      ) : (
        <SimulationWorkspace simulation={simulation} />
      )}
    </div>
  );
}

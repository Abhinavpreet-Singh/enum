"use client";

import { API_BASE_URL } from "@/lib/api-config";
import api, { isAxiosError } from "@/lib/api";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import SimulationWorkspace from "@/components/simulations/simulation-workspace";
import SimulationContainer from "@/components/simulations/SimulationContainer";
import BrowserSandboxWorkspace from "@/components/simulations/browser/BrowserSandboxWorkspace";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import type { Simulation } from "@/data/simulations";
import {
  browserSimulations,
  type BrowserSimulation,
} from "@/data/browser-simulations";

/** Categories that use the backend coding simulation environment */
const BACKEND_CATEGORIES = new Set(["backend", "fullstack", "devops"]);

export default function SimulationDetailClientPage() {
  const params = useParams();
  const id = params?.id as string;

  // ── Check local browser simulations first (no backend needed) ──────────
  const browserSim: BrowserSimulation | undefined = browserSimulations.find(
    (s) => s.id === id,
  );

  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(!browserSim); // skip loading if local
  const [error, setError] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    // If it's a local browser simulation, nothing to fetch
    if (browserSim) return;

    const fetchSimulation = async () => {
      try {
        const response = await api.get(
          `/api/v1/simulations/getSimulation/${id}`,
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
          initialFiles: (data.initialFiles || []).map(
            (f: Record<string, string>) => ({
              name: f.name || "",
              path: f.path || "",
              content: f.content || "",
              language: f.language || "javascript",
              cloudinaryUrl: f.cloudinaryUrl || "",
              cloudinaryPublicId: f.cloudinaryPublicId || "",
            }),
          ),
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
        if (isAxiosError(err) && err.response?.status === 403) {
          setLocked(true);
        }
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (id && !browserSim) {
      fetchSimulation();
    }
  }, [id, browserSim]);

  // ── Browser sandbox (local-only, no backend) ──────────────────────────
  if (browserSim) {
    return (
      <div className="h-[calc(100vh-(--spacing(20)))] lg:h-screen -mb-20 lg:mb-0">
        <BrowserSandboxWorkspace simulation={browserSim} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          <span className="text-gray-500 font-mono text-sm">
            Loading simulation...
          </span>
        </div>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md border border-gray-200 bg-white p-8 text-center dark:border-white/10 dark:bg-[#111]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-gray-200 dark:border-white/10">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-black dark:text-white mb-2">
            Premium Simulation
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-5">
            Upgrade to Enum Pro or unlock this track to continue.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link
              href="/dashboard/pro"
              className="inline-flex items-center gap-2 border border-black bg-black px-4 py-2 font-mono text-xs uppercase tracking-widest text-white transition-colors hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black"
            >
              Unlock Pro
            </Link>
            <Link
              href="/dashboard/simulations"
              className="inline-flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest text-gray-500 hover:text-black dark:hover:text-white"
            >
              Back
            </Link>
          </div>
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
    <div className="h-[calc(100vh-(--spacing(20)))] lg:h-screen -mb-20 lg:mb-0">
      {useBackendWorkspace ? (
        <SimulationContainer simulation={simulation} />
      ) : (
        <SimulationWorkspace simulation={simulation} />
      )}
    </div>
  );
}

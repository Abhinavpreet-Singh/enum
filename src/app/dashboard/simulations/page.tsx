"use client";

import { useEffect, useState } from "react";
import { Bug, Clock, TrendingUp, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { proxy } from "@/app/proxy";

interface SimulationItem {
  id: string;
  title: string;
  category: "frontend" | "backend" | "fullstack" | "devops";
  difficulty: "easy" | "medium" | "hard";
  description: string;
  estimatedTime: number;
  xpReward: number;
  tags: string[];
}

export default function SimulationsPage() {
  const [simulations, setSimulations] = useState<SimulationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimulations = async () => {
      try {
        const response = await axios.get(`${proxy}/api/v1/simulations/getSimulations`);
        setSimulations(response.data.data || []);
      } catch (error) {
        console.error("Error fetching simulations:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSimulations();
  }, []);

  const categories = [
    {
      id: "frontend",
      label: "Frontend",
      icon: "🎨",
      count: simulations.filter((s) => s.category === "frontend").length,
    },
    {
      id: "backend",
      label: "Backend",
      icon: "⚙️",
      count: simulations.filter((s) => s.category === "backend").length,
    },
    {
      id: "fullstack",
      label: "Full Stack",
      icon: "🔄",
      count: simulations.filter((s) => s.category === "fullstack").length,
    },
    {
      id: "devops",
      label: "DevOps",
      icon: "🚀",
      count: simulations.filter((s) => s.category === "devops").length,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">
          Production Simulations
        </h1>
        <p className="text-gray-600">
          Solve real-world bugs in production-like environments
        </p>
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-2xl font-bold text-black">
                {cat.count}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-700">
              {cat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500 mr-2" />
          <span className="text-gray-500 font-mono text-sm">Loading simulations...</span>
        </div>
      ) : simulations.length === 0 ? (
        <div className="text-center py-16">
          <Bug className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-mono text-sm">No simulations available yet.</p>
        </div>
      ) : (
        /* Simulations List */
        <div className="space-y-4">
          {simulations.map((simulation) => (
            <Link
              key={simulation.id}
              href={`/dashboard/simulations/${simulation.id}`}
              className="block bg-white rounded-lg border border-gray-200 hover:border-black transition-all hover:shadow-md group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Bug className="w-5 h-5 text-gray-900" />
                      <h3 className="text-lg font-bold text-black group-hover:underline transition-all">
                        {simulation.title}
                      </h3>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">
                      {simulation.description}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  {/* Difficulty */}
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-medium border ${simulation.difficulty === "easy"
                      ? "bg-white border-gray-300 text-gray-700"
                      : simulation.difficulty === "medium"
                        ? "bg-gray-100 border-gray-400 text-gray-800"
                        : "bg-gray-900 border-black text-white"
                      }`}
                  >
                    {simulation.difficulty.toUpperCase()}
                  </span>

                  {/* Category */}
                  <span className="px-2.5 py-1 rounded text-xs font-medium bg-gray-900 text-white">
                    {simulation.category}
                  </span>

                  {/* Time */}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{simulation.estimatedTime} min</span>
                  </div>

                  {/* XP Reward */}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <TrendingUp className="w-4 h-4" />
                    <span>+{simulation.xpReward} XP</span>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-2">
                    {simulation.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 border border-gray-300 text-gray-600 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {simulation.tags.length > 3 && (
                      <span className="text-xs text-gray-400">
                        +{simulation.tags.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

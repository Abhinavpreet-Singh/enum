"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useAuth from "@/hooks/useAuth";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { browserSimulations } from "@/data/browser-simulations";

interface DisplaySimulation {
  id: string;
  title: string;
  category: "Frontend" | "Backend" | "System Design";
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  href: string;
}

export default function LatestIncidentsSection() {
  const isAuthenticated = useAuth();
  const [simulationsList, setSimulationsList] = useState<DisplaySimulation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSimulations = async () => {
      setLoading(true);
      try {
        const [backendRes, systemDesignRes] = await Promise.all([
          axios.get(`${proxy}/api/v1/simulations/getSimulations`, { withCredentials: true }).catch(() => null),
          axios.get(`${proxy}/api/v1/system-design/simulations`, { withCredentials: true }).catch(() => null),
        ]);

        if (!isMounted) return;

        const resolvedList: DisplaySimulation[] = [];

        // 1. Frontend Simulation (from local config / browserSimulations)
        const localFrontend = browserSimulations.find((sim) => sim.category === "frontend");
        if (localFrontend) {
          resolvedList.push({
            id: localFrontend.id,
            title: localFrontend.title,
            category: "Frontend",
            difficulty: localFrontend.difficulty === "easy" ? "Easy" : localFrontend.difficulty === "medium" ? "Medium" : "Hard",
            description: localFrontend.description,
            href: isAuthenticated ? `/dashboard/simulations/${localFrontend.id}` : "/login",
          });
        } else {
          resolvedList.push({
            id: "browser-broken-gallery",
            title: "Fix: Broken Responsive Gallery",
            category: "Frontend",
            difficulty: "Easy",
            description: "A photo gallery built with CSS Grid is completely broken. Fix the CSS so it renders as a responsive, masonry-style grid.",
            href: isAuthenticated ? "/dashboard/simulations/browser-broken-gallery" : "/login",
          });
        }

        // 2. Backend Simulation (from backend database, with fallback)
        const backendSims = (backendRes?.data?.data ?? []).filter(
          (sim: any) => sim.category === "backend"
        );
        const apiBackend = backendSims[0];
        if (apiBackend) {
          resolvedList.push({
            id: apiBackend.id || apiBackend._id,
            title: apiBackend.title,
            category: "Backend",
            difficulty: apiBackend.difficulty === "easy" ? "Easy" : apiBackend.difficulty === "medium" ? "Medium" : "Hard",
            description: apiBackend.description || "A calculation or route is failing due to variable error or timeout in production.",
            href: isAuthenticated ? `/dashboard/simulations/${apiBackend.id || apiBackend._id}` : "/login",
          });
        } else {
          resolvedList.push({
            id: "console-log-debug",
            title: "Debug: Missing Console Output",
            category: "Backend",
            difficulty: "Easy",
            description: "A simple function should log output but nothing appears in the console. Identify the bug in the scope and add the missing output statement.",
            href: isAuthenticated ? "/dashboard/simulations/console-log-debug" : "/login",
          });
        }

        // 3. System Design Simulation (from backend database, with fallback)
        const apiSystemDesign = systemDesignRes?.data?.data?.[0];
        if (apiSystemDesign) {
          resolvedList.push({
            id: apiSystemDesign.id || apiSystemDesign._id,
            title: apiSystemDesign.title,
            category: "System Design",
            difficulty: apiSystemDesign.difficulty === "easy" ? "Easy" : apiSystemDesign.difficulty === "medium" ? "Medium" : "Hard",
            description: apiSystemDesign.description || "Design a highly scalable and fault-tolerant system design architecture diagram using React Flow nodes and edges.",
            href: isAuthenticated ? `/dashboard/simulations/system-design/${apiSystemDesign.id || apiSystemDesign._id}` : "/login",
          });
        } else {
          resolvedList.push({
            id: "url-shortener",
            title: "Design: URL Shortener",
            category: "System Design",
            difficulty: "Medium",
            description: "Design a highly scalable, fault-tolerant URL shortener like Bitly. Define the API, caching layers, database schemas, and load balancing strategy.",
            href: isAuthenticated ? "/dashboard/simulations/system-design/url-shortener" : "/login",
          });
        }

        setSimulationsList(resolvedList);
      } catch (err) {
        console.error("Error loading simulations for landing page:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSimulations();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const viewAllHref = isAuthenticated ? "/dashboard/simulations" : "/login";

  return (
    <section id="simulations" className="py-16 md:py-20 px-4 md:px-6 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-8 md:mb-12">
          <h2 className="font-mono text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-black dark:text-white tracking-tight">
            Latest Simulations
          </h2>
          <p className="text-gray-700 dark:text-gray-400 text-xs md:text-sm font-mono tracking-[0.05em]">
            These are the latest simulations on your dashboard. Click one to jump in.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-16">
              <div className="font-mono text-sm text-gray-500">Loading simulations...</div>
            </div>
          ) : simulationsList.length === 0 ? (
            <div className="col-span-full rounded-none border border-gray-200 dark:border-white/10 bg-white dark:bg-black p-8 text-center">
              <p className="text-gray-700 dark:text-gray-300">No simulations found.</p>
            </div>
          ) : (
            simulationsList.map((sim) => (
              <Link
                key={sim.id}
                href={sim.href}
                className="group bg-white dark:bg-[#0c0c0c] border border-gray-200 dark:border-white/10 p-4 md:p-6 rounded-none hover:border-black dark:hover:border-white transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Category and Difficulty */}
                  <div className="flex items-center justify-between mb-3 md:mb-4 gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-none text-xs font-mono font-semibold border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-transparent text-black dark:text-gray-300">
                      {sim.category}
                    </span>
                    <span className="flex items-center text-xs text-gray-500 dark:text-gray-500 font-mono whitespace-nowrap">
                      {sim.difficulty}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-black dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                    {sim.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-700 dark:text-gray-400 text-sm leading-relaxed mb-6 line-clamp-3 text-justify">
                    {sim.description}
                  </p>
                </div>

                {/* Footer - Difficulty details and arrow */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-transparent">
                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-500">
                      Difficulty:{" "}
                    </span>
                    <span className="text-xs font-semibold text-black dark:text-white">
                      {sim.difficulty}
                    </span>
                  </div>
                  <svg
                    className="w-4 md:w-5 h-4 md:h-5 text-gray-400 dark:text-gray-600 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* View all link */}
        <div className="text-center mt-8 md:mt-12">
          <Link
            href={viewAllHref}
            className="inline-flex items-center text-sm font-medium text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            View all simulations
            <svg
              className="w-4 h-4 ml-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

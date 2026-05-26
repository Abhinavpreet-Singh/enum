"use client";

import {
  DashboardPageHeader,
  DashboardPageShell,
} from "@/components/dashboard/dashboard-page-shell";
import {
  Lock,
  ChevronRight,
  Layers,
  Cpu,
  GitBranch,
  Globe,
  Database,
  Cloud,
} from "lucide-react";

const TRACKS = [
  {
    id: "dsa-fundamentals",
    title: "DSA Fundamentals",
    description:
      "Arrays, linked lists, stacks, queues, trees, and graphs from scratch.",
    icon: Cpu,
    problems: 42,
    xp: 2100,
    difficulty: "Beginner",
    diffColor: "text-emerald-500",
    locked: false,
    progress: 0,
    tags: ["Arrays", "Trees", "Graphs", "DP"],
  },
  {
    id: "system-design",
    title: "System Design",
    description:
      "Design scalable systems — load balancers, caches, message queues, and more.",
    icon: Layers,
    problems: 24,
    xp: 3600,
    difficulty: "Advanced",
    diffColor: "text-red-400",
    locked: false,
    progress: 0,
    tags: ["Caching", "Databases", "Load Balancing", "Queues"],
  },
  {
    id: "backend-engineering",
    title: "Backend Engineering",
    description:
      "REST APIs, auth flows, database modeling, and production-ready Node.js.",
    icon: Database,
    problems: 30,
    xp: 2700,
    difficulty: "Intermediate",
    diffColor: "text-amber-400",
    locked: false,
    progress: 0,
    tags: ["REST", "Auth", "PostgreSQL", "Node.js"],
  },
  {
    id: "devops-ci-cd",
    title: "DevOps & CI/CD",
    description:
      "Containers, pipelines, Kubernetes, and infrastructure as code.",
    icon: GitBranch,
    problems: 18,
    xp: 2400,
    difficulty: "Intermediate",
    diffColor: "text-amber-400",
    locked: true,
    progress: 0,
    tags: ["Docker", "K8s", "GitHub Actions", "Terraform"],
  },
  {
    id: "frontend-mastery",
    title: "Frontend Mastery",
    description:
      "React internals, performance, accessibility, and modern CSS techniques.",
    icon: Globe,
    problems: 22,
    xp: 1800,
    difficulty: "Intermediate",
    diffColor: "text-amber-400",
    locked: true,
    progress: 0,
    tags: ["React", "Performance", "a11y", "CSS"],
  },
  {
    id: "cloud-architecture",
    title: "Cloud Architecture",
    description:
      "AWS / GCP / Azure patterns, serverless, and multi-region deployments.",
    icon: Cloud,
    problems: 16,
    xp: 3200,
    difficulty: "Advanced",
    diffColor: "text-red-400",
    locked: true,
    progress: 0,
    tags: ["AWS", "Serverless", "IaC", "Observability"],
  },
];

export default function TracksPage() {
  return (
    <DashboardPageShell className="space-y-6">
      <DashboardPageHeader
        breadcrumb="Dashboard / Tracks"
        title="Learning Tracks"
        description="Structured paths to master engineering disciplines end-to-end"
      />

        {/* Stat bar */}
        <div className="flex items-center gap-6 font-mono text-xs border-y border-gray-100 dark:border-white/5 py-3">
          <span className="text-gray-500 dark:text-gray-400">
            <span className="text-black dark:text-white font-bold">
              {TRACKS.length}
            </span>{" "}
            tracks
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            <span className="text-black dark:text-white font-bold">
              {TRACKS.reduce((a, t) => a + t.problems, 0)}
            </span>{" "}
            problems
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            <span className="text-black dark:text-white font-bold">
              {TRACKS.reduce((a, t) => a + t.xp, 0).toLocaleString()}
            </span>{" "}
            XP available
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-gray-100 dark:bg-white/5 border border-gray-100 dark:border-white/5">
          {TRACKS.map((track) => {
            const Icon = track.icon;
            return (
              <div
                key={track.id}
                className={`group relative flex flex-col p-5 bg-white dark:bg-[#111] transition-colors overflow-hidden ${
                  track.locked
                    ? "opacity-70 pointer-events-none select-none"
                    : "hover:bg-gray-50 dark:hover:bg-[#161616] cursor-pointer"
                }`}
              >
                {/* Background lock watermark */}
                {track.locked && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-0">
                    <Lock className="w-28 h-28 text-black/10 dark:text-white/10 stroke-[0.75]" />
                  </div>
                )}

                {/* SOON badge */}
                {track.locked && (
                  <span className="absolute top-4 right-4 font-mono text-[9px] tracking-widest text-gray-300 dark:text-white/20 z-10">
                    SOON
                  </span>
                )}

                {/* Icon + difficulty */}
                <div className="relative z-10 flex items-start justify-between mb-4">
                  <div className="p-2 border border-gray-100 dark:border-white/8 text-black dark:text-white">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`font-mono text-[10px] tracking-widest ${track.diffColor}`}
                  >
                    {track.difficulty.toUpperCase()}
                  </span>
                </div>

                {/* Title + desc */}
                <h2 className="relative z-10 text-base font-bold text-black dark:text-white mb-1.5 leading-tight">
                  {track.title}
                </h2>
                <p className="relative z-10 text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex-1">
                  {track.description}
                </p>

                {/* Tags */}
                <div className="relative z-10 flex flex-wrap gap-1 mt-3 mb-4">
                  {track.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 border border-gray-100 dark:border-white/5 font-mono text-[9px] tracking-wide text-gray-400 dark:text-gray-500 uppercase"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="relative z-10 flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-3 font-mono text-[10px] text-gray-400 dark:text-gray-500">
                    <span>
                      <span className="text-black dark:text-white font-bold">
                        {track.problems}
                      </span>{" "}
                      problems
                    </span>
                    <span>
                      <span className="text-black dark:text-white font-bold">
                        {track.xp.toLocaleString()}
                      </span>{" "}
                      XP
                    </span>
                  </div>
                  {!track.locked && (
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/20 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Coming soon note */}
      <p className="pt-2 text-center font-mono text-[10px] tracking-widest text-gray-400 dark:text-gray-600">
        MORE TRACKS COMING SOON — LOCKED TRACKS UNLOCK AS YOU PROGRESS
      </p>
    </DashboardPageShell>
  );
}

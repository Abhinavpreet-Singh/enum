"use client";

import { API_BASE_URL } from "@/lib/api-config";
import api from "@/lib/api";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  Handshake,
  Monitor,
  Network,
  Server,
  Target,
  Terminal,
  Trophy,
  Users,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import { browserSimulations } from "@/data/browser-simulations";
import {
  CollabLivePreview,
  DsaTestRunnerPreview,
  IncidentOpsPreview,
  SimulationScenePreview,
} from "@/components/dashboard/panel-previews";

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;
const panelHover =
  "transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out hover:border-black hover:bg-white/45 hover:shadow-sm hover:-translate-y-0.5 dark:hover:border-white dark:hover:bg-black/40 dark:hover:shadow-white/5";
const panelLink = `group block ${panelSurface} ${panelHover}`;
const featureNavCard = `${panelLink} flex min-h-[11rem] min-w-0 flex-col overflow-hidden p-2.5 sm:min-h-[12rem] sm:p-3`;
const featureNavBody = "flex min-h-0 flex-1 flex-col";
const cardFooterArrow =
  "inline-flex h-6 w-6 items-center justify-center border border-black/12 transition-colors group-hover:border-black group-hover:bg-black group-hover:text-white dark:border-white/18 dark:group-hover:border-white dark:group-hover:bg-white dark:group-hover:text-black";
const arrowCardFooter = "relative mt-1 flex shrink-0 items-center justify-end";
const previewFrame =
  "pointer-events-none relative min-h-[5.75rem] w-full flex-1 overflow-hidden rounded-md border border-zinc-200/90 bg-linear-to-b from-zinc-50/95 to-zinc-100/40 dark:border-zinc-700/70 dark:from-zinc-900/55 dark:to-zinc-950/90";

interface LeaderboardEntry {
  _id: string;
  username: string;
  displayName?: string;
  xp: number;
}

interface BackendSimulation {
  id: string;
  title: string;
  category?: string;
}

interface SystemDesignSimulation {
  id: string;
  title: string;
}

interface LinuxSimulation {
  id: string;
  title: string;
}

interface FeatureCard {
  title: string;
  href: string;
  icon: ReactNode;
  preview: ReactNode;
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardPreview({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className={previewFrame} aria-hidden>
      <div className="flex h-full min-h-0 flex-col px-2 py-1.5">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-[6px] uppercase tracking-[0.28em] text-zinc-400">
            Top XP
          </span>
          <Users className="h-3 w-3 text-zinc-400" />
        </div>

        <div className="min-h-0 flex-1 divide-y divide-zinc-200/70 dark:divide-zinc-700/70">
          {entries.length > 0 ? (
            entries.slice(0, 3).map((entry, index) => (
              <div
                key={entry._id || `${entry.username}-${index}`}
                className="flex items-center gap-1.5 py-1.5"
              >
                <span className="w-4 shrink-0 text-center text-[9px]">
                  {RANK_MEDALS[index] || `#${index + 1}`}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[7px] font-semibold text-zinc-700 dark:text-zinc-200">
                  {entry.displayName || entry.username}
                </span>
                <span className="shrink-0 font-mono text-[7px] tabular-nums text-zinc-400">
                  {entry.xp.toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="font-mono text-[7px] text-zinc-400">
                Leaderboard loading
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BackendSimulationPreview() {
  return (
    <div className={previewFrame} aria-hidden>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-zinc-200/80 px-2 py-1 dark:border-zinc-700/80">
          <span className="font-mono text-[6px] uppercase tracking-[0.28em] text-zinc-400">
            api.service
          </span>
          <span className="rounded border border-amber-400/40 px-1 py-0.5 font-mono text-[6px] text-amber-600 dark:text-amber-400">
            degraded
          </span>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-1.5 p-2">
          <div className="rounded border border-zinc-200/70 bg-white/60 px-1.5 py-1 dark:border-zinc-700/70 dark:bg-zinc-900/45">
            <p className="font-mono text-[6px] text-zinc-400">p95 latency</p>
            <p className="font-mono text-[9px] font-semibold text-zinc-700 dark:text-zinc-100">
              842ms
            </p>
          </div>
          <div className="rounded border border-zinc-200/70 bg-white/60 px-1.5 py-1 dark:border-zinc-700/70 dark:bg-zinc-900/45">
            <p className="font-mono text-[6px] text-zinc-400">queue depth</p>
            <p className="font-mono text-[9px] font-semibold text-red-600 dark:text-red-400">
              128
            </p>
          </div>
          <div className="col-span-2 rounded border border-zinc-200/70 bg-zinc-950/[0.03] px-1.5 py-1 dark:border-zinc-700/70 dark:bg-black/35">
            <p className="font-mono text-[6px] text-zinc-400">recent logs</p>
            <div className="mt-1 space-y-0.5 font-mono text-[6px] text-zinc-500 dark:text-zinc-400">
              <p>POST /jobs 500 timeout upstream</p>
              <p>worker_pool retrying batch:42</p>
              <p>db_conn saturation 91%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SystemDesignPreview() {
  return (
    <div className={previewFrame} aria-hidden>
      <div className="relative flex h-full min-h-0 items-center justify-center px-2 py-2">
        <div className="absolute left-[18%] right-[18%] top-1/2 h-px -translate-y-1/2 bg-zinc-300/70 dark:bg-zinc-600" />
        <div className="absolute left-1/2 top-[26%] h-[48%] w-px -translate-x-1/2 bg-zinc-300/70 dark:bg-zinc-600" />
        <div className="grid w-full grid-cols-3 gap-1.5">
          <div className="rounded border border-zinc-300/60 bg-white/70 px-1 py-1 text-center font-mono text-[6px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/45 dark:text-zinc-300">
            Edge
          </div>
          <div className="rounded border border-zinc-300/60 bg-white/70 px-1 py-1 text-center font-mono text-[6px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/45 dark:text-zinc-300">
            API
          </div>
          <div className="rounded border border-zinc-300/60 bg-white/70 px-1 py-1 text-center font-mono text-[6px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/45 dark:text-zinc-300">
            Cache
          </div>
          <div />
          <div className="rounded border border-black/20 bg-black px-1 py-1 text-center font-mono text-[6px] text-white dark:border-white/25 dark:bg-white dark:text-black">
            Queue
          </div>
          <div />
          <div className="col-start-2 rounded border border-zinc-300/60 bg-white/70 px-1 py-1 text-center font-mono text-[6px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/45 dark:text-zinc-300">
            Storage
          </div>
        </div>
      </div>
    </div>
  );
}

function LinuxPreview() {
  return (
    <div className={previewFrame} aria-hidden>
      <div className="flex h-full min-h-0 flex-col bg-zinc-950/[0.02] dark:bg-black/40">
        <div className="border-b border-zinc-200/80 px-2 py-1 dark:border-zinc-700/80">
          <span className="font-mono text-[6px] uppercase tracking-[0.28em] text-zinc-400">
            shell
          </span>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1 px-2 py-2 font-mono text-[7px] text-zinc-600 dark:text-zinc-300">
          <p>
            <span className="text-emerald-600 dark:text-emerald-400">$</span>{" "}
            grep -R &quot;panic&quot; /var/log/app
          </p>
          <p className="text-zinc-400">service.log: permission denied</p>
          <p>
            <span className="text-emerald-600 dark:text-emerald-400">$</span>{" "}
            chmod +x fix.sh && ./fix.sh
          </p>
          <p className="text-zinc-400">restored symlink and restarted worker</p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ card, href }: { card: FeatureCard; href: string }) {
  return (
    <Link href={href} className={featureNavCard}>
      <div className={featureNavBody}>
        <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-800 dark:text-zinc-100">
            {card.title}
          </p>
          {card.icon}
        </div>
        {card.preview}
      </div>
      <div className={arrowCardFooter}>
        <span className={cardFooterArrow}>
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

export default function FeaturesSection() {
  const isAuthenticated = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [backendSimulation, setBackendSimulation] =
    useState<BackendSimulation | null>(null);
  const [systemDesignSimulation, setSystemDesignSimulation] =
    useState<SystemDesignSimulation | null>(null);
  const [linuxSimulation, setLinuxSimulation] =
    useState<LinuxSimulation | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      api.get("/api/v1/users/leaderboard").catch(() => null),
      api
        .get("/api/v1/simulations/getSimulations", {
          withCredentials: true,
        })
        .catch(() => null),
      api
        .get("/api/v1/system-design/simulations", {
          withCredentials: true,
        })
        .catch(() => null),
      api
        .get("/api/v1/simulations/linux", {
          withCredentials: true,
        })
        .catch(() => null),
    ]).then(
      ([
        leaderboardResponse,
        backendResponse,
        systemDesignResponse,
        linuxResponse,
      ]) => {
        if (!isMounted) return;

        setLeaderboard(leaderboardResponse?.data?.data ?? []);

        const backendList = (backendResponse?.data?.data ?? []).filter(
          (simulation: BackendSimulation) => simulation.category === "backend",
        );
        setBackendSimulation(backendList[0] ?? null);
        setSystemDesignSimulation(
          systemDesignResponse?.data?.data?.[0] ?? null,
        );
        setLinuxSimulation(linuxResponse?.data?.data?.[0] ?? null);
      },
    );

    return () => {
      isMounted = false;
    };
  }, []);

  const withLoginFallback = (href: string) =>
    isAuthenticated === false
      ? `/login?returnTo=${encodeURIComponent(href)}`
      : href;

  const frontendSimulation = browserSimulations.find(
    (simulation) => simulation.category === "frontend",
  );

  const simulationCards: FeatureCard[] = [
    frontendSimulation
      ? {
          title: "Frontend",
          href: `/dashboard/simulations/${frontendSimulation.id}`,
          icon: <Monitor className="h-3 w-3 shrink-0 text-sky-500/80" />,
          preview: <SimulationScenePreview />,
        }
      : null,
    backendSimulation
      ? {
          title: "Backend",
          href: `/dashboard/simulations/${backendSimulation.id}`,
          icon: <Server className="h-3 w-3 shrink-0 text-amber-500/80" />,
          preview: <BackendSimulationPreview />,
        }
      : null,
    systemDesignSimulation
      ? {
          title: "System Design",
          href: `/dashboard/simulations/system-design/${systemDesignSimulation.id}`,
          icon: <Network className="h-3 w-3 shrink-0 text-indigo-500/80" />,
          preview: <SystemDesignPreview />,
        }
      : null,
    linuxSimulation
      ? {
          title: "Linux",
          href: `/dashboard/simulations/linux?id=${encodeURIComponent(linuxSimulation.id)}`,
          icon: <Terminal className="h-3 w-3 shrink-0 text-emerald-500/80" />,
          preview: <LinuxPreview />,
        }
      : null,
  ].filter(Boolean) as FeatureCard[];

  const moreFeatureCards: FeatureCard[] = [
    {
      title: "Incidents",
      href: "/dashboard/incidents",
      icon: (
        <AlertTriangle className="h-3 w-3 shrink-0 animate-pulse text-red-500/80" />
      ),
      preview: <IncidentOpsPreview />,
    },
    {
      title: "DSA Arena",
      href: "/dashboard/dsa-arena",
      icon: <Target className="h-3 w-3 shrink-0 text-emerald-500/80" />,
      preview: <DsaTestRunnerPreview />,
    },
    {
      title: "Collaboration",
      href: "/dashboard/collab",
      icon: <Handshake className="h-3 w-3 shrink-0 text-violet-500/80" />,
      preview: <CollabLivePreview />,
    },
    {
      title: "Leaderboard",
      href: "/dashboard/leaderboard",
      icon: (
        <Trophy className="h-3 w-3 shrink-0 text-zinc-500 dark:text-zinc-300" />
      ),
      preview: <LeaderboardPreview entries={leaderboard} />,
    },
  ];

  return (
    <section
      id="features"
      className="bg-white px-4 pb-16 pt-8 dark:bg-black md:px-6 md:pb-[4.5rem] md:pt-10"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 md:mb-10">
          <h2 className="mb-2 font-mono text-[2rem] font-bold tracking-[-0.03em] text-black dark:text-white md:mb-3 md:text-[2.55rem]">
            Features
          </h2>
          <p className="font-mono text-sm tracking-[0.05em] text-gray-700 dark:text-gray-400 md:text-base">
            Explore the core surfaces from the dashboard directly on the
            homepage, grouped by simulation tracks first and then the broader
            product features.
          </p>
        </div>

        <div className="mb-8 md:mb-9">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
                Features
              </p>
              <h3 className="mt-1 text-[1.65rem] font-bold tracking-[-0.02em] text-black dark:text-white">
                Simulations
              </h3>
            </div>
            <Link
              href={withLoginFallback("/dashboard/simulations")}
              className="font-mono text-[11px] text-gray-500 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white"
            >
              View all
            </Link>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {simulationCards.map((card) => (
              <FeatureCard
                key={card.title}
                card={card}
                href={withLoginFallback(card.href)}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
              More
            </p>
            <h3 className="mt-1 text-[1.65rem] font-bold tracking-[-0.02em] text-black dark:text-white">
              More Features
            </h3>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {moreFeatureCards.map((card) => (
              <FeatureCard
                key={card.title}
                card={card}
                href={withLoginFallback(card.href)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { Code2, PlayCircle, Zap, Medal } from "lucide-react";

interface LeaderboardEntry {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  xp: number;
  problemsSolved: number;
  simulationsSolved: number;
}

const AVATAR_SIZES: Record<number, { wh: string; fs: number }> = {
  8: { wh: "w-8 h-8", fs: 14 },
  9: { wh: "w-9 h-9", fs: 16 },
  12: { wh: "w-12 h-12", fs: 20 },
};

const RANK_STYLES: Record<
  number,
  { border: string; bg: string; xpText: string }
> = {
  1: {
    border: "border-yellow-300 dark:border-yellow-500/40",
    bg: "bg-yellow-50 dark:bg-[#1a1500]",
    xpText: "text-yellow-600 dark:text-yellow-400",
  },
  2: {
    border: "border-gray-300 dark:border-white/15",
    bg: "bg-gray-50 dark:bg-[#111]",
    xpText: "text-gray-500 dark:text-gray-300",
  },
  3: {
    border: "border-orange-300 dark:border-orange-500/40",
    bg: "bg-orange-50 dark:bg-[#1a0e00]",
    xpText: "text-orange-500 dark:text-orange-400",
  },
};

const RANK_MEDAL = ["🥇", "🥈", "🥉"] as const;

function Avatar({
  src,
  name,
  size = 9,
}: {
  src: string;
  name: string;
  size?: number;
}) {
  const sz = AVATAR_SIZES[size] ?? AVATAR_SIZES[9];
  const base = `${sz.wh} rounded-full shrink-0`;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`${base} object-cover ring-2 ring-gray-200 dark:ring-white/10`}
      />
    );
  }
  return (
    <div
      className={`${base} bg-gray-900 dark:bg-white/10 flex items-center justify-center overflow-hidden ring-2 ring-gray-200 dark:ring-white/10`}
    >
      <span className="text-white font-bold" style={{ fontSize: sz.fs }}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUsername] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("Name") || "" : "",
  );

  useEffect(() => {
    axios
      .get(`${proxy}/api/v1/users/leaderboard`)
      .then((res) => {
        setEntries(res.data.data ?? []);
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.message ||
          (err?.code === "ERR_NETWORK"
            ? "Cannot reach the server — is the backend running on localhost:8000?"
            : "Failed to load leaderboard. Please try again.");
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <div className="max-w-4xl mx-auto px-4 py-10 space-y-3">
          <div className="h-7 w-48 bg-gray-100 dark:bg-white/5 animate-pulse mb-6" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-gray-100 dark:bg-white/5 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <p className="font-mono text-sm text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div>
          <p className="font-mono text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-1">
            Dashboard / Leaderboard
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white tracking-tight">
            Leaderboard
          </h1>
          <p className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">
            {entries.length} developers ranked by XP
          </p>
        </div>

        {/* XP legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-[11px] text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-white/8 px-4 py-3 bg-white dark:bg-[#111]">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-emerald-400" /> Easy problem ={" "}
            <strong className="text-gray-700 dark:text-gray-200">10 XP</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400" /> Medium problem ={" "}
            <strong className="text-gray-700 dark:text-gray-200">25 XP</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-red-400" /> Hard problem ={" "}
            <strong className="text-gray-700 dark:text-gray-200">50 XP</strong>
          </span>
          <span className="text-gray-200 dark:text-white/10">|</span>
          <span className="flex items-center gap-1.5">
            <PlayCircle className="w-3 h-3 text-emerald-300" /> Easy sim ={" "}
            <strong className="text-gray-700 dark:text-gray-200">50 XP</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <PlayCircle className="w-3 h-3 text-amber-300" /> Medium sim ={" "}
            <strong className="text-gray-700 dark:text-gray-200">100 XP</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <PlayCircle className="w-3 h-3 text-red-400" /> Hard sim ={" "}
            <strong className="text-gray-700 dark:text-gray-200">150 XP</strong>
          </span>
        </div>

        {/* Podium - top 3 */}
        {top3.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {top3.map((entry, i) => {
              const rank = i + 1;
              const s = RANK_STYLES[rank];
              const isMe = entry.username === currentUsername;
              return (
                <div
                  key={entry._id}
                  className={`relative border ${s.border} ${s.bg} p-5 flex flex-col items-center gap-2 text-center transition-colors ${
                    rank === 1
                      ? "sm:order-2"
                      : rank === 2
                        ? "sm:order-1"
                        : "sm:order-3"
                  }`}
                >
                  {isMe && (
                    <span className="absolute top-2 right-2 font-mono text-[9px] px-1.5 py-0.5 bg-black dark:bg-white text-white dark:text-black">
                      you
                    </span>
                  )}
                  <span className="text-2xl leading-none">
                    {RANK_MEDAL[i]}
                  </span>
                  <Avatar
                    src={entry.avatar}
                    name={entry.displayName}
                    size={12}
                  />
                  <div>
                    <p className="font-bold text-black dark:text-white text-sm">
                      {entry.displayName}
                    </p>
                    <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500">
                      @{entry.username}
                    </p>
                  </div>
                  <div className={`font-mono font-bold text-lg ${s.xpText}`}>
                    {entry.xp.toLocaleString()} XP
                  </div>
                  <div className="flex gap-3 font-mono text-[10px] text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <Code2 className="w-3 h-3" />
                      {entry.problemsSolved}
                    </span>
                    <span className="flex items-center gap-1">
                      <PlayCircle className="w-3 h-3" />
                      {entry.simulationsSolved}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table - rank 4+ */}
        {rest.length > 0 && (
          <div className="border border-gray-100 dark:border-white/8 overflow-hidden">
            <div className="grid grid-cols-[48px_1fr_100px_80px_80px] items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-[#161616]">
              <span className="font-mono text-[10px] text-gray-400 tracking-widest text-center">
                #
              </span>
              <span className="font-mono text-[10px] text-gray-400 tracking-widest">
                DEVELOPER
              </span>
              <span className="font-mono text-[10px] text-gray-400 tracking-widest text-right">
                XP
              </span>
              <span className="font-mono text-[10px] text-gray-400 tracking-widest text-center hidden sm:block">
                PROBLEMS
              </span>
              <span className="font-mono text-[10px] text-gray-400 tracking-widest text-center hidden sm:block">
                SIMS
              </span>
            </div>

            {rest.map((entry, i) => {
              const rank = i + 4;
              const isMe = entry.username === currentUsername;
              return (
                <div
                  key={entry._id}
                  className={`grid grid-cols-[48px_1fr_100px_80px_80px] items-center gap-2 px-4 py-3 border-b border-gray-50 dark:border-white/5 last:border-b-0 transition-colors ${
                    isMe
                      ? "bg-gray-50 dark:bg-white/4 font-semibold"
                      : "bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-[#161616]"
                  }`}
                >
                  <span className="font-mono text-sm text-gray-300 dark:text-white/20 text-center tabular-nums">
                    {rank}
                  </span>

                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      src={entry.avatar}
                      name={entry.displayName}
                      size={8}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-black dark:text-white truncate">
                        {entry.displayName}
                        {isMe && (
                          <span className="ml-1.5 font-mono text-[9px] px-1.5 py-0.5 bg-black dark:bg-white text-white dark:text-black align-middle">
                            you
                          </span>
                        )}
                      </p>
                      <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500 truncate">
                        @{entry.username}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-semibold text-sm text-black dark:text-white tabular-nums">
                      {entry.xp.toLocaleString()}
                    </span>
                    <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 ml-0.5">
                      XP
                    </span>
                  </div>

                  <div className="text-center hidden sm:flex items-center justify-center gap-1 font-mono text-xs text-gray-500 dark:text-gray-400">
                    <Code2 className="w-3 h-3 text-gray-300 dark:text-white/20" />
                    {entry.problemsSolved}
                  </div>

                  <div className="text-center hidden sm:flex items-center justify-center gap-1 font-mono text-xs text-gray-500 dark:text-gray-400">
                    <PlayCircle className="w-3 h-3 text-gray-300 dark:text-white/20" />
                    {entry.simulationsSolved}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {entries.length === 0 && (
          <div className="text-center py-20">
            <Medal className="w-10 h-10 text-gray-200 dark:text-white/10 mx-auto mb-3" />
            <p className="font-mono text-sm text-gray-400">
              No entries yet. Be the first!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
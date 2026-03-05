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
  { border: string; bg: string; badge: string; text: string }
> = {
  1: {
    border: "border-yellow-300",
    bg: "bg-yellow-50",
    badge: "bg-yellow-400 text-white",
    text: "text-yellow-600",
  },
  2: {
    border: "border-gray-300",
    bg: "bg-gray-50",
    badge: "bg-gray-400 text-white",
    text: "text-gray-500",
  },
  3: {
    border: "border-orange-300",
    bg: "bg-orange-50",
    badge: "bg-orange-400 text-white",
    text: "text-orange-500",
  },
};

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
        className={`${base} object-cover ring-2 ring-gray-200`}
      />
    );
  }
  return (
    <div
      className={`${base} bg-gray-900 flex items-center justify-center overflow-hidden ring-2 ring-gray-200`}
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
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-3">
        <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse mb-6" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="font-mono text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Leaderboard</h1>
        <p className="text-gray-600 font-mono text-xs tracking-wider">
          {entries.length} developers ranked by XP
        </p>
      </div>

      {/* XP legend */}
      <div className="flex flex-wrap gap-4 font-mono text-[11px] text-gray-400 border border-gray-200 rounded-lg px-4 py-3 bg-white mb-8">
        <span className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-yellow-400" /> Easy problem ={" "}
          <strong className="text-gray-700">10 XP</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-orange-400" /> Medium problem ={" "}
          <strong className="text-gray-700">25 XP</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-red-400" /> Hard problem ={" "}
          <strong className="text-gray-700">50 XP</strong>
        </span>
        <span className="text-gray-300">|</span>
        <span className="flex items-center gap-1.5">
          <PlayCircle className="w-3 h-3 text-blue-300" /> Easy sim ={" "}
          <strong className="text-gray-700">50 XP</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <PlayCircle className="w-3 h-3 text-blue-400" /> Medium sim ={" "}
          <strong className="text-gray-700">100 XP</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <PlayCircle className="w-3 h-3 text-blue-600" /> Hard sim ={" "}
          <strong className="text-gray-700">150 XP</strong>
        </span>
      </div>

      {/* Podium — top 3 */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {top3.map((entry, i) => {
            const rank = i + 1;
            const s = RANK_STYLES[rank];
            const isMe = entry.username === currentUsername;
            return (
              <div
                key={entry._id}
                className={`relative border ${s.border} ${s.bg} rounded-2xl p-5 flex flex-col items-center gap-2 text-center ${rank === 1 ? "sm:order-2" : rank === 2 ? "sm:order-1" : "sm:order-3"}`}
              >
                {isMe && (
                  <span className="absolute top-2 right-2 font-mono text-[9px] px-1.5 py-0.5 bg-black text-white rounded-full">
                    you
                  </span>
                )}
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${s.badge}`}
                >
                  {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                </span>
                <Avatar src={entry.avatar} name={entry.displayName} size={12} />
                <div>
                  <p className="font-bold text-black text-sm">
                    {entry.displayName}
                  </p>
                  <p className="font-mono text-[10px] text-gray-400">
                    @{entry.username}
                  </p>
                </div>
                <div className={`font-mono font-bold text-lg ${s.text}`}>
                  {entry.xp.toLocaleString()} XP
                </div>
                <div className="flex gap-3 font-mono text-[10px] text-gray-400">
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

      {/* Table — rank 4+ */}
      {rest.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          {/* Table header */}
          <div className="grid grid-cols-[48px_1fr_100px_80px_80px] items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <span className="font-mono text-[10px] text-gray-400 text-center">
              #
            </span>
            <span className="font-mono text-[10px] text-gray-400">
              Developer
            </span>
            <span className="font-mono text-[10px] text-gray-400 text-right">
              XP
            </span>
            <span className="font-mono text-[10px] text-gray-400 text-center hidden sm:block">
              Problems
            </span>
            <span className="font-mono text-[10px] text-gray-400 text-center hidden sm:block">
              Sims
            </span>
          </div>

          {rest.map((entry, i) => {
            const rank = i + 4;
            const isMe = entry.username === currentUsername;
            return (
              <div
                key={entry._id}
                className={`grid grid-cols-[48px_1fr_100px_80px_80px] items-center gap-2 px-4 py-3 border-b border-gray-50 last:border-b-0 transition-colors ${
                  isMe ? "bg-gray-50 font-semibold" : "hover:bg-gray-50/60"
                }`}
              >
                {/* Rank */}
                <span className="font-mono text-sm text-gray-400 text-center">
                  {rank}
                </span>

                {/* User */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    src={entry.avatar}
                    name={entry.displayName}
                    size={8}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-black truncate">
                      {entry.displayName}
                      {isMe && (
                        <span className="ml-1.5 font-mono text-[9px] px-1.5 py-0.5 bg-black text-white rounded-full align-middle">
                          you
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-[10px] text-gray-400 truncate">
                      @{entry.username}
                    </p>
                  </div>
                </div>

                {/* XP */}
                <div className="text-right">
                  <span className="font-mono font-semibold text-sm text-black">
                    {entry.xp.toLocaleString()}
                  </span>
                  <span className="font-mono text-[10px] text-gray-400 ml-0.5">
                    XP
                  </span>
                </div>

                {/* Problems */}
                <div className="text-center hidden sm:flex items-center justify-center gap-1 font-mono text-xs text-gray-500">
                  <Code2 className="w-3 h-3 text-gray-300" />
                  {entry.problemsSolved}
                </div>

                {/* Sims */}
                <div className="text-center hidden sm:flex items-center justify-center gap-1 font-mono text-xs text-gray-500">
                  <PlayCircle className="w-3 h-3 text-gray-300" />
                  {entry.simulationsSolved}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-20">
          <Medal className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="font-mono text-sm text-gray-400">
            No entries yet. Be the first!
          </p>
        </div>
      )}
    </div>
  );
}

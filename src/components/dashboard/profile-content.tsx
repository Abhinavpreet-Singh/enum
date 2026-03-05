"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import {
  ArrowLeft,
  Edit3,
  Github,
  Linkedin,
  Globe,
  Trophy,
  Code2,
  PlayCircle,
  CheckCircle,
  Star,
  Camera,
  ExternalLink,
  X,
  Save,
  GraduationCap,
  Building2,
  Zap,
  TrendingUp,
} from "lucide-react";

interface ProfileData {
  name: string;
  username: string;
  bio: string;
  college: string;
  role: string;
  links: { github: string; linkedin: string; website: string };
  avatar: string | null;
}

interface UserStats {
  totalProblems: number;
  totalSimulations: number;
  longestStreak: number;
  currentStreak: number;
  totalBugsFixed: number;
  globalRank: number | null;
}

function generateHeatmapData() {
  const weeks: number[][] = [];
  for (let w = 0; w < 52; w++) {
    const days: number[] = [];
    for (let d = 0; d < 7; d++) {
      const r = Math.random();
      if (r < 0.45) days.push(0);
      else if (r < 0.65) days.push(1);
      else if (r < 0.8) days.push(2);
      else if (r < 0.92) days.push(3);
      else days.push(4);
    }
    weeks.push(days);
  }
  return weeks;
}

function heatColor(level: number): string {
  switch (level) {
    case 0:
      return "bg-gray-100 border border-gray-200";
    case 1:
      return "bg-gray-300";
    case 2:
      return "bg-gray-500";
    case 3:
      return "bg-gray-700";
    case 4:
      return "bg-gray-900";
    default:
      return "bg-gray-100 border border-gray-200";
  }
}

const HEATMAP = generateHeatmapData();
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
];

const BADGES = [
  {
    id: 1,
    name: "First Blood",
    icon: "⚡",
    desc: "Solved first problem",
    unlocked: true,
  },
  {
    id: 2,
    name: "Week Warrior",
    icon: "📅",
    desc: "7-day streak maintained",
    unlocked: true,
  },
  {
    id: 3,
    name: "Bug Hunter",
    icon: "🐛",
    desc: "Fixed 10 production bugs",
    unlocked: true,
  },
  {
    id: 4,
    name: "Century",
    icon: "💯",
    desc: "Solved 100 problems",
    unlocked: false,
  },
  {
    id: 5,
    name: "Sim Master",
    icon: "🖥️",
    desc: "Completed 20 simulations",
    unlocked: false,
  },
  {
    id: 6,
    name: "Top 10",
    icon: "🏆",
    desc: "Ranked in global top 10",
    unlocked: false,
  },
];

const CERTS = [
  {
    name: "DSA Fundamentals",
    issuer: "Enum Platform",
    date: "Jan 2026",
    done: true,
  },
  {
    name: "System Debugging",
    issuer: "Enum Platform",
    date: "Feb 2026",
    done: true,
  },
  {
    name: "Production Mastery",
    issuer: "Enum Platform",
    date: "--",
    done: false,
  },
];

export default function ProfileContent() {
  const isAuthenticated = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);

  const [profile, setProfile] = useState<ProfileData>({
    name:
      typeof window !== "undefined"
        ? localStorage.getItem("Name") || "Guest"
        : "Guest",
    username:
      typeof window !== "undefined"
        ? localStorage.getItem("Name")?.toLowerCase().replace(/\s+/g, "") ||
          "guest"
        : "guest",
    bio: "",
    college: "",
    role: "Student",
    links: { github: "", linkedin: "", website: "" },
    avatar: null,
  });

  const [draft, setDraft] = useState<ProfileData>(profile);

  const [stats] = useState<UserStats>(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("userStats");
      if (s) {
        try {
          const p = JSON.parse(s);
          return {
            totalProblems: p.totalProblems ?? 0,
            totalSimulations: p.totalSimulations ?? 0,
            longestStreak: p.longestStreak ?? 69,
            currentStreak: p.currentStreak ?? 0,
            totalBugsFixed: p.totalBugsFixed ?? 0,
            globalRank: p.globalRank ?? null,
          };
        } catch {
          /* ignore */
        }
      }
    }
    return {
      totalProblems: 0,
      totalSimulations: 0,
      longestStreak: 69,
      currentStreak: 0,
      totalBugsFixed: 0,
      globalRank: null,
    };
  });

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDraft((d) => ({ ...d, avatar: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  }

  function saveProfile() {
    setProfile(draft);
    setEditing(false);
  }

  function cancelEdit() {
    setDraft(profile);
    setEditing(false);
  }

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] flex-col gap-3">
        <p className="text-gray-500 font-mono text-sm">
          Please sign in to view your profile.
        </p>
        <Link
          href="/login"
          className="font-mono text-xs px-4 py-2 bg-black text-white rounded-lg"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const avatarSrc = (editing ? draft.avatar : profile.avatar) ?? null;
  const displayProfile = editing ? draft : profile;

  return (
    <div className="relative min-h-screen">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right,#000 1px,transparent 1px),linear-gradient(to bottom,#000 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 pb-10">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors font-mono text-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          {!editing ? (
            <button
              onClick={() => {
                setDraft(profile);
                setEditing(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg font-mono text-xs text-gray-600 hover:border-black hover:text-black transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg font-mono text-xs text-gray-500 hover:border-black transition-all"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                onClick={saveProfile}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black rounded-lg font-mono text-xs text-white hover:bg-gray-800 transition-all"
              >
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          )}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* LEFT: Profile card */}
          <div className="space-y-4">
            {/* Identity card */}
            <div className="border border-gray-200 rounded-xl p-6 bg-white/90 backdrop-blur-sm space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="relative group"
                  onClick={() => editing && fileInputRef.current?.click()}
                  style={{ cursor: editing ? "pointer" : "default" }}
                >
                  <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center overflow-hidden ring-2 ring-gray-200 group-hover:ring-black transition-all">
                    {avatarSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarSrc}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-3xl font-bold select-none">
                        {displayProfile.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {editing && (
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  className="hidden"
                />

                {editing ? (
                  <div className="w-full space-y-2">
                    <input
                      className="w-full text-center font-bold text-black text-lg border-b border-gray-200 focus:border-black outline-none pb-0.5 bg-transparent"
                      value={draft.name}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, name: e.target.value }))
                      }
                      placeholder="Full name"
                    />
                    <input
                      className="w-full text-center font-mono text-sm text-gray-400 border-b border-gray-200 focus:border-black outline-none pb-0.5 bg-transparent"
                      value={draft.username}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, username: e.target.value }))
                      }
                      placeholder="username"
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-black">
                      {profile.name}
                    </h2>
                    <p className="font-mono text-sm text-gray-400">
                      @{profile.username}
                    </p>
                  </div>
                )}
              </div>

              {/* Role / College */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                {editing ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-300 shrink-0" />
                      <input
                        className="flex-1 font-mono text-xs border-b border-gray-200 focus:border-black outline-none pb-0.5 bg-transparent text-gray-700"
                        value={draft.role}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, role: e.target.value }))
                        }
                        placeholder="Role (e.g. Student, Developer)"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-gray-300 shrink-0" />
                      <input
                        className="flex-1 font-mono text-xs border-b border-gray-200 focus:border-black outline-none pb-0.5 bg-transparent text-gray-700"
                        value={draft.college}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, college: e.target.value }))
                        }
                        placeholder="College / Organization"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {profile.role && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-gray-300" />
                        <span className="font-mono text-xs text-gray-600">
                          {profile.role}
                        </span>
                      </div>
                    )}
                    {profile.college && (
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-gray-300" />
                        <span className="font-mono text-xs text-gray-600">
                          {profile.college}
                        </span>
                      </div>
                    )}
                    {!profile.role && !profile.college && (
                      <p className="font-mono text-xs text-gray-300 italic">
                        No details added
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Bio */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <p className="font-mono text-[10px] tracking-widest text-gray-400">
                  BIO
                </p>
                {editing ? (
                  <textarea
                    rows={3}
                    className="w-full font-mono text-xs text-gray-700 border border-gray-200 rounded-lg p-2.5 focus:border-black outline-none bg-transparent resize-none"
                    value={draft.bio}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, bio: e.target.value }))
                    }
                    placeholder="Write a short bio..."
                  />
                ) : (
                  <p className="font-mono text-xs text-gray-600 leading-relaxed">
                    {profile.bio || (
                      <span className="text-gray-300 italic">
                        No bio yet...
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Links */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <p className="font-mono text-[10px] tracking-widest text-gray-400">
                  LINKS
                </p>
                {editing ? (
                  <div className="space-y-2">
                    {(["github", "linkedin", "website"] as const).map((key) => {
                      const icons = {
                        github: Github,
                        linkedin: Linkedin,
                        website: Globe,
                      };
                      const Icon = icons[key];
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                          <input
                            className="flex-1 font-mono text-xs border-b border-gray-200 focus:border-black outline-none pb-0.5 bg-transparent text-gray-700"
                            value={draft.links[key]}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                links: { ...d.links, [key]: e.target.value },
                              }))
                            }
                            placeholder={
                              key.charAt(0).toUpperCase() +
                              key.slice(1) +
                              " URL"
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {profile.links.github && (
                      <a
                        href={profile.links.github}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-black transition-colors"
                      >
                        <Github className="w-3.5 h-3.5" /> GitHub{" "}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {profile.links.linkedin && (
                      <a
                        href={profile.links.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-black transition-colors"
                      >
                        <Linkedin className="w-3.5 h-3.5" /> LinkedIn{" "}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {profile.links.website && (
                      <a
                        href={profile.links.website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-black transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5" /> Website{" "}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {!profile.links.github &&
                      !profile.links.linkedin &&
                      !profile.links.website && (
                        <span className="font-mono text-xs text-gray-300 italic">
                          No links added
                        </span>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="border border-gray-200 rounded-xl p-5 bg-white/90 backdrop-blur-sm">
              <p className="font-mono text-[10px] tracking-widest text-gray-400 mb-3">
                BADGES
              </p>
              <div className="grid grid-cols-3 gap-2">
                {BADGES.map((b) => (
                  <div
                    key={b.id}
                    title={b.desc}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                      b.unlocked
                        ? "border-gray-200 bg-gray-50 hover:border-black"
                        : "border-gray-100 bg-gray-50/50 opacity-35 grayscale"
                    }`}
                  >
                    <span className="text-xl leading-none">{b.icon}</span>
                    <span className="font-mono text-[9px] text-gray-500 text-center leading-tight">
                      {b.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Stats, heatmap, achievements */}
          <div className="space-y-4">
            {/* Lifetime stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Problems Solved",
                  value: stats.totalProblems > 0 ? stats.totalProblems : "--",
                  icon: Code2,
                },
                {
                  label: "Simulations",
                  value:
                    stats.totalSimulations > 0 ? stats.totalSimulations : "--",
                  icon: PlayCircle,
                },
                {
                  label: "Longest Streak",
                  value:
                    stats.longestStreak > 0 ? `${stats.longestStreak}d` : "--",
                  icon: Trophy,
                },
                {
                  label: "Bugs Fixed",
                  value: stats.totalBugsFixed > 0 ? stats.totalBugsFixed : "--",
                  icon: CheckCircle,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="border border-gray-200 rounded-xl p-4 bg-white/90 backdrop-blur-sm hover:border-black transition-all"
                >
                  <Icon className="w-4 h-4 text-gray-300 mb-2" />
                  <p className="text-2xl font-bold text-black">{value}</p>
                  <p className="font-mono text-[11px] text-gray-400 mt-0.5">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* Skill Breakdown */}
            <div className="border border-gray-200 rounded-xl p-5 bg-white/90 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="font-mono text-[10px] tracking-widest text-gray-400">
                  SKILL BREAKDOWN
                </p>
                <TrendingUp className="w-4 h-4 text-gray-300" />
              </div>
              <div className="space-y-3">
                {[
                  { skill: "Arrays & Strings", val: 72 },
                  { skill: "Trees & Graphs", val: 45 },
                  { skill: "Dynamic Programming", val: 28 },
                  { skill: "System Debugging", val: 83 },
                  { skill: "Frontend Simulation", val: 60 },
                ].map(({ skill, val }) => (
                  <div key={skill}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[11px] text-gray-600">
                        {skill}
                      </span>
                      <span className="font-mono text-[10px] text-gray-400">
                        {val}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 rounded-full"
                        style={{ width: `${val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Streak Heatmap */}
            <div className="border border-gray-200 rounded-xl p-5 bg-white/90 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-mono text-[10px] tracking-widest text-gray-400">
                    ACTIVITY HEATMAP
                  </p>
                  <p className="text-sm font-bold text-black mt-0.5">
                    {stats.currentStreak > 0
                      ? `${stats.currentStreak}-day current streak`
                      : "Start your streak today"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-gray-400">
                    Less
                  </span>
                  {[0, 1, 2, 3, 4].map((l) => (
                    <div
                      key={l}
                      className={`w-3 h-3 rounded-sm ${heatColor(l)}`}
                    />
                  ))}
                  <span className="font-mono text-[10px] text-gray-400">
                    More
                  </span>
                </div>
              </div>

              <div
                className="overflow-x-auto"
                style={{ scrollbarWidth: "none" }}
              >
                <div style={{ minWidth: 640 }}>
                  {/* Month labels */}
                  <div className="flex gap-px mb-1 pl-8">
                    {MONTHS.map((m, i) => (
                      <div
                        key={i}
                        className="font-mono text-[9px] text-gray-400"
                        style={{ width: "56.5px" }}
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-px">
                    {/* Day labels */}
                    <div className="flex flex-col gap-px mr-1">
                      {DAYS.map((d, i) => (
                        <div
                          key={d}
                          className="font-mono text-[9px] text-gray-400 h-3 flex items-center"
                          style={{ width: 28, opacity: i % 2 === 1 ? 1 : 0 }}
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                    {/* Cells */}
                    {HEATMAP.map((week, wi) => (
                      <div key={wi} className="flex flex-col gap-px">
                        {week.map((level, di) => (
                          <div
                            key={di}
                            title={`${level} problem${level !== 1 ? "s" : ""}`}
                            className={`w-3 h-3 rounded-sm ${heatColor(level)} hover:ring-1 hover:ring-gray-400 cursor-default`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* XP & Badges */}
            <div className="border border-gray-200 rounded-xl p-5 bg-white/90 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-mono text-[10px] tracking-widest text-gray-400">
                    XP & LEVEL
                  </p>
                  <div className="flex items-center gap-2.5 mt-1.5">
                    <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-white font-mono text-sm font-bold">
                        7
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-black text-sm leading-tight">
                        Level 7
                      </p>
                      <p className="font-mono text-[10px] text-gray-400">
                        Incident Debugger
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-black">
                    2,450 XP
                  </p>
                  <p className="font-mono text-[10px] text-gray-400">
                    550 to Level 8
                  </p>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-gray-900 rounded-full"
                  style={{ width: "82%" }}
                />
              </div>
              <div className="flex justify-between mb-4">
                <span className="font-mono text-[9px] text-gray-400">L7</span>
                <span className="font-mono text-[9px] text-gray-400">
                  L8 · 3,000 XP
                </span>
              </div>

              {/* Badges row */}
              <p className="font-mono text-[10px] tracking-widest text-gray-400 mb-3">
                BADGES
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {BADGES.map((b) => (
                  <div
                    key={b.id}
                    title={b.unlocked ? b.desc : `Locked: ${b.desc}`}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all ${
                      b.unlocked
                        ? "border-gray-200 bg-gray-50 hover:border-black"
                        : "border-gray-100 bg-gray-50/50 opacity-30 grayscale"
                    }`}
                  >
                    <span className="text-xl leading-none">{b.icon}</span>
                    <span className="font-mono text-[9px] text-gray-500 text-center leading-tight">
                      {b.name}
                    </span>
                    {b.unlocked && (
                      <span className="font-mono text-[8px] text-gray-400">
                        +50 XP
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements + Certifications */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-xl p-5 bg-white/90 backdrop-blur-sm">
                <p className="font-mono text-[10px] tracking-widest text-gray-400 mb-3">
                  ACHIEVEMENTS
                </p>
                <div className="space-y-2.5">
                  {[
                    { title: "First Problem Solved", done: true },
                    { title: "7-Day Streak Maintained", done: true },
                    { title: "10 Simulations Completed", done: false },
                    { title: "Top 100 Global Rank", done: false },
                  ].map((a, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${a.done ? "bg-gray-900" : "bg-gray-100"}`}
                      >
                        {a.done ? (
                          <CheckCircle className="w-3 h-3 text-white" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                        )}
                      </div>
                      <span
                        className={`font-mono text-xs ${a.done ? "text-gray-800" : "text-gray-400"}`}
                      >
                        {a.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-5 bg-white/90 backdrop-blur-sm">
                <p className="font-mono text-[10px] tracking-widest text-gray-400 mb-3">
                  CERTIFICATIONS
                </p>
                <div className="space-y-3">
                  {CERTS.map((c, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 ${!c.done ? "opacity-40" : ""}`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${c.done ? "bg-gray-900" : "border border-gray-200"}`}
                      >
                        <Star
                          className={`w-3 h-3 ${c.done ? "text-white" : "text-gray-300"}`}
                        />
                      </div>
                      <div>
                        <p className="font-mono text-xs text-gray-800 font-medium">
                          {c.name}
                        </p>
                        <p className="font-mono text-[10px] text-gray-400">
                          {c.issuer} · {c.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Global rank banner */}
            <div className="border border-gray-900 rounded-xl p-5 bg-gray-950 text-white flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] tracking-widest text-gray-400 mb-1">
                  GLOBAL RANK
                </p>
                <p className="text-3xl font-bold">
                  {stats.globalRank ? `#${stats.globalRank}` : "--"}
                </p>
                <p className="font-mono text-xs text-gray-500 mt-1">
                  Compete more to climb the leaderboard
                </p>
              </div>
              <Trophy className="w-10 h-10 text-gray-700" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

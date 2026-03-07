"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { proxy } from "@/app/proxy";
import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import {
  Edit3,
  Github,
  Linkedin,
  Globe,
  Trophy,
  Code2,
  PlayCircle,
  Star,
  Camera,
  ExternalLink,
  X,
  Save,
  GraduationCap,
  Building2,
  Plus,
  Trash2,
  MapPin,
  Mail,
  FileText,
  Flame,
} from "lucide-react";

interface ProfileData {
  name: string;
  bio: string;
  college: string;
  role: string;
  location: string;
  resume: string;
  skills: string[];
  links: { github: string; linkedin: string; website: string };
  avatar: string | null;
}

interface Cert {
  name: string;
  issuer: string;
  date: string;
  done: boolean;
}

interface UserStats {
  totalProblems: number;
  totalSimulations: number;
  longestStreak: number;
  currentStreak: number;
  globalRank: number | null;
}

interface LeaderboardEntry {
  username: string;
  problemsSolved: number;
  simulationsSolved: number;
}

// Returns "YYYY-MM-DD" in the user's LOCAL timezone (not UTC)
function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface HeatCell {
  date: string;   // "YYYY-MM-DD" local timezone
  level: number;  // 0-4 intensity
  count: number;  // total submissions that day
}

// Builds 52-week grid anchored on Sunday, using total submissions for intensity
function generateHeatmapCells(submissionsMap: Map<string, number>): HeatCell[][] {
  const weeks: HeatCell[][] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(start.getDate() - 52 * 7);
  start.setDate(start.getDate() - start.getDay()); // snap to Sunday

  const cur = new Date(start);
  while (cur <= today) {
    const week: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = localDateStr(cur);
      const count = cur > today ? 0 : (submissionsMap.get(dateStr) ?? 0);
      const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4;
      week.push({ date: dateStr, level, count });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// Returns label + column index of the week that CONTAINS the 1st of each month
// Pixel constants shared between label positions and cell column margins
const CELL_W = 11;   // w-2.75
const COL_GAP = 3;   // gap-0.75
const DAY_W = 28;    // day-label column width
const MONTH_EXTRA = 9; // extra px added at each month boundary

// Returns { label, left } where left is the precise pixel offset for each month label.
// Labels are anchored to the first week-column that *starts* in that month (the same
// column that receives the boundary gap), so the label always sits right after its gap.
function computeMonthLabelPositions(cells: HeatCell[][]): { label: string; left: number }[] {
  const result: { label: string; left: number }[] = [];
  let extraAcc = 0;

  cells.forEach((week, wi) => {
    const firstDay = new Date(week[0].date + "T00:00:00");
    const isNewMonth =
      wi > 0 &&
      firstDay.getMonth() !== new Date(cells[wi - 1][0].date + "T00:00:00").getMonth();

    if (isNewMonth) {
      extraAcc += MONTH_EXTRA;
      // left = day-label + first gap + col * (cell + gap) + accumulated extras
      // This matches exactly the DOM left edge of column wi.
      const left = DAY_W + COL_GAP + wi * (CELL_W + COL_GAP) + extraAcc;
      result.push({ label: firstDay.toLocaleString("default", { month: "short" }), left });
    }
  });
  return result;
}

function calculateStreak(activityMap: Map<string, number>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let currentStreakCaptured = false;

  // Walk from today (i=0) backwards to 365 days ago
  for (let i = 0; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = localDateStr(d); // local timezone, not UTC
    const count = activityMap.get(dateStr) ?? 0;

    if (count > 0) {
      tempStreak++;
    } else {
      // First gap we hit going backward = end of current streak
      if (!currentStreakCaptured) {
        currentStreak = tempStreak;
        currentStreakCaptured = true;
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      tempStreak = 0;
    }
  }

  // Finalize if the whole 365-day window was active
  if (tempStreak > longestStreak) longestStreak = tempStreak;
  if (!currentStreakCaptured) currentStreak = tempStreak;

  return { currentStreak, longestStreak };
}

function generateStreakBadges(currentStreak: number) {
  const milestones = [1, 7, 25, 50, 100, 200, 365];
  return milestones.map((day) => ({
    day,
    label: day === 1 ? "Day 1" : day === 7 ? "Day 7" : `Day ${day}`,
    unlocked: currentStreak >= day,
  }));
}

// Black & white contribution colors
function heatColor(level: number): string {
  switch (level) {
    case 0:  return "bg-[#ebebeb] dark:bg-[#1e1e1e]";
    case 1:  return "bg-[#c0c0c0] dark:bg-[#404040]";
    case 2:  return "bg-[#888888] dark:bg-[#707070]";
    case 3:  return "bg-[#4a4a4a] dark:bg-[#a0a0a0]";
    case 4:  return "bg-[#1a1a1a] dark:bg-[#d8d8d8]";
    default: return "bg-[#ebebeb] dark:bg-[#1e1e1e]";
  }
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ProfileContent() {
  const isAuthenticated = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // null = no section editing; string = which section is being edited
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");

  const registeredUsername =
    typeof window !== "undefined"
      ? localStorage.getItem("Name") || "guest"
      : "guest";

  const [fetchedEmail, setFetchedEmail] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    axios
      .get(`${proxy}/api/v1/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data = res?.data?.data;
        if (!data) return;
        if (data.email) setFetchedEmail(data.email);
        setProfile((p) => ({
          ...p,
          name:
            data.displayName ||
            localStorage.getItem("displayName") ||
            localStorage.getItem("Name") ||
            "Guest",
          bio: data.bio || "",
          college: data.college || "",
          role: data.role || "Student",
          location: data.location || "",
          resume: data.resume || "",
          skills: data.skills || [],
          links: {
            github: data.links?.github || "",
            linkedin: data.links?.linkedin || "",
            website: data.links?.website || "",
          },
          // Use Cloudinary URL if present, fall back to localStorage cache
          avatar: data.avatar || localStorage.getItem("userAvatar") || null,
        }));
        // Keep localStorage in sync so sidebar + dashboard update immediately
        if (data.displayName) {
          localStorage.setItem("displayName", data.displayName);
          window.dispatchEvent(
            new CustomEvent("userNameChanged", { detail: data.displayName }),
          );
        }
        if (data.avatar) {
          localStorage.setItem("userAvatar", data.avatar);
          window.dispatchEvent(new Event("userAvatarChanged"));
        }
        if (data.certs && data.certs.length > 0) {
          setCerts(data.certs);
        }
      })
      .catch(() => {});
  }, []);

  const [profile, setProfile] = useState<ProfileData>(() => ({
    name:
      typeof window !== "undefined"
        ? localStorage.getItem("displayName") ||
          localStorage.getItem("Name") ||
          "Guest"
        : "Guest",
    bio: "",
    college: "",
    role: "Student",
    location: "",
    resume: "",
    skills: [],
    links: { github: "", linkedin: "", website: "" },
    avatar:
      typeof window !== "undefined"
        ? localStorage.getItem("userAvatar") || null
        : null,
  }));

  const [draft, setDraft] = useState<ProfileData>(profile);

  // Keep draft in sync when profile loaded from localStorage
  useEffect(() => {
    setDraft(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [newSkill, setNewSkill] = useState("");

  const [certs, setCerts] = useState<Cert[]>([
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
  ]);
  const [addingCert, setAddingCert] = useState(false);
  const [newCert, setNewCert] = useState({ name: "", issuer: "", date: "" });

  const [stats, setStats] = useState<UserStats>(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("userStats");
      if (s) {
        try {
          const p = JSON.parse(s);
          return {
            totalProblems: p.totalProblems ?? 0,
            totalSimulations: p.totalSimulations ?? 0,
            longestStreak: p.longestStreak ?? 0,
            currentStreak: p.currentStreak ?? 0,
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
      longestStreak: 0,
      currentStreak: 0,
      globalRank: null,
    };
  });

  const [heatmapCells, setHeatmapCells] = useState<HeatCell[][]>([]);
  const [totalSubmissionsYear, setTotalSubmissionsYear] = useState(0);
  const [totalActiveDays, setTotalActiveDays] = useState(0);
  const [streakBadges, setStreakBadges] = useState<Array<{ day: number; label: string; unlocked: boolean }>>(
    generateStreakBadges(0)
  );
  const [lastLoginDate, setLastLoginDate] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("lastLoginDate") || "" : ""
  );

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    // Track daily login
    const today = new Date().toISOString().split('T')[0];
    const storedLastLogin = localStorage.getItem("lastLoginDate") || "";
    if (storedLastLogin !== today) {
      localStorage.setItem("lastLoginDate", today);
      setLastLoginDate(today);
    }

    // Fetch leaderboard + submissions in parallel so setStats is called ONCE
    // with all fields merged — eliminates the race condition where two separate
    // setStats calls overwrite each other's data in localStorage.
    Promise.all([
      axios.get(`${proxy}/api/v1/users/leaderboard`).catch(() => null),
      token
        ? fetch("/api/submissions/recent", {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => r.json())
            .catch(() => null)
        : Promise.resolve(null),
    ]).then(([lbRes, subData]) => {
      // ── Leaderboard data ──────────────────────────────
      const lb: LeaderboardEntry[] = lbRes?.data?.data ?? [];
      const idx = lb.findIndex((e) => e.username === registeredUsername);
      const lbEntry = idx !== -1 ? lb[idx] : null;

      // ── Submissions → two maps ─────────────────────────────────────────
      // allSubmissionsMap  → ALL submissions per day  (drives heatmap color)
      // activityMap        → days with ACCEPTED submissions (drives streak)
      const submissions: any[] = subData?.data ?? [];
      const allSubmissionsMap = new Map<string, number>();
      const acceptedByDate = new Map<string, Set<string>>();

      submissions.forEach((sub) => {
        if (!sub.createdAt) return;
        const date = localDateStr(new Date(sub.createdAt));
        // Every submission counts for heatmap intensity
        allSubmissionsMap.set(date, (allSubmissionsMap.get(date) ?? 0) + 1);
        // Accepted-only for streak
        const isAccepted = sub.verdict?.toLowerCase() === "accepted";
        const uniqueKey = sub.question?._id || sub._id;
        if (isAccepted) {
          if (!acceptedByDate.has(date)) acceptedByDate.set(date, new Set());
          acceptedByDate.get(date)!.add(uniqueKey);
        }
      });

      const activityMap = new Map<string, number>();
      acceptedByDate.forEach((problems, date) => activityMap.set(date, problems.size));

      // Total submissions in the past year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      oneYearAgo.setHours(0, 0, 0, 0);
      let subsThisYear = 0;
      allSubmissionsMap.forEach((count, date) => {
        if (new Date(date + "T00:00:00") >= oneYearAgo) subsThisYear += count;
      });

      // ── Heatmap + streaks ─────────────────────────────
      setHeatmapCells(generateHeatmapCells(allSubmissionsMap));
      setTotalSubmissionsYear(subsThisYear);
      setTotalActiveDays(activityMap.size);
      const { currentStreak, longestStreak } = calculateStreak(activityMap);
      setStreakBadges(generateStreakBadges(currentStreak));

      // ── Single setStats call — no race condition ──────
      setStats((prev) => {
        const next: UserStats = {
          ...prev,
          ...(lbEntry && {
            totalProblems: lbEntry.problemsSolved,
            totalSimulations: lbEntry.simulationsSolved,
            globalRank: idx + 1,
          }),
          currentStreak,
          longestStreak,
        };
        localStorage.setItem("userStats", JSON.stringify(next));
        return next;
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registeredUsername]);

  async function persistProfile(data: ProfileData) {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      await axios.put(
        `${proxy}/api/v1/users/profile`,
        {
          displayName: data.name,
          bio: data.bio,
          college: data.college,
          role: data.role,
          location: data.location,
          resume: data.resume,
          skills: data.skills,
          links: data.links,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch {
      /* silently fail */
    }
  }

  async function persistCerts(updatedCerts: Cert[]) {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      await axios.put(
        `${proxy}/api/v1/users/profile`,
        { certs: updatedCerts },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch {
      /* silently fail */
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optimistic local preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setProfile((p) => ({ ...p, avatar: src }));
      setDraft((d) => ({ ...d, avatar: src }));
      localStorage.setItem("userAvatar", src);
      window.dispatchEvent(new Event("userAvatarChanged"));
    };
    reader.readAsDataURL(file);

    // Upload to Cloudinary via backend
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    const formData = new FormData();
    formData.append("avatar", file);
    axios
      .post(`${proxy}/api/v1/users/avatar`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const url = res?.data?.data?.avatar;
        if (url) {
          setProfile((p) => ({ ...p, avatar: url }));
          setDraft((d) => ({ ...d, avatar: url }));
          localStorage.setItem("userAvatar", url);
          window.dispatchEvent(new Event("userAvatarChanged"));
        }
      })
      .catch(() => {});
  }

  function startEdit(section: string) {
    setDraft({ ...profile });
    setEditingSection(section);
  }

  function saveSection() {
    setProfile(draft);
    setEditingSection(null);
    persistProfile(draft);
  }

  function cancelSection() {
    setDraft(profile);
    setEditingSection(null);
  }

  function saveName(n: string) {
    const trimmed = n.trim();
    if (!trimmed) return;
    setProfile((p) => ({ ...p, name: trimmed }));
    setDraft((d) => ({ ...d, name: trimmed }));
    localStorage.setItem("displayName", trimmed);
    window.dispatchEvent(
      new CustomEvent("userNameChanged", { detail: trimmed }),
    );
    persistProfile({ ...profile, name: trimmed });
    setEditingName(false);
  }

  function addSkill() {
    const s = newSkill.trim();
    if (!s || profile.skills.includes(s)) return;
    const newSkills = [...profile.skills, s];
    setProfile((p) => ({ ...p, skills: newSkills }));
    persistProfile({ ...profile, skills: newSkills });
    setNewSkill("");
  }

  function removeSkill(skill: string) {
    const newSkills = profile.skills.filter((x) => x !== skill);
    setProfile((p) => ({ ...p, skills: newSkills }));
    persistProfile({ ...profile, skills: newSkills });
  }

  function submitCert() {
    if (!newCert.name.trim()) return;
    const updated = [...certs, { ...newCert, done: false }];
    setCerts(updated);
    persistCerts(updated);
    setNewCert({ name: "", issuer: "", date: "" });
    setAddingCert(false);
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

  const avatarSrc = profile.avatar ?? null;

  function SectionEditBar({ section }: { section: string }) {
    return editingSection === section ? (
      <div className="flex gap-1.5">
        <button
          onClick={cancelSection}
          className="flex items-center gap-1 px-2 py-1 border border-gray-200 dark:border-white/10 font-mono text-[10px] text-gray-500 dark:text-gray-400 hover:border-black dark:hover:border-white transition-all"
        >
          <X className="w-3 h-3" /> Cancel
        </button>
        <button
          onClick={saveSection}
          className="flex items-center gap-1 px-2 py-1 bg-black dark:bg-white dark:text-black font-mono text-[10px] text-white hover:bg-gray-800 dark:hover:bg-white/90 transition-all"
        >
          <Save className="w-3 h-3" /> Save
        </button>
      </div>
    ) : (
      <button
        onClick={() => startEdit(section)}
        className="w-5 h-5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-all"
      >
        <Edit3 className="w-3 h-3" />
      </button>
    );
  }

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
        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* LEFT: Profile card */}
          <div className="space-y-4">
            {/* Identity card */}
            <div className="border border-gray-200 dark:border-white/8 p-6 bg-white/90 dark:bg-[#111] space-y-4">
              {/* Avatar — always clickable */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center overflow-hidden ring-2 ring-gray-200 dark:ring-white/10 group-hover:ring-black dark:group-hover:ring-white transition-all">
                    {avatarSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarSrc}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-3xl font-bold select-none">
                        {profile.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  className="hidden"
                />

                {/* Name + username + email (read-only) */}
                <div className="text-center">
                  {editingName ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <input
                        autoFocus
                        className="text-center text-xl font-bold text-black dark:text-white border-b-2 border-black dark:border-white outline-none bg-transparent w-40"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveName(draftName);
                          if (e.key === "Escape") setEditingName(false);
                        }}
                      />
                      <button
                        onClick={() => saveName(draftName)}
                        className="p-0.5 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-white/90 transition-colors"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingName(false)}
                        className="p-0.5 border border-gray-300 dark:border-white/15 text-gray-500 dark:text-gray-400 hover:border-black dark:hover:border-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative inline-flex items-center justify-center group">
                      <h2 className="text-xl font-bold text-black dark:text-white">
                        {profile.name}
                      </h2>
                      <button
                        onClick={() => {
                          setDraftName(profile.name);
                          setEditingName(true);
                        }}
                        className="absolute -right-6 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <p className="font-mono text-xs text-gray-500 mt-0.5">
                    @{registeredUsername}
                  </p>
                  {fetchedEmail && (
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Mail className="w-3 h-3 text-gray-300" />
                      <span className="font-mono text-xs text-gray-400">
                        {fetchedEmail}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ABOUT — role, college, location */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/8">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] tracking-widest text-gray-400">
                    ABOUT
                  </p>
                  <SectionEditBar section="identity" />
                </div>
                {editingSection === "identity" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-300 shrink-0" />
                      <input
                        className="flex-1 font-mono text-xs border-b border-gray-200 dark:border-white/10 focus:border-black dark:focus:border-white outline-none pb-0.5 bg-transparent text-gray-700 dark:text-gray-200"
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
                        className="flex-1 font-mono text-xs border-b border-gray-200 dark:border-white/10 focus:border-black dark:focus:border-white outline-none pb-0.5 bg-transparent text-gray-700 dark:text-gray-200"
                        value={draft.college}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, college: e.target.value }))
                        }
                        placeholder="College / Organization"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-300 shrink-0" />
                      <input
                        className="flex-1 font-mono text-xs border-b border-gray-200 dark:border-white/10 focus:border-black dark:focus:border-white outline-none pb-0.5 bg-transparent text-gray-700 dark:text-gray-200"
                        value={draft.location}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, location: e.target.value }))
                        }
                        placeholder="City, Country"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {profile.role && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-gray-300" />
                        <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
                          {profile.role}
                        </span>
                      </div>
                    )}
                    {profile.college && (
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-gray-300" />
                        <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
                          {profile.college}
                        </span>
                      </div>
                    )}
                    {profile.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-300" />
                        <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
                          {profile.location}
                        </span>
                      </div>
                    )}
                    {!profile.role && !profile.college && !profile.location && (
                      <p className="font-mono text-xs text-gray-300 italic">
                        No details added
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* BIO */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-white/8">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] tracking-widest text-gray-400">
                    BIO
                  </p>
                  <SectionEditBar section="bio" />
                </div>
                {editingSection === "bio" ? (
                  <textarea
                    rows={3}
                    className="w-full font-mono text-xs text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 p-2.5 focus:border-black dark:focus:border-white outline-none bg-transparent dark:bg-transparent resize-none"
                    value={draft.bio}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, bio: e.target.value }))
                    }
                    placeholder="Write a short bio..."
                  />
                ) : (
                  <p className="font-mono text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {profile.bio || (
                      <span className="text-gray-300 italic">
                        No bio yet...
                      </span>
                    )}
                  </p>
                )}
              </div>
              {/* SKILLS — always inline editable */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/8">
                <p className="font-mono text-[10px] tracking-widest text-gray-400">
                  SKILLS
                </p>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {profile.skills.map((sk) => (
                    <span
                      key={sk}
                      className="flex items-center gap-1 px-2 py-0.5 bg-gray-900 text-white font-mono text-[10px] rounded-md"
                    >
                      {sk}
                      <button
                        onClick={() => removeSkill(sk)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    className="flex-1 font-mono text-xs border-b border-gray-200 dark:border-white/10 focus:border-black dark:focus:border-white outline-none pb-0.5 bg-transparent text-gray-700 dark:text-gray-200"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSkill()}
                    placeholder="Add a skill..."
                  />
                  <button
                    onClick={addSkill}
                    className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {/* LINKS + RESUME */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/8">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] tracking-widest text-gray-400">
                    LINKS
                  </p>
                  <SectionEditBar section="links" />
                </div>
                {editingSection === "links" ? (
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
                            className="flex-1 font-mono text-xs border-b border-gray-200 dark:border-white/10 focus:border-black dark:focus:border-white outline-none pb-0.5 bg-transparent text-gray-700 dark:text-gray-200"
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
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      <input
                        className="flex-1 font-mono text-xs border-b border-gray-200 dark:border-white/10 focus:border-black dark:focus:border-white outline-none pb-0.5 bg-transparent text-gray-700 dark:text-gray-200"
                        value={draft.resume}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, resume: e.target.value }))
                        }
                        placeholder="Resume URL or Google Drive link"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {profile.links.github && (
                      <a
                        href={profile.links.github}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors"
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
                        className="flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors"
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
                        className="flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5" /> Website{" "}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {profile.resume && (
                      <a
                        href={profile.resume}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" /> Resume{" "}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {!profile.links.github &&
                      !profile.links.linkedin &&
                      !profile.links.website &&
                      !profile.resume && (
                        <span className="font-mono text-xs text-gray-300 italic">
                          No links added
                        </span>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Certifications */}
            <div className="border border-gray-200 dark:border-white/8 p-5 bg-white/90 dark:bg-[#111]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Star className="w-3 h-3 text-gray-400" />
                  <p className="font-mono text-[10px] tracking-widest text-gray-400">
                    CERTIFICATIONS
                  </p>
                </div>
                <button
                  onClick={() => setAddingCert(true)}
                  className="w-5 h-5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-all"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2.5">
                {certs.map((c, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 group ${!c.done ? "opacity-50" : ""}`}
                  >
                    <div
                      className={`w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 ${c.done ? "bg-gray-900 dark:bg-white" : "border border-gray-200 dark:border-white/10"}`}
                    >
                      <Star
                        className={`w-3 h-3 ${c.done ? "text-white dark:text-black" : "text-gray-300"}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-gray-800 dark:text-white font-medium truncate">
                        {c.name}
                      </p>
                      <p className="font-mono text-[10px] text-gray-400">
                        {c.issuer} · {c.date}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const updated = certs.filter((_, j) => j !== i);
                        setCerts(updated);
                        persistCerts(updated);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-black dark:hover:text-white transition-all mt-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {addingCert && (
                  <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/8">
                    <input
                      autoFocus
                      className="w-full font-mono text-xs border-b border-gray-200 dark:border-white/10 focus:border-black dark:focus:border-white outline-none pb-0.5 bg-transparent text-gray-700 dark:text-gray-200"
                      value={newCert.name}
                      onChange={(e) =>
                        setNewCert((c) => ({ ...c, name: e.target.value }))
                      }
                      placeholder="Certificate name"
                    />
                    <input
                      className="w-full font-mono text-xs border-b border-gray-200 dark:border-white/10 focus:border-black dark:focus:border-white outline-none pb-0.5 bg-transparent text-gray-700 dark:text-gray-200"
                      value={newCert.issuer}
                      onChange={(e) =>
                        setNewCert((c) => ({ ...c, issuer: e.target.value }))
                      }
                      placeholder="Issuer"
                    />
                    <input
                      className="w-full font-mono text-xs border-b border-gray-200 dark:border-white/10 focus:border-black dark:focus:border-white outline-none pb-0.5 bg-transparent text-gray-700 dark:text-gray-200"
                      value={newCert.date}
                      onChange={(e) =>
                        setNewCert((c) => ({ ...c, date: e.target.value }))
                      }
                      placeholder="Date (e.g. Mar 2026)"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={submitCert}
                        className="flex-1 font-mono text-[11px] py-1 bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-white/90 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setAddingCert(false)}
                        className="flex-1 font-mono text-[11px] py-1 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-black dark:hover:border-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
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
                  label: "Max Streak",
                  value:
                    stats.longestStreak > 0 ? `${stats.longestStreak}d` : "--",
                  icon: Star,
                },
                {
                  label: "Global Rank",
                  value: stats.globalRank ? `#${stats.globalRank}` : "--",
                  icon: Trophy,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="border border-gray-200 dark:border-white/8 p-4 bg-white/90 dark:bg-[#111] hover:border-black dark:hover:border-white/20 transition-all"
                >
                  <Icon className="w-4 h-4 text-gray-300 mb-2" />
                  <p className="text-2xl font-bold text-black dark:text-white">
                    {value}
                  </p>
                  <p className="font-mono text-[11px] text-gray-400 mt-0.5">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* Activity Heatmap — LeetCode style */}
            <div className="border border-gray-200 dark:border-[#21262d] bg-white dark:bg-[#0d1117]">
              {/* ── Header bar ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-gray-100 dark:border-[#21262d]">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-black dark:text-white text-base">
                    {heatmapCells.length > 0 ? totalSubmissionsYear : "--"}
                  </span>{" "}
                  submissions in the past one year
                  <span
                    className="ml-1.5 text-gray-400 cursor-default select-none"
                    title="Cell intensity = all submissions that day. Streak = consecutive days with at least one accepted solution."
                  >
                    ⓘ
                  </span>
                </p>
                <div className="flex items-center gap-5 text-[11px] font-mono text-gray-500 dark:text-gray-400 flex-wrap">
                  <span>
                    Total active days:{" "}
                    <span className="font-bold text-black dark:text-white">{totalActiveDays}</span>
                  </span>
                  <span>
                    Max streak:{" "}
                    <span className="font-bold text-black dark:text-white">{stats.longestStreak}</span>
                  </span>
                </div>
              </div>

              {/* ── Grid ── */}
              <div className="px-5 py-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {heatmapCells.length > 0 ? (
                  <div style={{ minWidth: 700 }}>
                    {/* Month labels — absolutely positioned, left values include accumulated month-boundary extra gaps */}
                    <div className="relative mb-1" style={{ height: 16 }}>
                      {computeMonthLabelPositions(heatmapCells).map(({ label, left }) => (
                        <span
                          key={`${label}-${left}`}
                          className="absolute font-mono text-[10px] text-gray-400 dark:text-gray-500"
                          style={{ left, whiteSpace: "nowrap" }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>

                    <div className="flex">
                      {/* Day labels — Mon / Wed / Fri visible, others hidden */}
                      <div className="flex flex-col gap-0.75 shrink-0" style={{ width: DAY_W }}>
                        {DAYS.map((d, i) => (
                          <div
                            key={d}
                            className="font-mono text-[10px] text-gray-400 dark:text-gray-500 flex items-center"
                            style={{ height: CELL_W, opacity: i === 1 || i === 3 || i === 5 ? 1 : 0 }}
                          >
                            {d}
                          </div>
                        ))}
                      </div>

                      {/* Cell columns — extra marginLeft at every month boundary */}
                      {heatmapCells.map((week, wi) => {
                        const isNewMonth =
                          wi > 0 &&
                          new Date(week[0].date + "T00:00:00").getMonth() !==
                            new Date(heatmapCells[wi - 1][0].date + "T00:00:00").getMonth();
                        return (
                          <div
                            key={wi}
                            className="flex flex-col gap-0.75"
                            style={{ marginLeft: isNewMonth ? COL_GAP + MONTH_EXTRA : COL_GAP }}
                          >
                            {week.map((cell, di) => {
                              const d = new Date(cell.date + "T00:00:00");
                              const dateLabel = d.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              });
                              const tipText =
                                cell.count > 0
                                  ? `${cell.count} submission${cell.count !== 1 ? "s" : ""} on ${dateLabel}`
                                  : `No submissions on ${dateLabel}`;
                              return (
                                <div
                                  key={di}
                                  title={tipText}
                                  className={`w-2.75 h-2.75 rounded-xs cursor-default transition-opacity hover:opacity-75 ${heatColor(cell.level)}`}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-end gap-1.5 mt-3">
                      <span className="font-mono text-[10px] text-gray-400">Less</span>
                      {[0, 1, 2, 3, 4].map((l) => (
                        <div key={l} className={`w-2.75 h-2.75 rounded-xs ${heatColor(l)}`} />
                      ))}
                      <span className="font-mono text-[10px] text-gray-400">More</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-xs font-mono py-6 text-center">
                    Loading activity...
                  </div>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="border border-gray-200 dark:border-white/8 p-5 bg-white/90 dark:bg-[#111] space-y-5">
              {/* ── Streak track ── */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <p className="font-mono text-[10px] tracking-widest text-gray-400">
                    STREAK MILESTONES
                  </p>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {streakBadges.map(({ day, label, unlocked }) => (
                    <div
                      key={day}
                      className={`group flex flex-col items-center gap-2 p-3 border transition-all duration-200 cursor-default ${
                        unlocked
                          ? "border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/15 hover:border-orange-300 dark:hover:border-orange-500/50"
                          : "border-gray-100 dark:border-white/6 bg-gray-50 dark:bg-white/3 opacity-40"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 flex items-center justify-center ${unlocked ? "bg-orange-100 dark:bg-orange-500/20" : "bg-gray-100 dark:bg-white/5"}`}
                      >
                        <Flame
                          className={`w-4 h-4 ${unlocked ? "text-orange-500" : "text-gray-300"}`}
                        />
                      </div>
                      <span
                        className={`font-mono text-[10px] font-semibold ${unlocked ? "text-orange-600" : "text-gray-400"}`}
                      >
                        {label}
                      </span>
                      {unlocked && (
                        <span className="font-mono text-[9px] text-orange-400">
                          ✓
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      return "bg-gray-100 border border-gray-200 dark:bg-white/5 dark:border-white/8";
    case 1:
      return "bg-gray-300 dark:bg-white/20";
    case 2:
      return "bg-gray-500 dark:bg-white/40";
    case 3:
      return "bg-gray-700 dark:bg-white/65";
    case 4:
      return "bg-gray-900 dark:bg-white";
    default:
      return "bg-gray-100 border border-gray-200 dark:bg-white/5 dark:border-white/8";
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

const STREAK_BADGES = [
  { day: 1, label: "Day 1", unlocked: true },
  { day: 7, label: "Day 7", unlocked: true },
  { day: 25, label: "Day 25", unlocked: true },
  { day: 50, label: "Day 50", unlocked: false },
  { day: 100, label: "Day 100", unlocked: false },
  { day: 200, label: "Day 200", unlocked: false },
  { day: 365, label: "Day 365", unlocked: false },
];

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
      globalRank: null,
    };
  });

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

            {/* Streak Heatmap */}
            <div className="border border-gray-200 dark:border-white/8 p-5 bg-white/90 dark:bg-[#111]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-mono text-[10px] tracking-widest text-gray-400">
                    ACTIVITY HEATMAP
                  </p>
                  <p className="text-sm font-bold text-black dark:text-white mt-0.5">
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
                    <div key={l} className={`w-3 h-3 ${heatColor(l)}`} />
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
                            className={`w-3 h-3 ${heatColor(level)} hover:ring-1 hover:ring-gray-400 dark:hover:ring-white/30 cursor-default`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
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
                  {STREAK_BADGES.map(({ day, label, unlocked }) => (
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

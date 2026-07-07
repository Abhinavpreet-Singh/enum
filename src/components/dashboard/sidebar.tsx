"use client";

import { API_BASE_URL } from "@/lib/api-config";
import api from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useContext, useState, useEffect } from "react";
import {
  LayoutDashboard,
  Code,
  Target,
  Trophy,
  LogOut,
  Shield,
  Building2,
  HandshakeIcon,
  Sun,
  Moon,
  AlertTriangle,
  History,
  FileText,
  BookOpen,
  Users,
  BarChart3,
  Award,
  Settings,
  Layers,
  Activity,
  Construction,
  ShieldAlert,
  LineChart,
  ClipboardList,
  Crown,
} from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import useAccountType, {
  useAccountSession,
  type AccountType,
} from "@/hooks/useAccountType";
import { AuthContext } from "@/providers/AuthProvider";
import { useEntitlements } from "@/hooks/useEntitlements";

const STUDENT_NAV = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", matchExact: true },
  { icon: Code, label: "Simulations", href: "/dashboard/simulations", matchExact: false },
  { icon: AlertTriangle, label: "Incidents", href: "/dashboard/incidents", matchExact: false },
  { icon: Target, label: "DSA Arena", href: "/dashboard/dsa-arena", matchExact: false },
  { icon: Trophy, label: "Leaderboard", href: "/dashboard/leaderboard", matchExact: false },
  { icon: HandshakeIcon, label: "Collaboration", href: "/dashboard/collab", matchExact: false },
  { icon: History, label: "Activity", href: "/dashboard/activity", matchExact: false },
];

const ORGANIZATION_NAV = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", matchExact: true },
  { icon: FileText, label: "Tests", href: "/dashboard/tests", matchExact: false },
  { icon: BookOpen, label: "Question Banks", href: "/dashboard/question-banks", matchExact: false },
  { icon: Users, label: "Candidates", href: "/dashboard/candidates", matchExact: false },
  { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics", matchExact: false },
  { icon: Award, label: "Certificates", href: "/dashboard/certificates", matchExact: false },
  { icon: Settings, label: "Settings", href: "/dashboard/settings/", matchExact: false },
];

function getSettingsHref(accountType: AccountType): string {
  if (accountType === "admin") return "/dashboard/admin/settings/";
  return "/dashboard/settings/";
}

function isSettingsPath(pathname: string, accountType: AccountType): boolean {
  const target = getSettingsHref(accountType);
  return pathname === target || pathname.startsWith(`${target.replace(/\/$/, "")}/`);
}

const ADMIN_NAV = [
  { icon: BarChart3,     label: "Overview",    href: "/dashboard/admin/overview/",    matchExact: true },
  { icon: Users,         label: "Users",       href: "/dashboard/admin/users/",       matchExact: false },
  { icon: Building2,     label: "Companies",   href: "/dashboard/admin/companies/",   matchExact: false },
  { icon: Layers,        label: "Content",     href: "/dashboard/admin/content/",     matchExact: false },
  { icon: Crown,         label: "Billing",     href: "/dashboard/admin/billing/",     matchExact: false },
  { icon: Activity,      label: "Activity",    href: "/dashboard/admin/activity/",    matchExact: false },
  { icon: ShieldAlert,   label: "Violations",  href: "/dashboard/admin/violations/",  matchExact: false },
  { icon: LineChart,     label: "Analytics",   href: "/dashboard/admin/analytics/",   matchExact: false },
  { icon: ClipboardList, label: "Settings",    href: "/dashboard/admin/settings/",    matchExact: false },
  { icon: History,       label: "Audit Log",   href: "/dashboard/admin/audit/",       matchExact: false },
  { icon: Construction,  label: "Maintenance", href: "/dashboard/admin/maintenance/", matchExact: false },
];

function getNavForRole(role: string) {
  if (role === "admin") return ADMIN_NAV;
  if (role === "organization") return ORGANIZATION_NAV;
  return STUDENT_NAV;
}

// Sidebar dimensions (in px)
const COLLAPSED_W = 72;
const EXPANDED_W = 220;

interface SidebarProps {
  pinned?: boolean;
  onTogglePin?: () => void;
}

export default function Sidebar({ pinned = false, onTogglePin }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const authCtx = useContext(AuthContext);
  const accountType = useAccountType();
  const { accountType: resolvedType, verified } = useAccountSession();
  const isAdmin = verified && accountType === "admin";
  const [navItems, setNavItems] = useState(() => getNavForRole(accountType));
  const { access } = useEntitlements();
  const settingsHref = getSettingsHref(accountType);
  const hasSettingsInNav = navItems.some((item) => item.label === "Settings");

  // Update nav when role changes
  useEffect(() => {
    const items = getNavForRole(accountType);
    if (accountType === "student" && access.isPro) {
      setNavItems(
        items.map((item) =>
          item.href === "/dashboard/pro" ? { ...item, label: "Pro" } : item,
        ),
      );
      return;
    }
    setNavItems(items);
  }, [accountType, access.isPro]);
  const [hovered, setHovered] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const expanded = pinned || hovered;

  const [userName, setUserName] = useState<string | null>(() =>
    null,
  );
  const [sidebarAvatar, setSidebarAvatar] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("userAvatar") : null,
  );

  // Keep avatar in sync when updated on the profile page (same-tab or cross-tab)
  useEffect(() => {
    const syncAvatar = () =>
      setSidebarAvatar(localStorage.getItem("userAvatar"));
    window.addEventListener("userAvatarChanged", syncAvatar);
    window.addEventListener("storage", syncAvatar);
    return () => {
      window.removeEventListener("userAvatarChanged", syncAvatar);
      window.removeEventListener("storage", syncAvatar);
    };
  }, []);

  useEffect(() => {
    const user = authCtx?.user;
    const name =
      (typeof user?.displayName === "string" && user.displayName) ||
      (typeof user?.username === "string" && user.username) ||
      (typeof user?.name === "string" && user.name) ||
      null;
    setUserName(name);
  }, [authCtx?.user]);

  // Hydrate display name + avatar from backend on every dashboard mount
  useEffect(() => {
    // Organization accounts use a different profile endpoint
    const profileUrl =
      verified && resolvedType === "organization" && !isAdmin
        ? "/api/v1/organization-dashboard/profile"
        : "/api/v1/users/profile";

    // Global api interceptor injects the in-memory access token automatically
    api
      .get(profileUrl, { withCredentials: true })
      .then((res) => {
        const data = res?.data?.data;
        if (!data) return;
        const name = data.displayName || data.name || data.email;
        if (name) {
          setUserName(name);
        }
        if (data.avatar || data.logo) {
          const img = data.avatar || data.logo;
          localStorage.setItem("userAvatar", img);
          setSidebarAvatar(img);
        }
      })
      .catch(() => {});
  }, [accountType, resolvedType, verified, isAdmin]);

  const normalizePath = (path: string) =>
    path.endsWith("/") ? path : `${path}/`;

  const isActiveRoute = (item: (typeof navItems)[0]) => {
    const current = normalizePath(pathname);
    const target = normalizePath(item.href);
    if ("matchExact" in item && item.matchExact) return current === target;
    return current.startsWith(target);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ width: expanded ? EXPANDED_W : COLLAPSED_W }}
        className={`hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:h-screen bg-white dark:bg-black border-r border-gray-100 dark:border-gray-800 transition-[width] duration-380 ease-in-out overflow-hidden ${
          pinned ? "z-40" : "z-50"
        }`}
      >
        {/* ── Header: Hamburger toggle (click only) ── */}
        <div className="px-4 h-16 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => {
              if (pinned) setHovered(false);
              onTogglePin?.();
            }}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 ${
              pinned
                ? "border-black bg-black shadow-sm dark:border-white dark:bg-white"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-black dark:hover:border-gray-700 dark:hover:bg-gray-900"
            }`}
            title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
          >
            <Image
              src="/lgogo.png"
              alt="Enum logo"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              priority
            />
          </button>
          <Link
            href="/"
            className={`flex items-center whitespace-nowrap text-gray-900 dark:text-white transition-opacity duration-300 ${
              expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
            }`}
          >
            <span
              className="flex items-baseline font-bold text-[22px] leading-none select-none"
              style={{ letterSpacing: "-0.08em", transform: "scaleX(0.92)" }}
            >
              <span>E</span>
              <span className="italic font-medium">N</span>
              <span>U</span>
              <span>M</span>
            </span>
          </Link>
        </div>

        {/* ── Body: nav + profile + actions ── */}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item);
              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  title={item.label}
                  onClick={(e) => {
                    if (!pinned) setHovered(false);
                    if (item.label === "Settings" && !isActive) {
                      e.preventDefault();
                      router.push(item.href);
                    }
                  }}
                  className={`group relative flex items-center ${
                    expanded ? "gap-3 pl-4 pr-3" : "justify-center px-0"
                  } py-2.5 rounded-lg font-mono text-sm tracking-wide transition-all duration-200 whitespace-nowrap border ${
                    isActive
                      ? "border-gray-200 bg-gray-50 dark:border-white dark:bg-transparent text-black dark:text-white font-medium"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-transparent hover:border-gray-200 dark:hover:border-white hover:text-gray-800 dark:hover:text-white"
                  }`}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 bg-black dark:bg-white rounded-r-full" />
                  )}
                  <Icon
                    className={`w-4.5 h-4.5 shrink-0 ${
                      isActive ? "text-black dark:text-white" : ""
                    }`}
                  />
                  <span
                    className={`transition-opacity duration-300 ${
                      expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Separator */}
          <div className="mx-4 border-t border-gray-100 dark:border-gray-900" />

          <div className="px-3 py-3 space-y-1">
            {/* Get Pro (only for students/non-admin) */}
            {!isAdmin && (
              <Link
                href="/dashboard/pro"
                title="Get Pro"
                onClick={() => {
                  if (!pinned) setHovered(false);
                }}
                className={`group relative flex items-center ${
                  expanded ? "gap-3 pl-4 pr-3" : "justify-center px-0"
                } py-2.5 rounded-lg font-mono text-sm tracking-wide transition-all duration-200 whitespace-nowrap border ${
                  pathname.startsWith("/dashboard/pro")
                    ? "border-gray-200 bg-gray-50 dark:border-white dark:bg-transparent text-black dark:text-white font-medium"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-transparent hover:border-gray-200 dark:hover:border-white hover:text-gray-800 dark:hover:text-white"
                }`}
              >
                <Crown className="w-4.5 h-4.5 shrink-0 text-amber-500" />
                <span
                  className={`transition-opacity duration-300 ${
                    expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                  }`}
                >
                  Get Pro
                </span>
              </Link>
            )}

            {/* Settings in footer when not already in the main nav (e.g. students) */}
            {!hasSettingsInNav && (
              <Link
                href={settingsHref}
                title="Settings"
                onClick={(e) => {
                  if (!pinned) setHovered(false);
                  if (!isSettingsPath(pathname, accountType)) {
                    e.preventDefault();
                    router.push(settingsHref);
                  }
                }}
                className={`group relative flex items-center ${
                  expanded ? "gap-3 pl-4 pr-3" : "justify-center px-0"
                } py-2.5 rounded-lg font-mono text-sm tracking-wide transition-all duration-200 whitespace-nowrap border ${
                  isSettingsPath(pathname, accountType)
                    ? "border-gray-200 bg-gray-50 dark:border-white dark:bg-transparent text-black dark:text-white font-medium"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-transparent hover:border-gray-200 dark:hover:border-white hover:text-gray-800 dark:hover:text-white"
                }`}
              >
                <Settings className="w-4.5 h-4.5 shrink-0" />
                <span
                  className={`transition-opacity duration-300 ${
                    expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                  }`}
                >
                  Settings
                </span>
              </Link>
            )}

            {/* User profile / admin identity */}
            {isAdmin ? (
              <div className="px-4 py-3 rounded-lg border border-amber-400/30 bg-amber-50/50 dark:bg-amber-950/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center border border-amber-400/40 bg-amber-100 dark:bg-amber-950/30">
                    <Shield className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  </div>
                  <div
                    className={`min-w-0 transition-opacity duration-300 ${
                      expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                    }`}
                  >
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate whitespace-nowrap">
                      Admin
                    </p>
                    <p className="font-mono text-[10px] text-amber-700 dark:text-amber-400 truncate whitespace-nowrap">
                      {userName || "Platform Admin"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                href="/dashboard/profile"
                className={`group relative flex items-center ${
                  expanded ? "gap-3 pl-4 pr-3" : "justify-center px-0"
                } py-2.5 rounded-lg transition-all duration-200 border ${
                  pathname.startsWith("/dashboard/profile")
                    ? "border-gray-200 bg-gray-50 dark:border-white dark:bg-transparent text-black dark:text-white font-medium"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-transparent hover:border-gray-200 dark:hover:border-white hover:text-gray-800 dark:hover:text-white"
                }`}
                title="View Profile"
                onClick={() => {
                  if (!pinned) setHovered(false);
                }}
              >
                <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden bg-linear-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                  {sidebarAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sidebarAvatar}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-xs font-bold tracking-wide select-none">
                      {(userName || "G")
                        .split(" ")
                        .slice(0, 2)
                        .map((w) => w[0]?.toUpperCase())
                        .join("")}
                    </span>
                  )}
                </div>
                <div
                  className={`min-w-0 transition-opacity duration-300 ${
                    expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                  }`}
                >
                  <p className="font-semibold text-gray-900 dark:text-white text-sm truncate whitespace-nowrap">
                    Profile
                  </p>
                  <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500 truncate whitespace-nowrap">
                    {userName || "Guest"}
                  </p>
                </div>
              </Link>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="px-3 pb-4 space-y-0.5">
            {/* <button
              onClick={toggleTheme}
              title={
                theme === "dark"
                  ? "Switch to Light Mode"
                  : "Switch to Dark Mode"
              }
              className="w-full flex items-center gap-3 pl-4 pr-3 py-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-transparent hover:text-gray-800 dark:hover:text-white rounded-lg font-mono text-sm tracking-wide transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-white whitespace-nowrap"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 shrink-0" />
              )}
              <span
                className={`transition-opacity duration-200 ${
                  expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </span>
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Sign Out"
              className="w-full flex items-center gap-3 pl-4 pr-3 py-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-transparent hover:text-gray-800 dark:hover:text-white rounded-lg font-mono text-sm tracking-wide transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-white disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isLoggingOut ? (
                <svg
                  className="animate-spin h-4.5 w-4.5 shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <LogOut className="w-4.5 h-4.5 shrink-0" />
              )}
              <span
                className={`transition-opacity duration-200 ${
                  expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                {isLoggingOut ? "Logging Out..." : "Sign Out"}
              </span>
            </button> */}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Dock */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-gray-100 dark:border-gray-900 z-50">
        <div className="flex justify-around items-center px-2 py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item);
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={(e) => {
                  if (item.label === "Settings" && !isActive) {
                    e.preventDefault();
                    router.push(item.href);
                  }
                }}
                className={`relative flex flex-col items-center gap-1 px-3 py-1 rounded-md transition-colors ${
                  isActive
                    ? "text-black dark:text-white"
                    : "text-gray-400 dark:text-gray-600"
                }`}
              >
                {isActive && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-0.75 bg-black dark:bg-white rounded-full" />
                )}
                <Icon className="w-5 h-5" />
                <span className="font-mono text-[10px] tracking-wide">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

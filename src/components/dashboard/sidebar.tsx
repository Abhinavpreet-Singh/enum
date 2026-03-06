"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import axios from "axios";
import { proxy } from "@/app/proxy";
import {
  LayoutDashboard,
  Code,
  Radio,
  Target,
  Trophy,
  Settings,
  LogOut,
  Shield,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/providers/theme-provider";

// Sidebar dimensions (in px)
const COLLAPSED_W = 72;
const EXPANDED_W = 248;

interface SidebarProps {
  pinned?: boolean;
  onTogglePin?: () => void;
}

export default function Sidebar({ pinned = false, onTogglePin }: SidebarProps) {
  const pathname = usePathname();
  const [navItems, setNavItems] = useState([
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/dashboard",
      matchExact: true,
    },
    {
      icon: Code,
      label: "Simulations",
      href: "/dashboard/simulations",
      matchExact: false,
    },
    {
      icon: Radio,
      label: "Tracks",
      href: "/dashboard/tracks",
      matchExact: false,
    },
    {
      icon: Target,
      label: "DSA Arena",
      href: "/dashboard/dsa-arena",
      matchExact: false,
    },
    {
      icon: Trophy,
      label: "Leaderboard",
      href: "/dashboard/leaderboard",
      matchExact: false,
    },
  ]);
  const [hovered, setHovered] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const expanded = pinned || hovered;

  const [userName, setUserName] = useState<string | null>(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("displayName") || localStorage.getItem("Name")
      : null,
  );
  const [sidebarAvatar, setSidebarAvatar] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("userAvatar") : null,
  );

  // Keep avatar in sync when updated on the profile page (same-tab or cross-tab)
  useEffect(() => {
    const syncAvatar = () =>
      setSidebarAvatar(localStorage.getItem("userAvatar"));
    const syncName = (e: Event) => {
      const newName =
        (e as CustomEvent<string>).detail ||
        localStorage.getItem("displayName") ||
        localStorage.getItem("Name") ||
        "Guest";
      setUserName(newName);
    };
    const syncNameStorage = (e: StorageEvent) => {
      if (e.key === "displayName")
        setUserName(e.newValue || localStorage.getItem("Name") || "Guest");
    };
    window.addEventListener("userAvatarChanged", syncAvatar);
    window.addEventListener("storage", syncAvatar);
    window.addEventListener("userNameChanged", syncName);
    window.addEventListener("storage", syncNameStorage);
    return () => {
      window.removeEventListener("userAvatarChanged", syncAvatar);
      window.removeEventListener("storage", syncAvatar);
      window.removeEventListener("userNameChanged", syncName);
      window.removeEventListener("storage", syncNameStorage);
    };
  }, []);

  // Hydrate display name + avatar from backend on every dashboard mount
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
        if (data.displayName) {
          localStorage.setItem("displayName", data.displayName);
          setUserName(data.displayName);
        }
        if (data.avatar) {
          localStorage.setItem("userAvatar", data.avatar);
          setSidebarAvatar(data.avatar);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const adminPrev = async () => {
      try {
        const userId = localStorage.getItem("id");
        if (!userId) return;

        const [adminRes, userRes] = await Promise.all([
          axios.get(`${proxy}/api/v1/admin/getAdminPrev`),
          axios.get(`${proxy}/api/v1/users/getUserById/${userId}`),
        ]);

        const adminEmail = String(adminRes?.data?.data?.email);
        const userEmail = userRes?.data?.data?.email;

        if (adminEmail === userEmail) {
          setNavItems((prev) => {
            if (prev.some((item) => item.href === "/dashboard/admin"))
              return prev;
            return [
              ...prev,
              {
                icon: Shield,
                label: "Admin",
                href: "/dashboard/admin",
                matchExact: false,
              },
            ];
          });
        } else {
          // not admin
        }
      } catch (error) {
        console.log(error);
      }
    };
    adminPrev();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const token = localStorage.getItem("accessToken");
      await axios.post(
        `${proxy}/api/v1/users/logout`,
        {},
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      localStorage.clear();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  const isActiveRoute = (item: (typeof navItems)[0]) => {
    if (item.matchExact) return pathname === item.href;
    return pathname.startsWith(item.href);
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
            className={`p-2 rounded-lg transition-all duration-200 shrink-0 ${
              pinned
                ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-700"
            }`}
            title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
          >
            <Menu className="w-5 h-5" />
          </button>
          <span
            className={`font-bold text-lg tracking-tight whitespace-nowrap transition-opacity duration-300 ${
              expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
            }`}
          >
            <Link
              href="/"
              className="text-gray-900 dark:text-white hover:text-black dark:hover:text-gray-200"
            >
              ENUM
            </Link>
          </span>
        </div>

        {/* ── Body: nav + profile + actions ── */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  onClick={() => {
                    if (!pinned) setHovered(false);
                  }}
                  className={`group relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg font-mono text-sm tracking-wide transition-all duration-200 whitespace-nowrap border ${
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

          {/* User Profile */}
          <Link
            href="/dashboard/profile"
            className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-transparent rounded-lg transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-white"
            title="View Profile"
            onClick={() => {
              if (!pinned) setHovered(false);
            }}
          >
            <div className="flex items-center gap-3">
              {/* Avatar — image or dark-gradient initials fallback */}
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
            </div>
          </Link>

          {/* Bottom Actions */}
          <div className="px-3 pb-4 space-y-0.5">
            <button
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
            <Link
              href="/dashboard/settings"
              title="Settings"
              onClick={() => {
                if (!pinned) setHovered(false);
              }}
              className="flex items-center gap-3 pl-4 pr-3 py-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-transparent hover:text-gray-800 dark:hover:text-white rounded-lg font-mono text-sm tracking-wide transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-white whitespace-nowrap"
            >
              <Settings className="w-4.5 h-4.5 shrink-0" />
              <span
                className={`transition-opacity duration-200 ${
                  expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                Settings
              </span>
            </Link>
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
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Dock */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-gray-100 dark:border-gray-900 z-50">
        <div className="flex justify-around items-center px-2 py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
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

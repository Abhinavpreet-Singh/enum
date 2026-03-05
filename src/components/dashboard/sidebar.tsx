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
} from "lucide-react";

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
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const expanded = pinned || hovered;

    const userName =
        typeof window !== "undefined" ? localStorage.getItem("Name") : null;

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
                    setIsAdmin(true);
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
                    setIsAdmin(false);
                }
            } catch (error) {
                console.log(error);
                setIsAdmin(false);
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
                onMouseLeave={() => setHovered(false)}
                style={{ width: expanded ? EXPANDED_W : COLLAPSED_W }}
                className={`hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:h-screen bg-white border-r border-gray-100 transition-[width] duration-300 ease-in-out overflow-hidden ${pinned ? "z-40" : "z-50"
                    }`}
            >
                {/* ── Header: Hamburger toggle (click only) ── */}
                <div className="px-4 h-16 flex items-center gap-3 border-b border-gray-100">
                    <button
                        onClick={() => {
                            if (pinned) setHovered(false);
                            onTogglePin?.();
                        }}
                        className={`p-2 rounded-lg transition-all duration-200 shrink-0 ${pinned
                            ? "bg-black text-white shadow-sm"
                            : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                            }`}
                        title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <span
                        className={`font-bold text-lg tracking-tight whitespace-nowrap transition-opacity duration-200 ${expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                            }`}
                    >
                        <Link href="/" className="text-gray-900 hover:text-black">
                            ENUM
                        </Link>
                    </span>
                </div>

                {/* ── Hoverable body: nav + profile + actions ── */}
                <div
                    className="flex flex-col flex-1 min-h-0"
                    onMouseEnter={() => setHovered(true)}
                >
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
                                    className={`group relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg font-mono text-sm tracking-wide transition-all duration-150 whitespace-nowrap ${isActive
                                        ? "bg-gray-50 text-black font-medium"
                                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                                        }`}
                                >
                                    {/* Active indicator bar */}
                                    {isActive && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-black rounded-r-full" />
                                    )}
                                    <Icon
                                        className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-black" : ""
                                            }`}
                                    />
                                    <span
                                        className={`transition-opacity duration-200 ${expanded
                                            ? "opacity-100"
                                            : "opacity-0 w-0 overflow-hidden"
                                            }`}
                                    >
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Separator */}
                    <div className="mx-4 border-t border-gray-100" />

                    {/* User Profile */}
                    <div className="px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full shrink-0" />
                            <div
                                className={`min-w-0 transition-opacity duration-200 ${expanded
                                    ? "opacity-100"
                                    : "opacity-0 w-0 overflow-hidden"
                                    }`}
                            >
                                <p className="font-semibold text-gray-900 text-sm truncate whitespace-nowrap">
                                    {userName || "Guest"}
                                </p>
                                <p className="text-xs text-gray-400 whitespace-nowrap">
                                    Pro Member
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="px-3 pb-4 space-y-0.5">
                        <Link
                            href="/dashboard/settings"
                            title="Settings"
                            className="flex items-center gap-3 pl-4 pr-3 py-2.5 text-gray-500 hover:bg-gray-50 hover:text-gray-800 rounded-lg font-mono text-sm tracking-wide transition-colors whitespace-nowrap"
                        >
                            <Settings className="w-[18px] h-[18px] shrink-0" />
                            <span
                                className={`transition-opacity duration-200 ${expanded
                                    ? "opacity-100"
                                    : "opacity-0 w-0 overflow-hidden"
                                    }`}
                            >
                                Settings
                            </span>
                        </Link>
                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            title="Sign Out"
                            className="w-full flex items-center gap-3 pl-4 pr-3 py-2.5 text-gray-500 hover:bg-gray-50 hover:text-gray-800 rounded-lg font-mono text-sm tracking-wide transition-colors disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {isLoggingOut ? (
                                <svg
                                    className="animate-spin h-[18px] w-[18px] shrink-0"
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
                                <LogOut className="w-[18px] h-[18px] shrink-0" />
                            )}
                            <span
                                className={`transition-opacity duration-200 ${expanded
                                    ? "opacity-100"
                                    : "opacity-0 w-0 overflow-hidden"
                                    }`}
                            >
                                {isLoggingOut ? "Logging Out..." : "Sign Out"}
                            </span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Dock */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
                <div className="flex justify-around items-center px-2 py-3">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`relative flex flex-col items-center gap-1 px-3 py-1 rounded-md transition-colors ${isActive ? "text-black" : "text-gray-400"
                                    }`}
                            >
                                {isActive && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-black rounded-full" />
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

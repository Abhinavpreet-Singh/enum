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
    ChevronLeft,
    ChevronRight,
} from "lucide-react";


interface SidebarProps {
    collapsed?: boolean;
}

export default function Sidebar({
    collapsed: initialCollapsed = false,
}: SidebarProps) {
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
])
    const [collapsed, setCollapsed] = useState(initialCollapsed);
    const [isAdmin, setIsAdmin] = useState(false);
    const [error, seterror] = useState("")
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const sidebarWidth = collapsed ? "lg:w-16" : "lg:w-52";
    const mainPadding = collapsed ? "px-3" : "px-6";
    const userName =
        typeof window !== "undefined" ? localStorage.getItem("Name") : null;

    useEffect(() => {
    const adminPrev = async () => {
        try {
            const userId = localStorage.getItem("id");

            if (!userId) return;

            const [adminRes, userRes] = await Promise.all([
                axios.get(`${proxy}/api/v1/admin/getAdminPrev`),
                axios.get(`${proxy}/api/v1/users/getUserById/${userId}`)
            ]);

            console.log(String(adminRes.data.data.email));

            const adminEmail = String(adminRes?.data?.data?.email);
            const userEmail = userRes?.data?.data?.email;

            if (adminEmail === userEmail) {
                setIsAdmin(true);

                setNavItems(prev => {
                    if (prev.some(item => item.href === "/dashboard/admin")) return prev;
                    return [...prev, { icon: Shield, label: "Admin", href: "/dashboard/admin", matchExact: false }];
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
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );
            localStorage.clear();
            window.location.href = "/login";
        } catch (error) {
            console.error("Logout error:", error);
            // Clear local storage even if logout fails
            localStorage.clear();
            window.location.href = "/login";
        }
    };

    const isActiveRoute = (item: (typeof navItems)[0]) => {
        if (item.matchExact) {
            return pathname === item.href;
        }
        return pathname.startsWith(item.href);
    };

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className={`hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:h-screen ${sidebarWidth} bg-white border-r border-gray-200 transition-all duration-300 ease-in-out`}
            >
                {/* Logo & Toggle */}
                <div
                    className={`${mainPadding} py-6 border-b border-gray-200 flex items-center justify-between`}
                >
                    <Link href="/" className="flex items-center">
                        <span className="font-bold text-xl tracking-tight">
                            {collapsed ? "E" : "ENUM"}
                        </span>
                    </Link>
                    {!collapsed && (
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Collapse sidebar"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    )}
                    {collapsed && (
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors mx-auto"
                            title="Expand sidebar"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = isActiveRoute(item);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={item.label}
                                className={`flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-3"
                                    } py-2.5 rounded-md font-mono text-sm tracking-wide transition-all duration-200 ${isActive
                                        ? "bg-black text-white"
                                        : "text-gray-600 hover:bg-gray-100"
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span
                                    className={`${collapsed ? "hidden" : "block"
                                        } transition-opacity duration-200`}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile */}
                <div className={`${mainPadding} py-4 border-t border-gray-200`}>
                    <div
                        className={`flex items-center ${collapsed ? "justify-center" : "gap-3"
                            } mb-3`}
                    >
                        <div className="w-10 h-10 bg-purple-500 rounded-full shrink-0" />
                        {!collapsed && (
                            <div className="min-w-0">
                                <p className="font-bold text-black text-sm truncate">
                                    {userName || "Guest"}
                                </p>
                                <p className="text-xs text-gray-500">Pro Member</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className={`${mainPadding} pb-4 space-y-1`}>
                    <Link
                        href="/dashboard/settings"
                        title="Settings"
                        className={`flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-3"
                            } py-2.5 text-gray-600 hover:bg-gray-100 rounded-md font-mono text-sm tracking-wide transition-colors`}
                    >
                        <Settings className="w-4 h-4" />
                        {!collapsed && "Settings"}
                    </Link>
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        title="Sign Out"
                        className={`w-full flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-3"
                            } py-2.5 text-gray-600 hover:bg-gray-100 rounded-md font-mono text-sm tracking-wide transition-colors disabled:opacity-70 disabled:cursor-not-allowed`}
                    >
                        {isLoggingOut ? (
                            <svg
                                className="animate-spin h-4 w-4"
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
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                        ) : (
                            <LogOut className="w-4 h-4" />
                        )}
                        {!collapsed && (isLoggingOut ? "Logging Out..." : "Sign Out")}
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Dock */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
                <div className="flex justify-around items-center px-2 py-3">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-md transition-colors ${isActive ? "text-black" : "text-gray-400"
                                    }`}
                            >
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

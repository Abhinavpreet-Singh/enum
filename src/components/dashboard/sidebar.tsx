"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Code,
    Radio,
    Target,
    Trophy,
    Settings,
    LogOut,
} from "lucide-react";

const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Code, label: "Simulations", href: "/dashboard/simulations" },
    { icon: Radio, label: "Tracks", href: "/dashboard/tracks" },
    { icon: Target, label: "DSA Arena", href: "/dashboard/dsa-arena" },
    { icon: Trophy, label: "Leaderboard", href: "/dashboard/leaderboard" },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-52 bg-white border-r border-gray-200">
                {/* Logo */}
                <div className="p-6 border-b border-gray-200">
                    <Link href="/" className="flex items-center">
                        <span className="font-bold text-xl tracking-tight">ENUM</span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-md font-mono text-sm tracking-wide transition-colors ${isActive
                                        ? "bg-black text-white"
                                        : "text-gray-600 hover:bg-gray-100"
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-full shrink-0" />
                        <div className="min-w-0">
                            <p className="font-bold text-black text-sm truncate">{localStorage.getItem("Name") || "Guest"}</p>
                            <p className="text-xs text-gray-500">Pro Member</p>
                        </div>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="p-4 pt-0 space-y-1">
                    <Link
                        href="/dashboard/settings"
                        className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-md font-mono text-sm tracking-wide transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        Settings
                    </Link>
                    <button
                        onClick={() => {
                            // TODO: Implement sign out
                            console.log("Sign out");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-md font-mono text-sm tracking-wide transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
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

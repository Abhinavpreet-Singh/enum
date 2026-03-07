"use client";

import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { useState } from "react";
import { useTheme } from "@/providers/theme-provider";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="relative w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
    >
      {/* Sun icon - shown in dark mode */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`absolute text-gray-300 transition-all duration-300 ${theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-75"}`}
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
      {/* Moon icon - shown in light mode */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`absolute text-gray-600 transition-all duration-300 ${theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"}`}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}

export default function Header() {
  const isAuthenticated = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const token = localStorage.getItem("accessToken");
      console.log("Token found:", token ? "Yes" : "No");
      console.log("Token value:", token);

      const response = await axios.post(
        `${proxy}/api/v1/users/logout`,
        {},
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      console.log("Logout response:", response);
      localStorage.clear();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      if (axios.isAxiosError(error)) {
        console.error("Error status:", error.response?.status);
        console.error("Error data:", error.response?.data);
      }
      // Clear local storage even if logout fails
      localStorage.clear();
      window.location.href = "/login";
    } finally {
      // Keep loading state until redirect happens
    }
  };
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-600"
      style={{ borderBottomColor: undefined }}
    >
      <div className="px-3 md:px-4 py-3 md:py-4">
        <div className="grid grid-cols-3 items-center max-w-7xl mx-auto">
          {/* Logo */}
          <Link
            href="/"
            className="text-lg md:text-xl font-bold tracking-tight text-black dark:text-white hover:opacity-80 transition-opacity"
          >
            ENUM
          </Link>

          {/* Navigation — centered */}
          <nav className="hidden md:flex items-center justify-center space-x-10 lg:space-x-12">
            {[
              { href: "/#how-it-works", label: "HOW IT WORKS" },
              { href: "/#simulations", label: "LATEST INCIDENTS" },
              { href: "/#colleges", label: "WHO BENEFITS" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="font-mono text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors tracking-[0.03em]"
                onClick={(e) => {
                  if (typeof window === "undefined") return;

                  const isHome = window.location.pathname === "/";
                  const hash = href.split("#")[1];

                  if (!isHome || !hash) return;

                  const section = document.getElementById(hash);
                  if (!section) return;

                  e.preventDefault();
                  section.scrollIntoView({
                    behavior: "smooth",
                    block: hash === "colleges" ? "start" : "center",
                  });
                  window.history.replaceState({}, "", href);
                }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Auth buttons + Theme Toggle */}
          <div className="flex justify-end">
            {!isAuthenticated ? (
              <div className="flex items-center gap-3 md:gap-4">
                <ThemeToggle />
                <Link
                  href="/login"
                  className="font-mono text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors tracking-wider hidden sm:inline"
                >
                  LOGIN
                </Link>
                <Link
                  href="/start"
                  className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors"
                >
                  START FREE
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="border border-gray-200 dark:border-white px-3 py-1 font-mono text-xs tracking-wider text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white dark:hover:text-black transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoggingOut && (
                    <svg
                      className="animate-spin h-3 w-3"
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
                  )}
                  {isLoggingOut ? "LOGGING OUT..." : "LOGOUT"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

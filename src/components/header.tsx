"use client";

import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { useState } from "react";

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
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200"
      style={{ borderBottomColor: "rgba(0,0,0,0.04)" }}
    >
      <div className="px-4 md:px-6 lg:px-8 py-3 md:py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <Link
            href="/"
            className="text-lg md:text-xl font-bold tracking-tight text-black hover:opacity-80 transition-opacity"
          >
            ENUM
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
            <Link
              href="#features"
              className="font-mono text-xs font-medium text-gray-500 hover:text-black transition-colors tracking-[0.15em]"
            >
              FEATURES
            </Link>
            <Link
              href="#simulations"
              className="font-mono text-xs font-medium text-gray-500 hover:text-black transition-colors tracking-[0.15em]"
            >
              SIMULATIONS
            </Link>
            <Link
              href="#colleges"
              className="font-mono text-xs font-medium text-gray-500 hover:text-black transition-colors tracking-[0.15em]"
            >
              COLLEGES
            </Link>
          </nav>

          {/* Auth buttons */}
          {!isAuthenticated ? (
            <div className="flex items-center gap-3 md:gap-4">
              <Link
                href="/login"
                className="font-mono text-xs font-medium text-gray-700 hover:text-black transition-colors tracking-wider hidden sm:inline"
              >
                LOGIN
              </Link>
              <Link
                href="/start"
                className="px-5 py-2 bg-black text-white font-mono text-xs tracking-wider hover:bg-gray-900 transition-colors"
              >
                START FREE
              </Link>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="border px-3 py-1 font-mono text-xs tracking-wider hover:bg-gray-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
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
          )}
        </div>
      </div>
    </header>
  );
}

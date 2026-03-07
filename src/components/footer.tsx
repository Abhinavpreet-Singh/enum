"use client";

import Link from "next/link";
import useAuth from "@/hooks/useAuth";

export default function Footer() {
  const isAuthenticated = useAuth();
  const simulationsHref = isAuthenticated ? "/dashboard/simulations" : "/login";
  const tracksHref = isAuthenticated ? "/dashboard/tracks" : "/login";
  const dsaHref = isAuthenticated ? "/dashboard/dsa-arena" : "/login";

  return (
    <footer className="border-t border-white dark:border-white bg-gray-50 dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-12">
          {/* Brand column */}
          <div className="md:col-span-1">
            <Link
              href="/"
              className="text-lg md:text-xl font-bold mb-3 md:mb-4 inline-block text-black dark:text-white"
            >
              ENUM
            </Link>
            <p className="text-xs md:text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
              The flight simulator for software engineers.
              <br />
              Practice production, not puzzles.
            </p>
          </div>

          {/* Platform column */}
          <div>
            <h3 className="font-semibold mb-3 md:mb-4 text-xs md:text-sm tracking-wider text-black dark:text-white">
              PLATFORM
            </h3>
            <ul className="space-y-2 md:space-y-3">
              <li>
                <Link
                  href={simulationsHref}
                  className="text-xs md:text-sm text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  Simulations
                </Link>
              </li>
              <li>
                <Link
                  href={tracksHref}
                  className="text-xs md:text-sm text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  Tracks
                </Link>
              </li>
              <li>
                <Link
                  href={dsaHref}
                  className="text-xs md:text-sm text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  DSA Arena
                </Link>
              </li>
            </ul>
          </div>

          {/* Company column */}
          <div>
            <h3 className="font-semibold mb-3 md:mb-4 text-xs md:text-sm tracking-wider text-black dark:text-white">
              COMPANY
            </h3>
            <ul className="space-y-2 md:space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-xs md:text-sm text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/demo"
                  className="text-xs md:text-sm text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  Demo
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  scroll
                  className="text-xs md:text-sm text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Social column */}
          <div>
            <h3 className="font-semibold mb-3 md:mb-4 text-xs md:text-sm tracking-wider text-black dark:text-white">
              SOCIAL
            </h3>
            <ul className="space-y-2 md:space-y-3">
              <li>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs md:text-sm text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs md:text-sm text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://discord.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs md:text-sm text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  Discord
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-200 dark:border-gray-800 mt-8 md:mt-12 pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-500 text-center md:text-left">
            © {new Date().getFullYear()} ENUM INC. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center gap-4 md:gap-6">
            <Link
              href="/privacy"
              scroll
              className="text-xs md:text-sm text-gray-600 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
              PRIVACY
            </Link>
            <Link
              href="/terms"
              scroll
              className="text-xs md:text-sm text-gray-600 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
              TERMS
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

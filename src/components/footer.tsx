"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-300 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-12">
          {/* Brand column */}
          <div className="md:col-span-1">
            <Link
              href="/"
              className="text-lg md:text-xl font-bold mb-3 md:mb-4 inline-block text-black"
            >
              ENUM
            </Link>
            <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
              The flight simulator for software engineers.
              <br />
              Practice production, not puzzles.
            </p>
          </div>

          {/* Platform column */}
          <div>
            <h3 className="font-semibold mb-3 md:mb-4 text-xs md:text-sm tracking-wider text-black">
              PLATFORM
            </h3>
            <ul className="space-y-2 md:space-y-3">
              <li>
                <Link
                  href="/simulations"
                  className="text-xs md:text-sm text-gray-700 hover:text-black transition-colors"
                >
                  Simulations
                </Link>
              </li>
              <li>
                <Link
                  href="/tracks"
                  className="text-xs md:text-sm text-gray-700 hover:text-black transition-colors"
                >
                  Tracks
                </Link>
              </li>
              <li>
                <Link
                  href="/dsa-arena"
                  className="text-xs md:text-sm text-gray-700 hover:text-black transition-colors"
                >
                  DSA Arena
                </Link>
              </li>
            </ul>
          </div>

          {/* Company column */}
          <div>
            <h3 className="font-semibold mb-3 md:mb-4 text-xs md:text-sm tracking-wider text-black">
              COMPANY
            </h3>
            <ul className="space-y-2 md:space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-xs md:text-sm text-gray-700 hover:text-black transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="text-xs md:text-sm text-gray-700 hover:text-black transition-colors"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-xs md:text-sm text-gray-700 hover:text-black transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Social column */}
          <div>
            <h3 className="font-semibold mb-3 md:mb-4 text-xs md:text-sm tracking-wider text-black">
              SOCIAL
            </h3>
            <ul className="space-y-2 md:space-y-3">
              <li>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs md:text-sm text-gray-700 hover:text-black transition-colors"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs md:text-sm text-gray-700 hover:text-black transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://discord.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs md:text-sm text-gray-700 hover:text-black transition-colors"
                >
                  Discord
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-200 mt-8 md:mt-12 pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
          <p className="text-xs md:text-sm text-gray-600 text-center md:text-left">
            © {new Date().getFullYear()} ENUM INC. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center gap-4 md:gap-6">
            <Link
              href="/privacy"
              className="text-xs md:text-sm text-gray-600 hover:text-black transition-colors"
            >
              PRIVACY
            </Link>
            <Link
              href="/terms"
              className="text-xs md:text-sm text-gray-600 hover:text-black transition-colors"
            >
              TERMS
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

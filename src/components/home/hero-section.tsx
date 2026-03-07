"use client";

import Link from "next/link";
import { useState } from "react";

export default function HeroSection() {
  const [isAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem("accessToken");
    return !!token;
  });

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 md:px-6 overflow-hidden bg-white dark:bg-black pt-20 md:pt-14">
      {/* Visible Grid Background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.07] dark:hidden"
          style={{
            backgroundImage: `
              linear-gradient(to right, #000 1px, transparent 1px),
              linear-gradient(to bottom, #000 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block opacity-[0.12]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #fff 1px, transparent 1px),
              linear-gradient(to bottom, #fff 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center">
        {/* ENUM Logo */}
        <h1
          className="font-bold text-[80px] sm:text-[120px] md:text-[140px] lg:text-[200px] leading-none mb-6 md:mb-8 flex select-none"
          style={{ letterSpacing: "-0.08em", transform: "scaleX(0.9)" }}
        >
          <span>E</span>
          <span className="italic font-medium">N</span>
          <span>U</span>
          <span>M</span>
        </h1>

        {/* Tagline */}
        <p className="font-mono text-xs md:text-sm tracking-[0.25em] text-gray-500 dark:text-gray-400 mb-8 md:mb-10">
          PRODUCTION <span className="text-black dark:text-white">•</span>{" "}
          SIMULATION <span className="text-black dark:text-white">•</span>{" "}
          TRAINING
        </p>

        {/* Launch Environment Button */}
        <Link
          href={isAuthenticated ? "/dashboard" : "/start"}
          className="px-6 md:px-12 py-2 md:py-3 bg-black dark:bg-white text-white dark:text-black font-mono text-xs md:text-sm tracking-[0.15em] hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors whitespace-nowrap"
        >
          LAUNCH ENVIRONMENT
        </Link>
      </div>

      {/* System Overview button */}
      <Link
        href="/demo#demo-videos"
        scroll
        aria-label="Open demo videos"
        className="absolute z-20 bottom-10 md:bottom-14 left-1/2 -translate-x-1/2 cursor-pointer pointer-events-auto focus-visible:outline-none"
      >
        <span className="relative inline-flex">
          <span className="pointer-events-none absolute -inset-1 rounded-full border border-black/55 dark:border-white/55 animate-[outline-pulse_1.8s_ease-in-out_infinite]" />
          <span className="relative inline-flex items-center gap-3 rounded-full border border-black dark:border-white bg-white dark:bg-black px-5 py-2.5 font-mono text-[11px] tracking-[0.2em] text-gray-700 dark:text-gray-300">
            <span>SYSTEM OVERVIEW</span>
            <span className="text-base leading-none">{"->"}</span>
          </span>
        </span>
      </Link>
    </section>
  );
}

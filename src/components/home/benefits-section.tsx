"use client";

import { useState } from "react";
import { useTheme } from "@/providers/theme-provider";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const benefits = [
  {
    audience: "Students",
    description: "Become job-ready before joining companies by practicing real-world tasks.",
  },
  {
    audience: "Junior Developers",
    description: "Accelerate your career, bridge training gaps, and gain production troubleshooting experience.",
  },
  {
    audience: "Companies",
    description: "Faster onboarding, lower training cost, and higher confidence in skill verification.",
  },
];

export default function BenefitsSection() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [hovered, setHovered] = useState(false);

  return (
    <section id="benefits" className="pt-20 pb-10 md:pt-24 md:pb-12 px-4 md:px-6 bg-white dark:bg-black border-t border-gray-100 dark:border-white/5">
      <div className="max-w-7xl mx-auto">
        
        {/* Combined Section Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center mb-16 md:mb-20">
          
          {/* Left Column: Who Benefits */}
          <div>
            <div className="mb-8">
              <h2 className="font-mono text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-black dark:text-white tracking-tight">
                Who Benefits
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-mono tracking-[0.05em] max-w-md">
                Training that bridges the gap between learning and real-world engineering
              </p>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-start md:items-center gap-6 py-5"
                >
                  <span className="font-mono text-xs text-gray-400 dark:text-gray-600 w-6 shrink-0 mt-1 md:mt-0">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-mono text-sm md:text-base font-bold text-black dark:text-white w-28 md:w-32 shrink-0">
                    {benefit.audience}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: System Architecture Diagram (Boxy, minimalist) */}
          <div className="bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 p-6 md:p-10 flex items-center justify-center w-full overflow-x-auto rounded-none">
            <div className="relative w-full max-w-md">
              <div className="text-[10px] font-mono tracking-widest text-gray-400 dark:text-gray-500 mb-6 text-center uppercase">
                system architecture
              </div>

              {/* Desktop layout */}
              <div className="hidden md:flex items-center justify-center space-x-6 mb-6">
                {/* Client */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 border border-gray-300 dark:border-white/20 bg-white dark:bg-zinc-950 rounded-none flex items-center justify-center">
                    <span className="font-mono font-semibold text-[10px] dark:text-white uppercase tracking-wider">
                      CLIENT
                    </span>
                  </div>
                </div>

                {/* Arrow to LB */}
                <div className="flex-1 h-px bg-gray-300 dark:bg-white/20"></div>

                {/* Load Balancer */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 border border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-zinc-950 rounded-none flex items-center justify-center">
                    <span className="font-mono font-semibold text-[10px] text-center leading-tight dark:text-white uppercase tracking-wider">
                      LB
                    </span>
                  </div>
                </div>

                {/* Arrow to API */}
                <div className="flex-1 h-px bg-gray-300 dark:bg-white/20"></div>

                {/* API */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 border border-gray-300 dark:border-white/20 bg-black dark:bg-white rounded-none flex items-center justify-center">
                    <span className="font-mono font-semibold text-[10px] text-white dark:text-black uppercase tracking-wider">
                      API
                    </span>
                  </div>
                </div>
              </div>

              {/* Vertical line down from LB - Desktop only */}
              <div className="hidden md:block absolute left-1/2 top-24 w-px h-12 bg-gray-300 dark:bg-white/20 -ml-px"></div>

              {/* Mobile layout - vertical stack */}
              <div className="md:hidden flex flex-col items-center gap-3 mb-4">
                {/* Client */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 border border-gray-300 dark:border-white/20 bg-white dark:bg-zinc-950 rounded-none flex items-center justify-center">
                    <span className="font-mono font-semibold text-[10px] text-black dark:text-white">
                      CLIENT
                    </span>
                  </div>
                </div>

                <div className="h-3 w-px bg-gray-300 dark:bg-white/20"></div>

                {/* Load Balancer */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 border border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-zinc-950 rounded-none flex items-center justify-center">
                    <span className="font-mono font-semibold text-[10px] text-black dark:text-white">
                      LB
                    </span>
                  </div>
                </div>

                <div className="h-3 w-px bg-gray-300 dark:bg-white/20"></div>

                {/* API */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 border border-gray-300 dark:border-white/20 bg-black dark:bg-white rounded-none flex items-center justify-center">
                    <span className="font-mono font-semibold text-[10px] text-white dark:text-black">
                      API
                    </span>
                  </div>
                </div>

                <div className="h-3 w-px bg-gray-300 dark:bg-white/20"></div>

                {/* Database */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 border border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-zinc-950 rounded-none flex items-center justify-center">
                    <span className="font-mono font-semibold text-[10px] text-black dark:text-white">
                      DB
                    </span>
                  </div>
                </div>
              </div>

              {/* Desktop Database - positioned below on desktop */}
              <div className="hidden md:flex justify-center mt-6">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 border border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-zinc-950 rounded-none flex items-center justify-center">
                    <span className="font-mono font-semibold text-[10px] dark:text-white uppercase tracking-wider">
                      DB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Core Belief Banner */}
        <div className="mt-16 md:mt-24">
          <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative overflow-hidden rounded-none cursor-crosshair"
          >
            {/* Fill layer */}
            <div
              className="absolute inset-0 bg-black dark:bg-white pointer-events-none"
              style={{
                clipPath: hovered
                  ? "inset(0% 0% 0% 0%)"
                  : "inset(50% 50% 50% 50%)",
                transition: "clip-path 0.7s cubic-bezier(0.76,0,0.24,1)",
              }}
            />

            {/* Corner brackets */}
            {(
              [
                "top-0 left-0 border-t-[3px] border-l-[3px]",
                "top-0 right-0 border-t-[3px] border-r-[3px]",
                "bottom-0 left-0 border-b-[3px] border-l-[3px]",
                "bottom-0 right-0 border-b-[3px] border-r-[3px]",
              ] as const
            ).map((pos, i) => (
              <div
                key={i}
                className={`absolute ${pos} pointer-events-none`}
                style={{
                  width: hovered ? 56 : 28,
                  height: hovered ? 56 : 28,
                  borderColor: hovered
                    ? isDark
                      ? "#000"
                      : "#fff"
                    : isDark
                      ? "#fff"
                      : "#000",
                  transition: "all 0.7s cubic-bezier(0.76,0,0.24,1)",
                  borderWidth: "3px",
                }}
              />
            ))}

            {/* Content */}
            <div className="relative z-10 px-8 md:px-16 py-16 md:py-24 text-center">
              <p
                className="font-mono text-[9px] tracking-[0.4em] uppercase mb-6"
                style={{
                  color: hovered
                    ? isDark
                      ? "rgba(0,0,0,0.45)"
                      : "rgba(255,255,255,0.45)"
                    : "rgb(156,163,175)",
                  transition: "color 0.7s cubic-bezier(0.76,0,0.24,1)",
                }}
              >
                Core Belief
              </p>

              <h3
                className="text-3xl md:text-5xl font-bold leading-tight tracking-tight font-sans"
                style={{
                  color: hovered
                    ? isDark
                      ? "#000"
                      : "#fff"
                    : isDark
                      ? "#fff"
                      : "#000",
                  transform: hovered ? "scale(1.02)" : "scale(1)",
                  transition:
                    "color 0.7s cubic-bezier(0.76,0,0.24,1), transform 0.7s cubic-bezier(0.76,0,0.24,1)",
                }}
              >
                &ldquo;The flight simulator for software engineers.&rdquo;
              </h3>



              <p
                className="font-mono text-xs md:text-sm tracking-wide mt-2 mb-10"
                style={{
                  color: hovered
                    ? isDark
                      ? "rgba(0,0,0,0.5)"
                      : "rgba(255,255,255,0.55)"
                    : "rgb(107,114,128)",
                  transition: "color 0.7s cubic-bezier(0.76,0,0.24,1)",
                }}
              >
                Pilots don&apos;t train by reading theory. Engineers shouldn&apos;t either.
              </p>

              {/* Start Training Button */}
              <div className="flex justify-center mt-6">
                <Link
                  href="/login"
                  className={`inline-flex items-center gap-2 border px-6 py-2.5 font-mono text-[9px] uppercase tracking-widest font-semibold rounded-none transition-all duration-300 ${
                    hovered
                      ? isDark
                        ? "bg-black text-white hover:bg-zinc-800 border-black"
                        : "bg-white text-black hover:bg-zinc-100 border-white"
                      : isDark
                        ? "bg-white text-black hover:bg-zinc-100 border-white"
                        : "bg-black text-white hover:bg-zinc-800 border-black"
                  }`}
                >
                  Start Training <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { useTheme } from "@/providers/theme-provider";

const benefits = [
  {
    audience: "Students",
    description: "Become job-ready before joining companies",
  },
  {
    audience: "Colleges",
    description: "Structured practical training tool",
  },
  {
    audience: "Recruiters",
    description: "Real signal of engineering readiness",
  },
  {
    audience: "Companies",
    description: "Faster onboarding, lower training cost",
  },
];

export default function BenefitsSection() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [hovered, setHovered] = useState(false);

  return (
    <section id="colleges" className="py-16 md:py-20 px-4 md:px-6 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-12 md:mb-16">
          <h2 className="font-mono text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-black dark:text-white tracking-tight">
            Who Benefits
          </h2>
          <p className="text-gray-700 dark:text-gray-400 text-xs md:text-sm font-mono tracking-[0.05em] max-w-2xl">
            Training that bridges the gap between learning and real-world
            engineering
          </p>
        </div>

        {/* Benefits list */}
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="flex items-start md:items-center gap-6 md:gap-12 py-5 md:py-7"
            >
              <span className="font-mono text-xs text-gray-400 dark:text-gray-600 w-6 shrink-0 mt-1 md:mt-0">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-mono text-base md:text-lg font-bold text-black dark:text-white w-28 md:w-40 shrink-0">
                {benefit.audience}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div className="mt-20 md:mt-28">
          <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative overflow-hidden cursor-crosshair"
          >
            {/* Fill layer — expands from all sides simultaneously (corners inward to center feel) */}
            <div
              className="absolute inset-0 bg-black dark:bg-white pointer-events-none"
              style={{
                clipPath: hovered
                  ? "inset(0% 0% 0% 0%)"
                  : "inset(50% 50% 50% 50%)",
                transition: "clip-path 0.7s cubic-bezier(0.76,0,0.24,1)",
              }}
            />

            {/* Corner brackets — grow outward on hover */}
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
                  width: hovered ? 56 : 32,
                  height: hovered ? 56 : 32,
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
            <div className="relative z-10 px-12 md:px-24 py-14 md:py-20 text-center">
              <p
                className="font-mono text-[10px] tracking-[0.4em] uppercase mb-8"
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
                className="text-3xl md:text-5xl font-bold leading-tight tracking-tight"
                style={{
                  color: hovered
                    ? isDark
                      ? "#000"
                      : "#fff"
                    : isDark
                      ? "#fff"
                      : "#000",
                  transform: hovered ? "scale(1.03)" : "scale(1)",
                  transition:
                    "color 0.7s cubic-bezier(0.76,0,0.24,1), transform 0.7s cubic-bezier(0.76,0,0.24,1)",
                }}
              >
                &ldquo;The flight simulator for software engineers.&rdquo;
              </h3>

              <div
                className="mx-auto my-8 h-px"
                style={{
                  width: hovered ? 96 : 40,
                  backgroundColor: hovered
                    ? isDark
                      ? "rgba(0,0,0,0.25)"
                      : "rgba(255,255,255,0.3)"
                    : isDark
                      ? "rgb(55,65,81)"
                      : "rgb(209,213,219)",
                  transition: "all 0.7s cubic-bezier(0.76,0,0.24,1)",
                }}
              />

              <p
                className="font-mono text-xs md:text-sm tracking-wide"
                style={{
                  color: hovered
                    ? isDark
                      ? "rgba(0,0,0,0.5)"
                      : "rgba(255,255,255,0.55)"
                    : "rgb(107,114,128)",
                  transition: "color 0.7s cubic-bezier(0.76,0,0.24,1)",
                }}
              >
                Pilots don&apos;t train by reading theory. Engineers
                shouldn&apos;t either.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

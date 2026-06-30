"use client";

import { ChevronRight } from "lucide-react";

const steps = [
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
    title: "1. Choose a track",
    description:
      "Select from Frontend, Backend, Linux, or System Design. Every simulation mirrors a real-world scenario.",
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
        />
      </svg>
    ),
    title: "2. Investigate & debug",
    description:
      "Access a live terminal, read logs, edit code, or design architecture graphs inside an interactive sandbox.",
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: "3. Verify & deploy",
    description:
      "Submit your solution. Our automated tests evaluate your code or design instantly to award XP.",
  },
];

// const tracks = [
//   {
//     name: "Frontend",
//     icon: "⚡",
//     color: "bg-blue-50 border-blue-200 text-blue-700",
//   },
//   {
//     name: "Backend",
//     icon: "⚙️",
//     color: "bg-purple-50 border-purple-200 text-purple-700",
//   },
//   {
//     name: "DevOps",
//     icon: "🚀",
//     color: "bg-green-50 border-green-200 text-green-700",
//   },
//   {
//     name: "ML",
//     icon: "🧠",
//     color: "bg-orange-50 border-orange-200 text-orange-700",
//   },
// ];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 md:py-20 px-4 md:px-6 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-12 md:mb-16">
          <h2 className="font-mono text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-black dark:text-white tracking-tight">
            How Enum Works
          </h2>
          <p className="text-gray-700 dark:text-gray-400 text-xs md:text-sm font-mono tracking-[0.05em] max-w-2xl">
            Production-style simulations that train you for real engineering
            work
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-20">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-700 rounded-none p-6 md:p-8 hover:border-gray-300 dark:hover:border-gray-400 transition-all h-full">
                {/* Icon */}
                <div className="mb-4 text-black dark:text-white inline-flex items-center justify-center w-12 h-12 border border-gray-300 dark:border-gray-600 rounded-none">
                  {step.icon}
                </div>

                {/* Title */}
                <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-black dark:text-white">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-gray-700 dark:text-gray-400 text-sm md:text-base leading-relaxed text-justify">
                  {step.description}
                </p>
              </div>

              {/* Arrow between steps (hidden on last item and below lg desktop screen) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 left-full ml-1 -translate-y-1/2 w-6 h-6 items-center justify-center bg-white dark:bg-[#0c0c0c] border border-gray-200 dark:border-white/10 text-black dark:text-white z-10 rounded-none shadow-sm">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

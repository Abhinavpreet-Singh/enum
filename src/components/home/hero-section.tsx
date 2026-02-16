"use client";

import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden bg-white pt-14">
      {/* Visible Grid Background */}
      <div className="absolute inset-0 opacity-[0.07]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, #000 1px, transparent 1px),
              linear-gradient(to bottom, #000 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center">
        {/* ENUM Logo */}
        <h1
          className="font-bold text-[150px] md:text-[140px] lg:text-[200px] leading-none mb-8 flex"
          style={{ letterSpacing: "-0.08em", transform: "scaleX(0.9)" }}
        >
          <span>E</span>
          <span className="italic font-medium">N</span>
          <span>U</span>
          <span>M</span>
        </h1>

        {/* Tagline */}
        <p className="font-mono text-xs tracking-[0.25em] text-gray-500 mb-10">
          PRODUCTION <span className="text-black">•</span> SIMULATION{" "}
          <span className="text-black">•</span> TRAINING
        </p>

        {/* Launch Environment Button */}
        <Link
          href="/start"
          className="px-12 py-3 bg-black text-white font-mono text-sm tracking-[0.15em] hover:bg-gray-900 transition-colors"
        >
          LAUNCH ENVIRONMENT
        </Link>
      </div>

      {/* System Overview Indicator */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <p className="font-mono text-xs tracking-[0.2em] text-gray-400">
          SYSTEM OVERVIEW
        </p>
        <div className="w-px h-8 bg-gray-200" />
      </div>
    </section>
  );
}

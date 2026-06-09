"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Phase = "hidden" | "logo" | "tagline" | "loading" | "exit";

export default function SplashPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("hidden");

  useEffect(() => {
    const t0 = setTimeout(() => setPhase("logo"), 100);
    const t1 = setTimeout(() => setPhase("tagline"), 900);
    const t2 = setTimeout(() => setPhase("loading"), 1700);
    const t3 = setTimeout(() => setPhase("exit"), 2800);
    const t4 = setTimeout(() => router.push("/login"), 3200);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [router]);

  return (
    <div
      className={`relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white select-none transition-opacity duration-500 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 enum-glow" />
      {/* Grid texture — matches main site */}
      <div className="pointer-events-none absolute inset-0 enum-grid-bg" />

      <div className="relative z-10 flex flex-col items-center">
        {/* ENUM logo */}
        <div
          className={`transition-all duration-700 ease-out ${
            phase === "hidden"
              ? "opacity-0 scale-90 translate-y-4"
              : "opacity-100 scale-100 translate-y-0"
          }`}
        >
          <span
            className="text-7xl font-black text-[#0a0a0a]"
            style={{
              letterSpacing: "-0.06em",
              transform: "scaleX(0.92)",
              display: "inline-block",
              fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
            }}
          >
            enum
          </span>
        </div>

        {/* Tagline */}
        <div
          className={`mt-4 transition-all duration-500 ease-out ${
            phase === "tagline" || phase === "loading" || phase === "exit"
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3"
          }`}
        >
          <p className="text-xs font-medium tracking-[0.3em] uppercase text-gray-400">
            Secure Examination Client
          </p>
        </div>

        {/* Loading bar */}
        <div
          className={`mt-12 w-48 transition-all duration-300 ${
            phase === "loading" || phase === "exit" ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="h-px w-full overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-[#0a0a0a]"
              style={{
                animation:
                  phase === "loading" || phase === "exit"
                    ? "loadbar 1.4s ease-in-out forwards"
                    : "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* Version + branding badge */}
      <div className="absolute bottom-6 flex items-center gap-3 text-xs text-gray-400">
        <span
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            letterSpacing: "0.08em",
          }}
        >
          v0.1.0
        </span>
        <span className="opacity-50">·</span>
        <span>enum.live</span>
      </div>
    </div>
  );
}

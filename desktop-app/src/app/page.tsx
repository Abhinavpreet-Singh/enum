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
      className={`flex min-h-screen flex-col items-center justify-center bg-black select-none transition-opacity duration-500 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Grid background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* ENUM logo */}
        <div
          className={`transition-all duration-700 ease-out ${
            phase === "hidden"
              ? "opacity-0 scale-90 translate-y-4"
              : "opacity-100 scale-100 translate-y-0"
          }`}
        >
          <div className="flex items-baseline gap-0.5">
            <span
              className="text-7xl font-black text-white"
              style={{
                letterSpacing: "-0.06em",
                transform: "scaleX(0.92)",
                display: "inline-block",
                fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
              }}
            >
              enum
            </span>
          </div>
        </div>

        {/* Tagline */}
        <div
          className={`mt-4 transition-all duration-500 ease-out ${
            phase === "tagline" || phase === "loading" || phase === "exit"
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3"
          }`}
        >
          <p className="text-xs font-medium tracking-[0.3em] uppercase text-gray-500">
            Secure Examination Client
          </p>
        </div>

        {/* Loading bar */}
        <div
          className={`mt-12 w-48 transition-all duration-300 ${
            phase === "loading" || phase === "exit" ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="h-px w-full bg-white/10 overflow-hidden rounded-full">
            <div
              className="h-full bg-white/60 rounded-full"
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

      {/* Version badge */}
      <div className="absolute bottom-6 flex items-center gap-3 text-xs text-gray-700">
        <span>v0.1.0</span>
        <span>·</span>
        <span>enum.live</span>
      </div>

      <style>{`
        @keyframes loadbar {
          0%   { width: 0%; opacity: 1; }
          80%  { width: 100%; opacity: 1; }
          100% { width: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

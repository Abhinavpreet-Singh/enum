"use client";

import { useState } from "react";
import { Crown, Cpu, Layout, Server, Terminal, Hash, ArrowRight, Check } from "lucide-react";
import Link from "next/link";

type Currency = "INR" | "USD";

const TRACKS_INFO = [
  {
    key: "system-design",
    title: "System Design",
    description: "System design, microservices, caches, and database scaling.",
    icon: Cpu,
    href: "/dashboard/simulations",
  },
  {
    key: "frontend",
    title: "Frontend Mastery",
    description: "React internals, DOM debugging, performance, and CSS.",
    icon: Layout,
    href: "/dashboard/simulations",
  },
  {
    key: "backend",
    title: "Backend Engineering",
    description: "REST APIs, auth, database modeling, and production Node.",
    icon: Server,
    href: "/dashboard/simulations",
  },
  {
    key: "linux",
    title: "Linux & Shell",
    description: "Shell scripting, pipes, processes, and terminal labs.",
    icon: Terminal,
    href: "/dashboard/simulations",
  },
  {
    key: "dsa",
    title: "DSA Arena",
    description: "Data structures, algorithms, complexity, and dynamic programming.",
    icon: Hash,
    href: "/dashboard/dsa-arena",
  },
];

export default function PricingSection() {
  const [currency, setCurrency] = useState<Currency>("INR");

  const prices = {
    pro: currency === "INR" ? "₹499" : "$9.00",
    track: currency === "INR" ? "₹199" : "$4.00",
  };

  return (
    <section id="premium" className="pt-4 pb-12 md:pt-6 md:pb-16 px-4 md:px-6 bg-white dark:bg-black border-t border-gray-100 dark:border-white/5 relative">
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="font-mono text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-black dark:text-white tracking-tight">
              Premium Plans
            </h2>
            <p className="text-gray-700 dark:text-gray-400 text-sm md:text-base font-mono tracking-[0.05em] max-w-2xl">
              Unlock lifetime access to expert learning tracks and interactive simulations
            </p>
          </div>

          {/* Boxy Currency Switcher */}
          <div className="flex items-center border border-black dark:border-white p-0.5 bg-gray-50 dark:bg-[#111] rounded-none self-start sm:self-end">
            <button
              id="currency-toggle-inr"
              type="button"
              onClick={() => setCurrency("INR")}
              className={`px-3 py-1 font-mono text-[10px] md:text-xs uppercase tracking-wider font-semibold transition-all duration-150 rounded-none cursor-pointer ${
                currency === "INR"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-gray-400 hover:text-black dark:hover:text-white"
              }`}
            >
              INR (₹)
            </button>
            <button
              id="currency-toggle-usd"
              type="button"
              onClick={() => setCurrency("USD")}
              className={`px-3 py-1 font-mono text-[10px] md:text-xs uppercase tracking-wider font-semibold transition-all duration-150 rounded-none cursor-pointer ${
                currency === "USD"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-gray-400 hover:text-black dark:hover:text-white"
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>

        {/* Pricing Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_2fr] gap-6 items-stretch">
          
          {/* Entire Card Clickable: Enum Pro Link */}
          <Link
            href="/dashboard/pro?product=full-pro"
            className="group relative border border-black dark:border-white bg-black dark:bg-[#080808] text-white flex flex-col justify-between p-6 md:p-8 rounded-none shadow-sm transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer select-none"
          >
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-1.5 border border-white/20 bg-white/5 text-white px-2.5 py-0.5 font-mono text-[9px] md:text-xs uppercase tracking-widest font-semibold rounded-none">
                  <Crown className="w-3 h-3 text-amber-500" />
                  Best Value
                </div>
                <span className="font-mono text-[9px] md:text-xs uppercase tracking-widest text-gray-500">
                  lifetime access
                </span>
              </div>

              <h4 className="text-3xl font-bold tracking-tight font-sans">Enum Pro</h4>
              <p className="mt-1.5 text-xs md:text-sm text-gray-400 max-w-xs leading-normal">
                Unlock all premium tracks, sandbox environments, and multiplayer systems forever.
              </p>

              {/* Price Display */}
              <div className="mt-6 flex items-baseline gap-1 border-b border-white/10 pb-6">
                <span className="text-5xl font-extrabold tracking-tight">
                  {prices.pro}
                </span>
                <span className="font-mono text-xs text-gray-400 tracking-wider">
                  / one-time
                </span>
              </div>

              {/* Feature List */}
              <ul className="mt-6 space-y-3">
                {[
                  "All premium tracks included",
                  "All current & future simulations",
                  "Interactive terminal playbox",
                  "Multiplayer collaboration rooms",
                  "Priority support & certificates",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start text-xs md:text-sm text-gray-300">
                    <Check className="w-3.5 h-3.5 text-white mr-2.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8">
              <span className="flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-black px-4 py-2.5 font-mono text-[10px] md:text-xs uppercase tracking-widest font-semibold rounded-none transition-colors w-full text-center">
                Get Full Access <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* Individual Tracks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-3 gap-4 h-full">
            {TRACKS_INFO.map((track) => {
              return (
                <Link
                  key={track.key}
                  href={`${track.href}?product=track-${track.key}`}
                  className="group border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0c0c0c] hover:border-black dark:hover:border-white/30 p-5 rounded-none flex flex-col justify-between gap-5 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-sm select-none"
                >
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <h4 className="text-base font-bold text-black dark:text-white group-hover:text-black dark:group-hover:text-white transition-colors">
                        {track.title}
                      </h4>
                      <span className="font-mono text-[9px] md:text-xs uppercase tracking-widest text-black dark:text-white border border-gray-200 dark:border-white/10 px-2 py-0.5 rounded-none font-semibold bg-gray-50 dark:bg-zinc-900/50 shrink-0">
                        {prices.track}
                      </span>
                    </div>
                    <p className="mt-1 text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-normal">
                      {track.description}
                    </p>
                  </div>

                  <span className="flex items-center gap-1.5 text-black dark:text-white font-mono text-[8px] md:text-[9px] uppercase tracking-widest font-semibold hover:gap-2 transition-all self-start">
                    Explore Track <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              );
            })}

            {/* Boxy Info Card */}
            <div className="border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#0c0c0c]/10 p-5 rounded-none flex flex-col justify-center text-center">
              <p className="font-mono text-[9px] md:text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
                not sure?
              </p>
              <h5 className="text-sm font-bold text-black dark:text-white">
                Start with Free Items
              </h5>
              <p className="mt-1 text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-[180px] mx-auto leading-normal">
                First 2 items of each track are free.
              </p>
              <Link
                href="/dashboard/simulations"
                className="mt-3 text-xs md:text-sm font-mono font-semibold text-black dark:text-white underline hover:opacity-80"
              >
                Start Training
              </Link>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

"use client";

import { ArrowRight, Clock, ChevronRight } from "lucide-react";

interface DashboardContentProps {
  userName?: string;
}

export default function DashboardContent({
  userName = localStorage.getItem("Name") || "Guest",
}: DashboardContentProps) {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-black mb-2">
          Welcome back, {userName}.
        </h1>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-sm text-gray-700">
              Frontend Track
            </span>
            <span className="font-mono text-sm font-bold text-black">68%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-black rounded-full"
              style={{ width: "68%" }}
            />
          </div>
        </div>
      </div>

      {/* In Progress Section */}
      <div>
        <h2 className="font-mono text-xs tracking-[0.2em] text-gray-500 mb-4">
          IN PROGRESS
        </h2>
        <div className="border border-gray-300 rounded-lg p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="font-mono text-xs text-gray-600">
                  Time Spent: 18m
                </span>
              </div>
              <h3 className="text-xl font-bold text-black mb-2">
                Frontend: Homepage Crash
              </h3>
              <p className="text-sm text-gray-600">
                Fixing hydration mismatch in Navigation component.
              </p>
            </div>
            <button className="px-6 py-2.5 bg-black text-white font-mono text-xs tracking-wider hover:bg-gray-900 transition-colors flex items-center gap-2 whitespace-nowrap">
              Resume
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Recommended Section */}
      <div>
        <h2 className="font-mono text-xs tracking-[0.2em] text-gray-500 mb-4">
          RECOMMENDED FOR YOU
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1 */}
          <div className="border border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 font-mono text-xs tracking-wide">
                BACKEND
              </span>
              <div className="flex items-center gap-1 text-gray-500">
                <Clock className="w-4 h-4" />
                <span className="font-mono text-xs">90 mins</span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-black mb-2">
              Memory Leak Investigation
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Node.js process crashing under load. Identify the leak using heap
              snapshots.
            </p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-gray-600">
                Difficulty:{" "}
                <span className="text-black font-semibold">Hard</span>
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="border border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 font-mono text-xs tracking-wide">
                FRONTEND
              </span>
              <div className="flex items-center gap-1 text-gray-500">
                <Clock className="w-4 h-4" />
                <span className="font-mono text-xs">30 mins</span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-black mb-2">
              CSS Grid Layout Bug
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Product grid breaking on Safari. Fix flex/grid compat issues.
            </p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-gray-600">
                Difficulty:{" "}
                <span className="text-black font-semibold">Easy</span>
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors" />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div>
        <h2 className="font-mono text-xs tracking-[0.2em] text-gray-500 mb-4">
          PERFORMANCE STATS
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-gray-300 rounded-lg p-6">
            <p className="font-mono text-xs text-gray-500 mb-2">Completed</p>
            <p className="text-3xl font-bold text-black">12</p>
          </div>
          <div className="border border-gray-300 rounded-lg p-6">
            <p className="font-mono text-xs text-gray-500 mb-2">Avg Score</p>
            <p className="text-3xl font-bold text-black">84%</p>
          </div>
          <div className="border border-gray-300 rounded-lg p-6">
            <p className="font-mono text-xs text-gray-500 mb-2">Accuracy</p>
            <p className="text-3xl font-bold text-green-600">High</p>
          </div>
          <div className="border border-gray-300 rounded-lg p-6">
            <p className="font-mono text-xs text-gray-500 mb-2">Regression</p>
            <p className="text-3xl font-bold text-blue-600">Strong</p>
          </div>
        </div>
      </div>

      {/* User Profile Card (Mobile) */}
      <div className="lg:hidden border border-gray-300 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-500 rounded-full" />
          <div>
            <p className="font-bold text-black">{userName}</p>
            <p className="text-xs text-gray-500">Pro Member</p>
          </div>
        </div>
        <div className="space-y-2">
          <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md font-mono transition-colors">
            Settings
          </button>
          <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md font-mono transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

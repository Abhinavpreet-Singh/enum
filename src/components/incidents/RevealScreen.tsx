"use client";

import { ChevronLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { IncidentSimulation, IncidentSession } from "@/types/incident";

interface RevealScreenProps {
  incident: IncidentSimulation;
  session: IncidentSession;
  onClose: () => void;
}

export default function RevealScreen({
  incident,
  session,
  onClose,
}: RevealScreenProps) {
  const completionTime = Math.floor(session.elapsedTime);
  const totalTime = incident.durationSeconds;
  const completionPercent = Math.round((completionTime / totalTime) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col">
      {/* Header */}
      <div className="border-b border-purple-700 px-6 py-4 flex items-center gap-3">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-purple-200 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Simulations</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-2xl w-full">
          {/* Completion Badge */}
          <div className="text-center mb-8">
            <div className="inline-block px-4 py-2 rounded-full bg-green-500/20 border border-green-400/50 mb-4">
              <span className="text-green-300 font-semibold text-sm">
                ✓ Incident Simulation Complete
              </span>
            </div>

            <h1 className="text-4xl font-bold text-white mb-2">Great Work!</h1>
            <p className="text-purple-200">
              You resolved the incident in {completionTime} seconds ({completionPercent}% of allocated time)
            </p>
          </div>

          {/* Reveal Card */}
          <div className="bg-white/10 backdrop-blur rounded-xl border border-white/20 p-8 mb-8">
            {/* Real Incident Title */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">
                {incident.revealTitle}
              </h2>
              <p className="text-purple-300 text-lg font-semibold">
                {incident.realIncidentName}
              </p>
              <p className="text-purple-400 text-sm">
                {incident.realIncidentDate}
              </p>
            </div>

            {/* Separator */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent my-6" />

            {/* Reveal Description */}
            <div className="space-y-4 mb-8">
              <p className="text-white/90 leading-relaxed text-base">
                {incident.realIncidentDesc}
              </p>
            </div>

            {/* Key Takeaways */}
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-6">
              <h3 className="text-white font-semibold text-sm mb-3">
                Key Lessons Learned
              </h3>
              <ul className="space-y-2 text-sm text-blue-100">
                <li>
                  • Complex patterns can cause catastrophic backtracking in regex engines
                </li>
                <li>
                  • Gradual rollouts and canary deployments catch issues early
                </li>
                <li>
                  • Real-time metrics are crucial for incident response
                </li>
                <li>
                  • Thorough testing prevents security-related issues
                </li>
              </ul>
            </div>

            {/* Link to Real Incident */}
            {incident.realIncidentLink && (
              <div>
                <a
                  href={incident.realIncidentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/50 hover:border-purple-400/70 text-purple-300 hover:text-purple-200 transition-colors font-medium text-sm"
                >
                  <span>Learn More About This Incident</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          {/* Score Breakdown */}
          {session.totalScore > 0 && (
            <div className="mb-8 p-4 rounded-lg bg-blue-500/20 border border-blue-400/30">
              <h3 className="text-white font-semibold mb-3">Score Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-blue-100">
                  <span>Correct Diagnosis:</span>
                  <span className="font-semibold">
                    {session.diagnosticScore} pts
                  </span>
                </div>
                <div className="flex justify-between text-blue-100">
                  <span>Effective Actions:</span>
                  <span className="font-semibold">{session.actionScore} pts</span>
                </div>
                <div className="flex justify-between text-blue-100">
                  <span>Speed Bonus:</span>
                  <span className="font-semibold">
                    {session.timeBonusScore} pts
                  </span>
                </div>
                <div className="h-px bg-blue-400/30 my-2" />
                <div className="flex justify-between text-blue-200">
                  <span className="font-semibold">Total Score:</span>
                  <span className="text-lg font-bold">
                    {session.totalScore} pts
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* XP Earned */}
          <div className="text-center mb-8 p-4 rounded-lg bg-purple-500/20 border border-purple-400/30">
            <p className="text-purple-200 text-sm mb-1">
              {session.correctDiagnosis ? "XP Earned" : "Better Luck Next Time"}
            </p>
            <p
              className={`text-3xl font-bold ${
                session.correctDiagnosis ? "text-green-400" : "text-gray-400"
              }`}
            >
              {session.correctDiagnosis
                ? `+${incident.xpReward}`
                : `+0 (Incorrect Diagnosis)`}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex gap-4 justify-center">
            <Link
              href="/dashboard/simulations"
              className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
            >
              Back to Simulations
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20 transition-colors"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-purple-700 px-6 py-4 text-center text-sm text-purple-300">
        <p>
          Want to tackle more incidents? Start the next one or review your
          progress.
        </p>
      </div>
    </div>
  );
}

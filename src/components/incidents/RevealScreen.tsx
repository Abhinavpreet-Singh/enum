"use client";

import { ChevronLeft, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import type { IncidentSimulation, IncidentSession } from "@/types/incident";
import { getHypothesisLabel } from "./incident-display";
import {
  buildRemediationDebrief,
  getImpactLabel,
  type RemediationImpact,
} from "./incident-remediation";

interface RevealScreenProps {
  incident: IncidentSimulation;
  session: IncidentSession;
  scenarioLabel?: string;
  xpEarned?: number;
  xpAlreadyAwarded?: boolean;
  onTryAgain?: () => void;
  onClose: () => void;
}

const impactDot: Record<RemediationImpact, string> = {
  best: "bg-emerald-500",
  good: "bg-sky-500",
  partial: "bg-amber-500",
  low: "bg-gray-400",
};

export default function RevealScreen({
  incident,
  session,
  scenarioLabel,
  xpEarned,
  xpAlreadyAwarded,
  onTryAgain,
  onClose,
}: RevealScreenProps) {
  const completionTime = Math.floor(session.elapsedTime);
  const totalTime = incident.durationSeconds;
  const completionPercent = Math.round((completionTime / totalTime) * 100);
  const correctDx = session.correctDiagnosis;
  const displayXp = xpEarned ?? 0;
  const xpAlreadyClaimed =
    Boolean(xpAlreadyAwarded) ||
    (correctDx && displayXp === 0 && Boolean(session.xpAwarded));

  const chosenCause = incident.rootCauseOptions.find(
    (r) => r.id === session.selectedRootCauseId,
  );
  const { chosen, chosenMeta, comparisons } = buildRemediationDebrief(
    incident.actionOptions,
    session.actionsTaken?.[0]?.actionId,
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fafafa] dark:bg-black">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200/80 bg-white px-4 py-3 dark:border-white/10 dark:bg-black">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 font-mono text-xs text-gray-500 hover:text-black dark:hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Incidents
        </button>
        {scenarioLabel && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            {scenarioLabel}
          </span>
        )}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto w-full max-w-xl space-y-5 pb-6">
          {/* Hero */}
          <div className="text-center">
            <p
              className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] font-medium ${
                correctDx
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200"
              }`}
            >
              {correctDx ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {correctDx ? "Strong run" : "Learning run"}
            </p>
            <h1 className="font-mono text-2xl font-bold tracking-tight text-black dark:text-white">
              Incident results
            </h1>
            <p className="mt-1 font-mono text-xs text-gray-500">
              {completionTime}s · {completionPercent}% of {totalTime}s window
            </p>
          </div>

          {/* Your choices */}
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#0a0a0a]">
            <div className="border-b border-gray-100 px-4 py-2.5 dark:border-white/10">
              <h2 className="font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Your report
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              <div className="px-4 py-3">
                <p className="font-mono text-[10px] uppercase text-gray-400">
                  Hypothesis
                </p>
                <p className="mt-0.5 font-mono text-sm text-black dark:text-white">
                  {chosenCause
                    ? getHypothesisLabel(chosenCause)
                    : "—"}
                </p>
                <p
                  className={`mt-1 font-mono text-[11px] ${
                    correctDx
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {correctDx ? "Correct root cause" : "Incorrect root cause"}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="font-mono text-[10px] uppercase text-gray-400">
                  Remediation (1 allowed)
                </p>
                {chosen && chosenMeta ? (
                  <>
                    <p className="mt-0.5 font-mono text-sm text-black dark:text-white">
                      {chosen.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      {chosenMeta.summary}
                    </p>
                  </>
                ) : (
                  <p className="mt-0.5 text-xs text-gray-500">No action taken</p>
                )}
              </div>
            </div>
          </section>

          {/* Why this vs others */}
          <section className="rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#0a0a0a]">
            <div className="border-b border-gray-100 px-4 py-2.5 dark:border-white/10">
              <h2 className="font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Remediation comparison
              </h2>
              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                Why some fixes fit this outage better than others.
              </p>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-white/10">
              {comparisons.map(({ action, meta, isChosen }) => (
                <li
                  key={action.id}
                  className={`px-4 py-3 ${isChosen ? "bg-gray-50/80 dark:bg-white/[0.04]" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${impactDot[meta.impact]}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-xs font-semibold text-black dark:text-white">
                          {action.title}
                        </p>
                        <span className="font-mono text-[9px] uppercase text-gray-400">
                          {getImpactLabel(meta.impact)}
                        </span>
                        {isChosen && (
                          <span className="rounded bg-black px-1.5 py-0.5 font-mono text-[9px] text-white dark:bg-white dark:text-black">
                            Your pick
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        {meta.detail}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Real incident */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#0a0a0a]">
            <p className="font-mono text-[10px] uppercase tracking-wider text-gray-400">
              Inspired by
            </p>
            <h3 className="mt-1 font-mono text-base font-bold text-black dark:text-white">
              {incident.revealTitle}
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {incident.realIncidentName} · {incident.realIncidentDate}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              {incident.realIncidentDesc}
            </p>
            {incident.realIncidentLink && (
              <a
                href={incident.realIncidentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] text-black underline-offset-2 hover:underline dark:text-white"
              >
                Read more
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </section>

          {/* Scores */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Diagnosis", value: session.diagnosticScore },
              { label: "Remediation", value: session.actionScore },
              { label: "Speed", value: session.timeBonusScore },
              { label: "Total", value: session.totalScore, highlight: true },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border border-gray-200 bg-white p-3 text-center dark:border-white/10 dark:bg-[#0a0a0a] ${
                  item.highlight ? "ring-1 ring-black/10 dark:ring-white/20" : ""
                }`}
              >
                <p className="font-mono text-[10px] uppercase text-gray-400">
                  {item.label}
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-black dark:text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </section>

          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-5 text-center dark:border-white/20 dark:bg-[#0a0a0a]">
            <p className="font-mono text-[10px] uppercase tracking-wider text-gray-400">
              XP earned
            </p>
            <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-black dark:text-white">
              {displayXp > 0 ? `+${displayXp}` : "0"}
            </p>
            {xpAlreadyClaimed && (
              <p className="mt-1 text-[11px] text-gray-500">
                XP already earned — retry for practice only.
              </p>
            )}
            {(session.attempts ?? 0) > 1 && (
              <p className="mt-1 font-mono text-[10px] text-gray-400">
                Attempt {(session.attempts ?? 0)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {onTryAgain ? (
              <button
                type="button"
                onClick={onTryAgain}
                className="rounded-lg bg-black py-3 text-center font-mono text-xs font-medium text-white dark:bg-white dark:text-black"
              >
                {xpAlreadyClaimed || (session.xpAwarded && displayXp === 0)
                  ? "Try again (practice)"
                  : "Try again"}
              </button>
            ) : (
              <Link
                href="/dashboard/incidents"
                className="rounded-lg bg-black py-3 text-center font-mono text-xs font-medium text-white dark:bg-white dark:text-black"
              >
                Try another incident
              </Link>
            )}
            <Link
              href="/dashboard/incidents"
              className="rounded-lg border border-gray-200 bg-white py-3 text-center font-mono text-xs dark:border-white/20 dark:bg-[#0a0a0a]"
            >
              All incidents
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

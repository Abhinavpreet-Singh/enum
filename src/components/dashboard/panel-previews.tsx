"use client";

/** Fills the card’s flex region — height comes from parent, not a fixed px */
const previewFrame =
  "dash-preview-frame pointer-events-none relative min-h-[5.75rem] w-full flex-1 overflow-hidden rounded-md border border-zinc-200/90 bg-linear-to-b from-zinc-50/95 to-zinc-100/40 dark:border-zinc-700/70 dark:from-zinc-900/55 dark:to-zinc-950/90";

const INCIDENT_LOGS = [
  "ERROR 502 upstream",
  "cpu_usage 94%",
  "rollback started",
  "pool exhausted",
];

/** DSA — code snippet + test cases passing */
export function DsaTestRunnerPreview() {
  const cases = [
    { id: "case_1", ms: "12ms" },
    { id: "case_2", ms: "8ms" },
    { id: "case_3", ms: "—" },
  ];

  return (
    <div className={previewFrame} aria-hidden>
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/30 to-transparent dsa-scan-sweep" />
      <div className="flex h-full min-h-0">
        {/* Code pane */}
        <div className="flex w-[52%] min-w-0 flex-col border-r border-zinc-200/80 bg-zinc-900/[0.03] dark:border-zinc-700/80 dark:bg-black/30">
          <div className="shrink-0 border-b border-zinc-200/60 px-1.5 py-0.5 dark:border-zinc-700/60">
            <span className="font-mono text-[6px] uppercase tracking-wider text-zinc-400">
              solution.py
            </span>
          </div>
          <pre className="dsa-code-block flex-1 overflow-hidden px-1.5 py-1 font-mono text-[7px] leading-[1.55] text-zinc-600 dark:text-zinc-300">
            <code>
              <span className="text-violet-600/90 dark:text-violet-400">def</span>{" "}
              <span className="text-zinc-800 dark:text-zinc-100">twoSum</span>(nums, t):
              {"\n"}
              <span className="text-zinc-400"> </span> seen = {"{}"}
              {"\n"}
              <span className="text-zinc-400"> </span>{" "}
              <span className="text-violet-600/90 dark:text-violet-400">for</span> i, n{" "}
              <span className="text-violet-600/90 dark:text-violet-400">in</span>{" "}
              <span className="text-violet-600/90 dark:text-violet-400">
                enumerate
              </span>
              (nums):
              {"\n"}
              <span className="text-zinc-400"> </span>{" "}
              <span className="dsa-code-caret ml-px inline-block h-2.5 w-px bg-emerald-500 align-middle" />
            </code>
          </pre>
        </div>

        {/* Judge / tests pane */}
        <div className="flex min-w-0 flex-1 flex-col bg-white/50 dark:bg-zinc-950/40">
          <div className="shrink-0 border-b border-zinc-200/60 px-1.5 py-0.5 dark:border-zinc-700/60">
            <span className="font-mono text-[6px] uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/80">
              Judge
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-center gap-1 px-1.5 py-1">
            {cases.map((c, i) => (
              <div
                key={c.id}
                className="dsa-test-row flex items-center justify-between gap-1 rounded border border-zinc-200/70 bg-white/60 px-1.5 py-1 dark:border-zinc-700/70 dark:bg-zinc-900/50"
                style={{ animationDelay: `${i * 1.1}s` }}
              >
                <span className="flex min-w-0 items-center gap-1 font-mono text-[7px] text-zinc-500 dark:text-zinc-400">
                  <span className="dsa-test-row-check text-emerald-600 dark:text-emerald-400">
                    ✓
                  </span>
                  <span className="dsa-test-row-dot text-zinc-400">○</span>
                  <span className="truncate">{c.id}</span>
                </span>
                <span className="dsa-test-row-ms shrink-0 font-mono text-[6px] text-zinc-400">
                  {c.ms}
                </span>
              </div>
            ))}
            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-800">
              <div className="dsa-progress-bar h-full rounded-full bg-emerald-500/80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Incidents — status board + topology + logs (fills height) */
export function IncidentOpsPreview() {
  const services = [
    { id: "fe", label: "FE" },
    { id: "api", label: "API" },
    { id: "wrk", label: "WRK" },
    { id: "db", label: "DB" },
  ];

  return (
    <div className={previewFrame} aria-hidden>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200/70 bg-red-500/[0.06] px-2 py-1 dark:border-zinc-700/70 dark:bg-red-500/[0.08]">
          <span className="incident-status-pill font-mono text-[7px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
            ● Incident active
          </span>
          <span className="font-mono text-[6px] text-zinc-400">P1 · 14:02</span>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-2 px-2 py-2">
          <div className="relative flex items-end gap-1">
            <div className="absolute left-[6%] right-[6%] top-[40%] h-px bg-zinc-300/70 dark:bg-zinc-600 incident-flow-line" />
            {services.map((s, i) => (
              <div
                key={s.id}
                className="relative z-10 flex flex-1 flex-col items-center gap-1"
              >
                <div
                  className="incident-node-pulse h-8 w-full rounded-md border border-zinc-300/50 dark:border-zinc-600"
                  style={{ animationDelay: `${i * 0.6}s` }}
                />
                <span className="font-mono text-[7px] uppercase tracking-wider text-zinc-400">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1">
            <div className="rounded border border-zinc-200/70 bg-white/50 px-1.5 py-1 dark:border-zinc-700 dark:bg-zinc-900/40">
              <p className="font-mono text-[6px] text-zinc-400">error_rate</p>
              <p className="incident-metric-value font-mono text-[9px] font-semibold text-red-600 dark:text-red-400">
                94%
              </p>
            </div>
            <div className="rounded border border-zinc-200/70 bg-white/50 px-1.5 py-1 dark:border-zinc-700 dark:bg-zinc-900/40">
              <p className="font-mono text-[6px] text-zinc-400">latency</p>
              <p className="incident-metric-value font-mono text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                2.4s
              </p>
            </div>
          </div>
        </div>

        <div className="relative h-7 shrink-0 overflow-hidden border-t border-zinc-200/70 bg-zinc-950/[0.03] dark:border-zinc-700 dark:bg-black/40">
          <div className="incident-log-marquee absolute inset-x-0 flex flex-col gap-0.5 px-2 py-1">
            {[...INCIDENT_LOGS, ...INCIDENT_LOGS].map((line, i) => (
              <p
                key={`${line}-${i}`}
                className="shrink-0 font-mono text-[7px] leading-none text-red-600/75 dark:text-red-400/80"
              >
                <span className="text-zinc-500">›</span> {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Simulations — ENUM browser sandbox */
export function SimulationScenePreview() {
  return (
    <div className={previewFrame} aria-hidden>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-1 border-b border-zinc-200/90 bg-zinc-100/90 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800/80">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400/80" />
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
          <span className="ml-1 flex-1 truncate rounded-sm bg-white/80 px-1.5 py-px text-center font-mono text-[7px] text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
            enum.dev/simulate
          </span>
        </div>
        <div className="sim-enum-page relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-white dark:bg-zinc-950">
          <div className="sim-enum-grid pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.08]" />
          <p className="sim-enum-logo relative z-10 text-[13px] font-bold tracking-[0.22em] text-zinc-900 dark:text-white">
            ENUM
          </p>
          <div className="sim-enum-tagline relative z-10 mt-1.5 h-1 w-16 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <div className="sim-enum-cta relative z-10 mt-2.5 h-5 w-[4.5rem] rounded-sm border border-zinc-300/80 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900" />
          <div className="sim-enum-bug pointer-events-none absolute bottom-2.5 right-2.5 rounded border border-red-400/35 bg-red-500/10 px-1.5 py-0.5 font-mono text-[6px] text-red-600/90 dark:text-red-400">
            bug found
          </div>
        </div>
      </div>
    </div>
  );
}

/** Collaboration — full-height editor */
export function CollabLivePreview() {
  return (
    <div className={previewFrame} aria-hidden>
      <div className="absolute inset-0 bg-zinc-900/[0.02] dark:bg-black/25" />
      <div className="absolute inset-0 px-2.5 py-2.5 font-mono text-[9px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
        <p>
          <span className="text-zinc-400/60">1</span>{" "}
          <span className="text-zinc-700 dark:text-zinc-200">function</span> solve()
          {" {"}
        </p>
        <p className="pl-3">
          <span className="text-zinc-400/60">2</span>{" "}
          <span className="text-violet-600/80 dark:text-violet-400/90">return</span>{" "}
          ans;
        </p>
        <p>
          <span className="text-zinc-400/60">3</span> {"}"}
        </p>
      </div>

      <div className="collab-cursor-you absolute right-3 top-3 flex items-center gap-0.5">
        <span className="h-3.5 w-px bg-amber-500 collab-caret-blink" />
        <span className="rounded bg-amber-500/90 px-1.5 py-0.5 font-mono text-[7px] font-medium text-white shadow-sm">
          you
        </span>
      </div>

      <div className="collab-cursor-sam absolute left-[24%] top-[48%] flex items-center gap-0.5">
        <span
          className="h-3.5 w-px bg-violet-500 collab-caret-blink"
          style={{ animationDelay: "0.35s" }}
        />
        <span className="rounded bg-violet-500/90 px-1.5 py-0.5 font-mono text-[7px] font-medium text-white shadow-sm">
          sam
        </span>
      </div>

      <div className="collab-cursor-alex absolute bottom-3 left-[38%] flex items-center gap-0.5">
        <span
          className="h-3.5 w-px bg-emerald-500 collab-caret-blink"
          style={{ animationDelay: "0.65s" }}
        />
        <span className="rounded bg-emerald-500/90 px-1.5 py-0.5 font-mono text-[7px] font-medium text-white shadow-sm">
          alex
        </span>
      </div>
    </div>
  );
}

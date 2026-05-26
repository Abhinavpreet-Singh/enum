/**
 * Refresh incident copy + timeline (no spoilers). Safe to re-run.
 * USAGE (from backend/): node scripts/update-incident-content.js
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL not set. Add it to backend/.env or the repo root .env file.",
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const INCIDENT = {
  title: "Production Outage — v2.4.1",
  description:
    "P1: Error rate and latency jumped right after deploy v2.4.1. Processing CPU is climbing and gateways are timing out. Use logs, metrics, and the timeline to determine what failed — then pick one fix.",
  durationSeconds: 210,
  estimatedTime: 10,
  tags: ["production", "deployment", "cpu", "latency", "on-call"],

  rootCauseOptions: [
    {
      id: "regex_backtracking",
      title: "New deploy change in request validation path",
      description:
        "A rule shipped in v2.4.1 causes catastrophic backtracking in the validation engine under specific payloads.",
      isCorrect: true,
      hint: "Correlate the spike with deploy time and validation timeouts — not the database tier.",
    },
    {
      id: "database_overload",
      title: "Database connection pool saturation",
      description:
        "Connection pool exhaustion from sustained read load on the primary.",
      isCorrect: false,
      hint: "Pool pressure often follows upstream slowness. Check what changed at deploy time.",
    },
    {
      id: "memory_leak",
      title: "Memory pressure in cache tier",
      description: "Unbounded growth in cache memory leading to eviction storms.",
      isCorrect: false,
      hint: "Cache degradation alone rarely pins processing CPU at 100%.",
    },
    {
      id: "ddos_attack",
      title: "Abnormal external traffic pattern",
      description: "Sudden flood of requests from untrusted networks.",
      isCorrect: false,
      hint: "Compare request fingerprints with the deploy window in access logs.",
    },
  ],

  actionOptions: [
    {
      id: "rollback_deployment",
      title: "Rollback deploy v2.4.1",
      description:
        "Revert to last known-good release — removes faulty validation rule at the source.",
      category: "rollback",
      fixesMetrics: ["cpu_usage", "error_rate", "latency_ms"],
      recoveryTime: 45,
      pointsIfCorrect: 100,
      pointsIfWrong: 0,
    },
    {
      id: "bypass_regex",
      title: "Disable new validation rule",
      description:
        "Feature-flag the v2.4.1 rule — fast mitigation without full rollback.",
      category: "investigate",
      fixesMetrics: ["cpu_usage", "error_rate"],
      recoveryTime: 20,
      pointsIfCorrect: 80,
      pointsIfWrong: 0,
    },
    {
      id: "restart_processing",
      title: "Restart processing tier",
      description:
        "Rolling restart — temporary relief; backtracking returns under load.",
      category: "restart",
      fixesMetrics: ["cpu_usage"],
      recoveryTime: 60,
      pointsIfCorrect: 50,
      pointsIfWrong: 0,
    },
  ],
};

const TIMELINE_EVENTS = [
  {
    timeSecond: 0,
    title: "Deploy started",
    description: "Rolling deploy of v2.4.1 begins",
    affectedServices: [],
    metricChanges: {},
    logMessage: "Deploy v2.4.1 initiated",
    priority: "info",
  },
  {
    timeSecond: 2,
    title: "Deploy complete",
    description: "All nodes report new build",
    affectedServices: [],
    metricChanges: {},
    logMessage: "Deploy completed — v2.4.1 active",
    priority: "info",
  },
  {
    timeSecond: 25,
    title: "CPU spike",
    description: "Processing tier CPU climbs sharply",
    affectedServices: ["processing"],
    metricChanges: { cpu_usage: 82 },
    logMessage: "[25:00] WARN: CPU 82% on processing-node-3",
    priority: "warning",
  },
  {
    timeSecond: 38,
    title: "Latency rising",
    description: "Upstream slowness propagates to API layer",
    affectedServices: ["processing", "api_gateway"],
    metricChanges: { latency_ms: 380 },
    logMessage: "[38:00] ERR: Validation stage timeout after 5s",
    priority: "warning",
  },
  {
    timeSecond: 50,
    title: "Error rate spike",
    description: "504s visible at the edge",
    affectedServices: ["api_gateway", "frontend"],
    metricChanges: { error_rate: 28 },
    logMessage: "[50:00] CRIT: Error rate 28% — gateway timeouts",
    priority: "critical",
  },
  {
    timeSecond: 62,
    title: "Processing saturated",
    description: "All processing nodes at CPU limit",
    affectedServices: ["processing"],
    metricChanges: { cpu_usage: 100 },
    logMessage: "[62:00] CRIT: Processing fleet at 100% CPU",
    priority: "critical",
  },
  {
    timeSecond: 75,
    title: "Downstream pressure",
    description: "Cache miss storm increases DB load",
    affectedServices: ["cache", "database"],
    metricChanges: { requests_per_sec: 12000 },
    logMessage: "[75:00] CRIT: DB connection pool exhausted",
    priority: "critical",
  },
  {
    timeSecond: 100,
    title: "Incident declared",
    description: "Majority of requests failing",
    affectedServices: ["api_gateway", "processing", "database"],
    metricChanges: { error_rate: 67 },
    logMessage: "[100:00] CRIT: 67% request failure — P1 declared",
    priority: "critical",
  },
  {
    timeSecond: 130,
    title: "Investigation",
    description: "On-call reviewing deploy diff and logs",
    affectedServices: [],
    metricChanges: {},
    logMessage: "[130:00] Incident bridge open — focus on deploy window",
    priority: "critical",
  },
  {
    timeSecond: 175,
    title: "Signal in logs",
    description: "Validation subsystem implicated in stack traces",
    affectedServices: [],
    metricChanges: {},
    logMessage: "[175:00] WARN: validation-engine hot path — inspect v2.4.1 diff",
    priority: "info",
  },
];

async function main() {
  if (!prisma.incidentSimulation) {
    console.error(
      "Prisma client missing incidentSimulation. Run: cd backend && npx prisma generate",
    );
    process.exit(1);
  }

  const legacyTitles = ["Regex Catastrophe", INCIDENT.title];

  const incident = await prisma.incidentSimulation.findFirst({
    where: { title: { in: legacyTitles } },
  });

  if (!incident) {
    console.log("No matching incident found — run: node scripts/seed-incidents.js");
    process.exit(0);
  }

  await prisma.incidentSimulation.update({
    where: { id: incident.id },
    data: {
      title: INCIDENT.title,
      description: INCIDENT.description,
      durationSeconds: INCIDENT.durationSeconds,
      estimatedTime: INCIDENT.estimatedTime,
      tags: INCIDENT.tags,
      rootCauseOptions: INCIDENT.rootCauseOptions,
      actionOptions: INCIDENT.actionOptions,
    },
  });

  await prisma.incidentTimelineEvent.deleteMany({
    where: { incidentId: incident.id },
  });

  for (const event of TIMELINE_EVENTS) {
    await prisma.incidentTimelineEvent.create({
      data: { incidentId: incident.id, ...event },
    });
  }

  console.log(`✅ Updated "${INCIDENT.title}" (${incident.id})`);
  console.log(`   Duration: ${INCIDENT.durationSeconds}s · ${TIMELINE_EVENTS.length} timeline events`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

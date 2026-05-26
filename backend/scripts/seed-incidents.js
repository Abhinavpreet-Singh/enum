/**
 * Seed script for Historical Incident Simulations
 * 
 * USAGE: node scripts/seed-incidents.js
 * 
 * This script creates sample incident simulations in the database.
 * DO NOT run this automatically - only run manually when needed.
 */

import prisma from "../src/db/index.js";

const SAMPLE_INCIDENTS = [
  {
    title: "Production Outage — v2.4.1",
    description:
      "P1: Error rate and latency jumped right after deploy v2.4.1. Processing CPU is climbing and gateways are timing out. Use logs, metrics, and the timeline to determine what failed — then pick one fix.",
    difficulty: "medium",
    category: "incident",
    simulationType: "production",
    durationSeconds: 210,
    estimatedTime: 10,
    xpReward: 150,
    tags: ["production", "deployment", "cpu", "latency", "on-call"],

    initialServices: [
      {
        id: "frontend",
        name: "Frontend (CDN)",
        status: "healthy",
        color: "#10b981",
      },
      {
        id: "api_gateway",
        name: "API Gateway",
        status: "healthy",
        color: "#10b981",
      },
      {
        id: "processing",
        name: "Processing Engine",
        status: "healthy",
        color: "#10b981",
      },
      { id: "database", name: "Database", status: "healthy", color: "#10b981" },
      { id: "cache", name: "Redis Cache", status: "healthy", color: "#10b981" },
    ],

    initialMetrics: {
      cpu_usage: [
        { timestamp: 0, value: 15 },
      ],
      error_rate: [
        { timestamp: 0, value: 0.5 },
      ],
      latency_ms: [
        { timestamp: 0, value: 45 },
      ],
      requests_per_sec: [
        { timestamp: 0, value: 8500 },
      ],
    },

    initialLogs: [
      "[00:00] System startup complete",
      "[00:00] All services initialized",
      "[00:00] Deployment v2.4.1 started",
      "[00:02] Deployment completed successfully",
    ],

    realIncidentName: "Cloudflare 2019 Regex Outage",
    realIncidentDate: "July 2, 2019",
    realIncidentLink:
      "https://en.wikipedia.org/wiki/Cloudflare_outage",
    realIncidentDesc:
      "Cloudflare's network experienced a global outage lasting 27 minutes. " +
      "A malformed regex pattern in a new deployment caused excessive CPU usage in their WAF (Web Application Firewall), " +
      "affecting all their customers worldwide. The regex engine entered catastrophic backtracking, consuming 100% CPU and " +
      "causing cascading failures across the entire Anycast network.",

    revealTitle: "Based on: Cloudflare 2019 Global Outage",
    revealText:
      "On July 2, 2019, Cloudflare experienced a global outage affecting millions of websites. " +
      "A new regex rule deployed to their Web Application Firewall caused the Perl-Compatible Regular Expressions (PCRE) engine " +
      "to enter catastrophic backtracking. This meant that for certain requests, the regex engine would spin endlessly trying to " +
      "match patterns, consuming 100% CPU. Since this ran on every server in their Anycast network, all servers became unresponsive " +
      "simultaneously, taking the entire network offline. " +
      "\n\n" +
      "Key lessons: (1) Regex patterns should be thoroughly tested, especially in security-critical code; (2) Complex regexes can " +
      "cause algorithmic complexity issues; (3) Gradual rollouts and canary deployments can catch issues before they affect everyone; " +
      "(4) Real-time system metrics and alerts are crucial for incident response.",

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
        description: "Revert to the last known-good release.",
        category: "rollback",
        fixesMetrics: ["cpu_usage", "error_rate", "latency_ms"],
        recoveryTime: 45,
        pointsIfCorrect: 100,
        pointsIfWrong: 0,
      },
      {
        id: "bypass_regex",
        title: "Disable new validation rule",
        description: "Feature-flag off the rule introduced in v2.4.1.",
        category: "investigate",
        fixesMetrics: ["cpu_usage", "error_rate"],
        recoveryTime: 20,
        pointsIfCorrect: 80,
        pointsIfWrong: 0,
      },
      {
        id: "restart_processing",
        title: "Restart processing tier",
        description: "Rolling restart of processing workers.",
        category: "restart",
        fixesMetrics: ["cpu_usage"],
        recoveryTime: 60,
        pointsIfCorrect: 50,
        pointsIfWrong: 0,
      },
    ],
  },
];

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

async function seedIncidents() {
  console.log("🌱 Seeding Historical Incident Simulations...");

  for (const incidentData of SAMPLE_INCIDENTS) {
    try {
      console.log(`\n📝 Creating incident: ${incidentData.title}`);

      // Check if incident already exists
      const existing = await prisma.incidentSimulation.findFirst({
        where: { title: incidentData.title },
      });

      if (existing) {
        console.log(`⏭️  Incident "${incidentData.title}" already exists, skipping...`);
        continue;
      }

      // Create the incident
      const incident = await prisma.incidentSimulation.create({
        data: {
          title: incidentData.title,
          description: incidentData.description,
          difficulty: incidentData.difficulty,
          category: incidentData.category,
          simulationType: incidentData.simulationType,
          durationSeconds: incidentData.durationSeconds,
          estimatedTime: incidentData.estimatedTime,
          xpReward: incidentData.xpReward,
          tags: incidentData.tags,
          initialServices: incidentData.initialServices,
          initialMetrics: incidentData.initialMetrics,
          initialLogs: incidentData.initialLogs,
          realIncidentName: incidentData.realIncidentName,
          realIncidentDate: incidentData.realIncidentDate,
          realIncidentLink: incidentData.realIncidentLink,
          realIncidentDesc: incidentData.realIncidentDesc,
          revealTitle: incidentData.revealTitle,
          revealText: incidentData.revealText,
          rootCauseOptions: incidentData.rootCauseOptions,
          actionOptions: incidentData.actionOptions,
        },
      });

      console.log(`✅ Created incident: ${incident.id}`);

      // Create timeline events
      console.log(`   Creating ${TIMELINE_EVENTS.length} timeline events...`);
      for (const eventData of TIMELINE_EVENTS) {
        const event = await prisma.incidentTimelineEvent.create({
          data: {
            incidentId: incident.id,
            timeSecond: eventData.timeSecond,
            title: eventData.title,
            description: eventData.description,
            affectedServices: eventData.affectedServices,
            metricChanges: eventData.metricChanges,
            logMessage: eventData.logMessage,
            priority: eventData.priority,
          },
        });
        console.log(`   ✓ Event: ${event.title} @ ${event.timeSecond}s`);
      }
    } catch (error) {
      console.error(
        `❌ Error creating incident "${incidentData.title}":`,
        error.message,
      );
    }
  }

  console.log("\n✅ Seeding completed!");
  process.exit(0);
}

// Run the seed
seedIncidents().catch((error) => {
  console.error("🔥 Fatal error during seeding:", error);
  process.exit(1);
});

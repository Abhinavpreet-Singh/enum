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
    title: "Regex Catastrophe",
    description:
      "A malformed regex pattern in a new deployment causes runaway CPU usage, cascading service failures, and timeouts across the entire platform.",
    difficulty: "medium",
    category: "incident",
    simulationType: "production",
    durationSeconds: 300,
    estimatedTime: 15,
    xpReward: 150,
    tags: ["production", "regex", "cpu", "deployment", "debugging"],

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
        title: "Regex Catastrophic Backtracking",
        description: "Malformed regex pattern in deployment v2.4.1 causes PCRE engine to enter infinite backtracking loops",
        isCorrect: true,
        hint: "Check the regex validation rules - especially complex character classes and nested quantifiers.",
      },
      {
        id: "database_overload",
        title: "Database Connection Pool Exhaustion",
        description: "Too many concurrent database connections from API gateway exhausting pool",
        isCorrect: false,
        hint: "This could be a symptom, but not the root cause. Look at what's causing the connection requests.",
      },
      {
        id: "memory_leak",
        title: "Memory Leak in Cache Layer",
        description: "Redis cache memory growing unbounded, causing eviction storms",
        isCorrect: false,
        hint: "Cache would fail gracefully. This wouldn't explain 100% CPU usage.",
      },
      {
        id: "ddos_attack",
        title: "DDoS Attack from External Source",
        description: "Incoming request flood from malicious actor",
        isCorrect: false,
        hint: "Attack would show up in access logs. Check deployment timing instead.",
      },
    ],

    actionOptions: [
      {
        id: "rollback_deployment",
        title: "Rollback Deployment v2.4.1",
        description: "Revert to previous stable version to remove malformed regex",
        category: "rollback",
        fixesMetrics: ["cpu_usage", "error_rate", "latency_ms"],
        recoveryTime: 45,
        pointsIfCorrect: 100,
        pointsIfWrong: 0,
      },
      {
        id: "restart_processing",
        title: "Restart Processing Service",
        description: "Restart the processing engine to clear runaway processes",
        category: "restart",
        fixesMetrics: ["cpu_usage"],
        recoveryTime: 60,
        pointsIfCorrect: 50,
        pointsIfWrong: 0,
      },
      {
        id: "scale_up_api",
        title: "Scale Up API Gateway",
        description: "Add more instances to distribute load",
        category: "scale",
        fixesMetrics: [],
        recoveryTime: 30,
        pointsIfCorrect: 0,
        pointsIfWrong: 10,
      },
      {
        id: "bypass_regex",
        title: "Disable Problematic Regex Rule",
        description: "Temporarily disable the regex validation rule causing backtracking",
        category: "investigate",
        fixesMetrics: ["cpu_usage", "error_rate"],
        recoveryTime: 20,
        pointsIfCorrect: 80,
        pointsIfWrong: 0,
      },
      {
        id: "drain_cache",
        title: "Clear Cache and Restart Cache Service",
        description: "Flush Redis cache and restart service",
        category: "restart",
        fixesMetrics: [],
        recoveryTime: 40,
        pointsIfCorrect: 0,
        pointsIfWrong: 5,
      },
    ],
  },
];

const TIMELINE_EVENTS = [
  {
    timeSecond: 0,
    title: "Deployment begins",
    description: "Rolling deployment of v2.4.1 starts",
    affectedServices: [],
    metricChanges: {},
    logMessage: "Deployment v2.4.1 initiated",
    priority: "info",
  },
  {
    timeSecond: 2,
    title: "Deployment completes",
    description: "All nodes updated with new code",
    affectedServices: [],
    metricChanges: {},
    logMessage: "Deployment completed - v2.4.1 active",
    priority: "info",
  },
  {
    timeSecond: 30,
    title: "CPU spike detected",
    description:
      "Processing Engine CPU usage rises sharply due to regex backtracking",
    affectedServices: ["processing"],
    metricChanges: { cpu_usage: 82 },
    logMessage: "[30:00] WARN: CPU usage spiking (82%) on processing-node-3",
    priority: "warning",
  },
  {
    timeSecond: 45,
    title: "Request latency increasing",
    description: "Slow processing causes API timeouts",
    affectedServices: ["processing", "api_gateway"],
    metricChanges: { latency_ms: 380 },
    logMessage:
      "[45:00] ERR: Processing timeout on regex validation (timeout after 5s)",
    priority: "warning",
  },
  {
    timeSecond: 60,
    title: "Error rate spike",
    description: "Users start experiencing errors and timeouts",
    affectedServices: ["api_gateway", "frontend"],
    metricChanges: { error_rate: 28 },
    logMessage: "[60:00] CRIT: Error rate at 28% - 504 Gateway Timeout",
    priority: "critical",
  },
  {
    timeSecond: 75,
    title: "All processing nodes degraded",
    description: "Processing Engine now at 100% CPU on all nodes",
    affectedServices: ["processing"],
    metricChanges: { cpu_usage: 100 },
    logMessage:
      "[75:00] CRIT: ALL processing nodes at 100% CPU - complete saturation",
    priority: "critical",
  },
  {
    timeSecond: 90,
    title: "Cache misses accelerating",
    description: "High latency causes cache bypass, increasing database load",
    affectedServices: ["cache", "database"],
    metricChanges: { requests_per_sec: 12000 },
    logMessage: "[90:00] CRIT: Database connection pool exhausted",
    priority: "critical",
  },
  {
    timeSecond: 120,
    title: "Service degradation complete",
    description:
      "Most user requests timing out; system barely responsive",
    affectedServices: [
      "api_gateway",
      "processing",
      "database",
    ],
    metricChanges: { error_rate: 67 },
    logMessage: "[120:00] CRIT: 67% of requests failing - incident declared",
    priority: "critical",
  },
  {
    timeSecond: 150,
    title: "Incident investigation begins",
    description: "On-call engineer analyzing logs and metrics",
    affectedServices: [],
    metricChanges: {},
    logMessage:
      "[150:00] Incident: Need to identify root cause. Check recent deployments and logs",
    priority: "critical",
  },
  {
    timeSecond: 200,
    title: "User investigation opportunity",
    description:
      "This is where you would normally start your investigation - look at logs to find the regex issue",
    affectedServices: [],
    metricChanges: {},
    logMessage:
      "[200:00] Logs show regex engine failures - check deployment v2.4.1",
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

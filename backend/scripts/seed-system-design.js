/**
 * Seed script: populates the database with system design simulations.
 *
 * Usage:
 *   node scripts/seed-system-design.js
 *
 * Environment variables (from .env):
 *   DATABASE_URL
 */

import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const simulations = [
  // ─── 1. URL Shortener ─────────────────────────────────────────────────────
  {
    title: "Design a URL Shortener",
    description:
      "Design a URL shortening service similar to TinyURL or bit.ly. Users submit a long URL and receive a short alias (e.g. short.ly/aB3x). The system must handle hundreds of millions of URLs, guarantee uniqueness, resolve redirects in under 50ms, and survive regional outages.",
    difficulty: "medium",
    tags: ["hashing", "caching", "scalability", "database"],
    maxScore: 10,
    evaluationRules: [
      {
        description: "Client is present",
        requiredComponent: "client",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "Load balancer distributes traffic",
        requiredComponent: "load_balancer",
        requiredEdge: "",
        points: 2,
      },
      {
        description: "API server handles logic",
        requiredComponent: "api_server",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "Database stores URL mappings",
        requiredComponent: "database",
        requiredEdge: "",
        points: 2,
      },
      {
        description: "Cache reduces DB reads on hot URLs",
        requiredComponent: "cache",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "Client routes through load balancer",
        requiredComponent: "",
        requiredEdge: "client→load_balancer",
        points: 1,
      },
      {
        description: "Load balancer routes to API servers",
        requiredComponent: "",
        requiredEdge: "load_balancer→api_server",
        points: 1,
      },
      {
        description: "API server reads/writes database",
        requiredComponent: "",
        requiredEdge: "api_server→database",
        points: 1,
      },
    ],
  },

  // ─── 2. Real-Time Chat System ─────────────────────────────────────────────
  {
    title: "Design a Real-Time Chat System",
    description:
      "Design a messaging platform like WhatsApp or Slack that supports one-on-one and group chats. The system must deliver messages in under 100ms, store message history, handle millions of concurrent WebSocket connections, and fan out messages to all members of a group efficiently.",
    difficulty: "hard",
    tags: ["websocket", "pub-sub", "message-queue", "fan-out"],
    maxScore: 12,
    evaluationRules: [
      {
        description: "Client present",
        requiredComponent: "client",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "Load balancer for WebSocket connections",
        requiredComponent: "load_balancer",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "API server handles connections and auth",
        requiredComponent: "api_server",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "Database persists message history",
        requiredComponent: "database",
        requiredEdge: "",
        points: 2,
      },
      {
        description: "Cache stores recent messages and presence",
        requiredComponent: "cache",
        requiredEdge: "",
        points: 2,
      },
      {
        description: "Message queue for async fan-out",
        requiredComponent: "message_queue",
        requiredEdge: "",
        points: 2,
      },
      {
        description: "Client → Load Balancer",
        requiredComponent: "",
        requiredEdge: "client→load_balancer",
        points: 1,
      },
      {
        description: "Load Balancer → API Server",
        requiredComponent: "",
        requiredEdge: "load_balancer→api_server",
        points: 1,
      },
      {
        description: "API Server → Message Queue (fan-out)",
        requiredComponent: "",
        requiredEdge: "api_server→message_queue",
        points: 1,
      },
    ],
  },

  // ─── 3. Video Streaming Platform ──────────────────────────────────────────
  {
    title: "Design a Video Streaming Platform",
    description:
      "Design a platform like YouTube or Netflix that allows users to upload, transcode, and stream videos. The system must serve billions of view requests per day, deliver content with low latency globally, handle adaptive bitrate streaming, and queue transcoding jobs asynchronously.",
    difficulty: "hard",
    tags: ["cdn", "transcoding", "adaptive-streaming", "storage"],
    maxScore: 12,
    evaluationRules: [
      {
        description: "Client present",
        requiredComponent: "client",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "CDN serves video chunks globally",
        requiredComponent: "cdn",
        requiredEdge: "",
        points: 3,
      },
      {
        description: "Load balancer for API traffic",
        requiredComponent: "load_balancer",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "API server handles metadata and uploads",
        requiredComponent: "api_server",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "Database stores video metadata",
        requiredComponent: "database",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "Message queue for transcoding jobs",
        requiredComponent: "message_queue",
        requiredEdge: "",
        points: 2,
      },
      {
        description: "Cache for hot video metadata",
        requiredComponent: "cache",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "Client fetches video from CDN",
        requiredComponent: "",
        requiredEdge: "client→cdn",
        points: 1,
      },
      {
        description: "API Server enqueues transcoding job",
        requiredComponent: "",
        requiredEdge: "api_server→message_queue",
        points: 1,
      },
    ],
  },

  // ─── 4. Ride-Sharing App ──────────────────────────────────────────────────
  {
    title: "Design a Ride-Sharing App",
    description:
      "Design the backend for a ride-sharing service like Uber or Lyft. The system must match riders with nearby drivers in real time using geo-spatial queries, track driver locations (updated every 5s), calculate ETAs, handle surge pricing, and process payments reliably.",
    difficulty: "hard",
    tags: ["geospatial", "pub-sub", "real-time", "matching"],
    maxScore: 11,
    evaluationRules: [
      {
        description: "Client (rider & driver apps) present",
        requiredComponent: "client",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "Load balancer for API traffic",
        requiredComponent: "load_balancer",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "API server for matching and trip logic",
        requiredComponent: "api_server",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "Database for trips, users, payment records",
        requiredComponent: "database",
        requiredEdge: "",
        points: 2,
      },
      {
        description: "Cache for driver locations (geo-index)",
        requiredComponent: "cache",
        requiredEdge: "",
        points: 3,
      },
      {
        description: "Message queue for async notifications",
        requiredComponent: "message_queue",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "Client → Load Balancer",
        requiredComponent: "",
        requiredEdge: "client→load_balancer",
        points: 1,
      },
      {
        description: "API Server reads driver locations from Cache",
        requiredComponent: "",
        requiredEdge: "api_server→cache",
        points: 1,
      },
    ],
  },

  // ─── 5. Social Media Feed ─────────────────────────────────────────────────
  {
    title: "Design a Social Media Feed",
    description:
      "Design the news feed system for a social network similar to Twitter or Instagram. The system must generate personalized feeds for 500M daily active users, support both push (fan-out on write) and pull (fan-out on read) models, rank posts by relevance, and deliver updates in near-real time.",
    difficulty: "hard",
    tags: ["fan-out", "ranking", "caching", "pub-sub", "feed-generation"],
    maxScore: 12,
    evaluationRules: [
      {
        description: "Client present",
        requiredComponent: "client",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "CDN for static assets and media",
        requiredComponent: "cdn",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "Load balancer distributes read/write traffic",
        requiredComponent: "load_balancer",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "API server handles post creation and reads",
        requiredComponent: "api_server",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "Database stores posts and follows",
        requiredComponent: "database",
        requiredEdge: "",
        points: 2,
      },
      {
        description: "Cache stores pre-computed feeds",
        requiredComponent: "cache",
        requiredEdge: "",
        points: 2,
      },
      {
        description: "Message queue fans out posts to followers",
        requiredComponent: "message_queue",
        requiredEdge: "",
        points: 2,
      },
      {
        description: "Client → Load Balancer",
        requiredComponent: "",
        requiredEdge: "client→load_balancer",
        points: 1,
      },
      {
        description: "API Server enqueues fan-out to Message Queue",
        requiredComponent: "",
        requiredEdge: "api_server→message_queue",
        points: 1,
      },
    ],
  },

  // ─── 6. Distributed Rate Limiter ──────────────────────────────────────────
  {
    title: "Design a Distributed Rate Limiter",
    description:
      "Design a rate limiting service that enforces API quotas across a fleet of API servers. It must support multiple algorithms (token bucket, sliding window), share counters across servers without excessive latency, survive cache node failures gracefully, and add no more than 2ms overhead per request.",
    difficulty: "medium",
    tags: ["rate-limiting", "redis", "token-bucket", "distributed-systems"],
    maxScore: 9,
    evaluationRules: [
      {
        description: "Client present",
        requiredComponent: "client",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "Load balancer distributes requests",
        requiredComponent: "load_balancer",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "API server checks rate limit before processing",
        requiredComponent: "api_server",
        requiredEdge: "",
        points: 2,
      },
      {
        description: "Cache (Redis) stores counters/buckets",
        requiredComponent: "cache",
        requiredEdge: "",
        points: 3,
      },
      {
        description: "Database as fallback / config store",
        requiredComponent: "database",
        requiredEdge: "",
        points: 1,
      },
      {
        description: "API Server checks rate state in Cache",
        requiredComponent: "",
        requiredEdge: "api_server→cache",
        points: 1,
      },
    ],
  },
];

async function main() {
  console.log("🌱  Seeding system design simulations...\n");

  let created = 0;
  let skipped = 0;

  for (const sim of simulations) {
    const existing = await prisma.systemDesignSimulation.findFirst({
      where: { title: sim.title },
    });

    if (existing) {
      console.log(`  ⏭  Skipping (already exists): "${sim.title}"`);
      skipped++;
      continue;
    }

    await prisma.systemDesignSimulation.create({ data: sim });
    console.log(`  ✅  Created: "${sim.title}"`);
    created++;
  }

  console.log(`\n✅  Done. Created: ${created}  |  Skipped: ${skipped}`);
}

main()
  .catch((err) => {
    console.error("❌  Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

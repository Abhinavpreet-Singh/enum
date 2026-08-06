import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma client for PostgreSQL (Dokploy / standard deployment).
 * Reuses one connection pool across hot-reloads in development.
 */
const globalForPrisma = globalThis;

/**
 * Prisma sizes its pool at `num_cpus * 2 + 1` unless told otherwise, which is
 * only 5 connections on a 2 vCPU host. Past that the 6th concurrent query waits
 * and then fails with P2024 (pool timeout) even though Postgres itself is idle,
 * so the ceiling has to be raised explicitly for a few hundred concurrent users.
 *
 * Applied here rather than in DATABASE_URL so every environment gets the same
 * pool behaviour without editing a secret-bearing value. Anything already present
 * in the URL wins, so a deployment can still override per-parameter.
 *
 * Keep the total across all app instances below the server's max_connections
 * (default 100), leaving headroom for migrations and admin sessions.
 */
function buildDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  const defaults = {
    connection_limit: process.env.DATABASE_CONNECTION_LIMIT || "20",
    pool_timeout: process.env.DATABASE_POOL_TIMEOUT || "20",
    connect_timeout: process.env.DATABASE_CONNECT_TIMEOUT || "10",
  };

  try {
    const url = new URL(raw);
    for (const [key, value] of Object.entries(defaults)) {
      if (!url.searchParams.has(key)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  } catch {
    // Malformed or non-standard URL: leave it untouched and let Prisma report it.
    return raw;
  }
}

const databaseUrl = buildDatabaseUrl();

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

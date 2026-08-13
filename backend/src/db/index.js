import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma client for PostgreSQL (Dokploy / standard deployment).
 * Reuses one connection pool across hot-reloads in development.
 */
const globalForPrisma = globalThis;

/**
 * Prisma sizes its pool at `num_cpus * 2 + 1` unless told otherwise.
 * Keepalives + light retries help with remote hosts that drop idle sockets
 * (P1017). Never call $disconnect() on retry — that kills in-flight requests
 * and leaves the UI stuck loading.
 */
function buildDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  const defaults = {
    connection_limit: process.env.DATABASE_CONNECTION_LIMIT || "5",
    pool_timeout: process.env.DATABASE_POOL_TIMEOUT || "10",
    connect_timeout: process.env.DATABASE_CONNECT_TIMEOUT || "8",
    keepalives: "1",
    keepalives_idle: process.env.DATABASE_KEEPALIVES_IDLE || "20",
    keepalives_interval: process.env.DATABASE_KEEPALIVES_INTERVAL || "5",
    keepalives_count: process.env.DATABASE_KEEPALIVES_COUNT || "5",
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
    return raw;
  }
}

function isConnectionError(err) {
  if (!err) return false;
  const code = err.code || err.errorCode;
  if (
    code === "P1017" ||
    code === "P1001" ||
    code === "P1002" ||
    code === "P2024"
  ) {
    return true;
  }
  const message = String(err.message || err);
  return (
    message.includes("Server has closed the connection") ||
    message.includes("Connection reset") ||
    message.includes("Can't reach database server") ||
    message.includes("Connection refused") ||
    message.includes("ECONNRESET") ||
    message.includes("closed the connection")
  );
}

async function withConnectionRetry(operation, { retries = 2 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (!isConnectionError(err) || attempt === retries) {
        throw err;
      }
      // Soft reconnect only — do NOT $disconnect() (drops the whole pool).
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
      try {
        await basePrisma.$connect();
      } catch {
        // next attempt will surface the failure if still down
      }
    }
  }
  throw lastError;
}

const databaseUrl = buildDatabaseUrl();

const basePrisma =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

const prisma =
  globalForPrisma.prisma ??
  basePrisma.$extends({
    query: {
      async $allOperations({ args, query }) {
        return withConnectionRetry(() => query(args));
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = basePrisma;
  globalForPrisma.prisma = prisma;
}

export default prisma;

import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma client for PostgreSQL.
 * Reuses one connection pool across hot-reloads in development.
 */
const globalForPrisma = globalThis;

/**
 * Remote hosts (Dokploy/AWS mapped ports) often kill idle TCP sockets in a few
 * seconds. Aggressive libpq keepalives + a lightweight heartbeat keep the pool
 * usable. Do not $disconnect() on retry — that starves in-flight requests.
 */
function buildDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  const defaults = {
    connection_limit: process.env.DATABASE_CONNECTION_LIMIT || "10",
    pool_timeout: process.env.DATABASE_POOL_TIMEOUT || "20",
    connect_timeout: process.env.DATABASE_CONNECT_TIMEOUT || "10",
    // Fire keepalives before short-lived firewalls drop the socket (~2s idle).
    keepalives: "1",
    keepalives_idle: process.env.DATABASE_KEEPALIVES_IDLE || "1",
    keepalives_interval: process.env.DATABASE_KEEPALIVES_INTERVAL || "1",
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
    message.includes("closed the connection") ||
    message.includes("Timed out fetching a new connection")
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
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
      try {
        await basePrisma.$connect();
      } catch {
        // next attempt surfaces the failure if still down
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

function startPoolHeartbeat() {
  if (globalForPrisma.prismaHeartbeat) return;

  const intervalMs = Number(process.env.DATABASE_HEARTBEAT_MS || 1000);
  globalForPrisma.prismaHeartbeat = setInterval(() => {
    basePrisma.$queryRaw`SELECT 1`.catch(() => {
      // Heartbeat failures are expected during brief drops; retry layer recovers.
    });
  }, intervalMs);

  if (typeof globalForPrisma.prismaHeartbeat.unref === "function") {
    globalForPrisma.prismaHeartbeat.unref();
  }
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = basePrisma;
  globalForPrisma.prisma = prisma;
}

startPoolHeartbeat();

export default prisma;

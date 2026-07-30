import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma client for PostgreSQL (Dokploy / standard deployment).
 * Reuses one connection pool across hot-reloads in development.
 */
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

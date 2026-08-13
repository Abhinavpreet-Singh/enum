import "./load-env.js";
import { createServer } from "http";
import { app } from "./app.js";
import prisma from "./db/index.js";
import { setupSocket } from "./socket/index.js";
import { env } from "./config/env.js";

// Prisma client targets PostgreSQL (see prisma/schema.prisma).

// ─── CORS origins (reuse the same list the Express app uses) ────────────────
const normalizeOrigin = (origin) => origin.replace(/\/+$/, "");
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://enum.live",
    "https://www.enum.live",
    "https://exam.enum.live",
    "https://enum0.vercel.app",
    env.FRONTEND_URL,
    ...(env.FRONTEND_URLS || []),
]
    .filter(Boolean)
    .map(normalizeOrigin);

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT) || 8000;

async function connectDatabase() {
    try {
        await prisma.$connect();
        console.log("Prisma connected to PostgreSQL successfully");
    } catch (err) {
        console.error(
            "Prisma connection failed (server will continue; API routes may fail until DB is reachable):",
            err.message,
        );
    }
}

function startServer() {
    const server = createServer(app);

    setupSocket(server, allowedOrigins);

    server.listen(port, host, () => {
        console.log(`Server is listening on http://${host}:${port}`);
        console.log(`Socket.IO is ready on the same port`);
    });

    return server;
}

async function main() {
    // Start HTTP immediately so Dokploy/Traefik health checks succeed even if DB is slow.
    startServer();
    await connectDatabase();
}

main().catch((err) => {
    console.error("Fatal startup error:", err);
    process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
});

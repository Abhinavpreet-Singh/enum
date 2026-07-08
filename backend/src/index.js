import "dotenv/config";
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

async function main() {
    try {
        await prisma.$connect();
        console.log("Prisma connected to PostgreSQL successfully");

        // Create an HTTP server from the Express app so Socket.IO can attach
        const server = createServer(app);

        // Attach Socket.IO to the HTTP server
        setupSocket(server, allowedOrigins);

        const port = Number(process.env.PORT) || 8000;
        server.listen(port, () => {
            console.log(`Server is listening on http://localhost:${port}`);
            console.log(`Socket.IO is ready on the same port`);
        });
    } catch (err) {
        console.error("Prisma connection failed:", err);
        process.exit(1);
    }
}

main();

// Graceful shutdown
process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
});

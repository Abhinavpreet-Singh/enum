/**
 * Seed script: populates the database with example coding simulations.
 *
 * Usage:
 *   node scripts/seed-simulations.js
 *
 * This script:
 *   1. Connects to MongoDB via Prisma
 *   2. Optionally uploads files to Cloudinary (set UPLOAD_TO_CLOUDINARY=true)
 *   3. Creates simulation documents in the database
 *
 * Environment variables (from .env):
 *   DATABASE_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { uploadFileToCloudinary } from "../src/utils/cloudinary.js";

dotenv.config();

const prisma = new PrismaClient();
const UPLOAD_TO_CLOUDINARY = process.env.UPLOAD_TO_CLOUDINARY === "true";

const seedSimulations = [
    // ─────────────── EASY ────────────────────────────────────────────────────
    {
        title: "Express Route 404 Bug",
        category: "backend",
        difficulty: "easy",
        description:
            "Users report that the GET /api/users endpoint always returns 404. The server starts correctly but routes are not being registered properly.",
        incident:
            "GET /api/users → 404 Not Found. Server logs show no route matching. The route file is imported but never mounted on the Express app.",
        steps: [
            { description: "Read server.js and understand how routes are imported." },
            { description: "Identify why the /api/users route is not responding." },
            { description: "Fix the route mounting and run the server to verify." },
        ],
        entryFile: "server.js",
        expectedOutput: "Server running on port 3000",
        initialFiles: [
            {
                name: "server.js",
                path: "server.js",
                language: "javascript",
                content: `const express = require("express");
const app = express();
const userRoutes = require("./routes/users");

app.use(express.json());

// BUG: Routes imported but never mounted
// Missing: app.use("/api/users", userRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
`,
            },
            {
                name: "users.js",
                path: "routes/users.js",
                language: "javascript",
                content: `const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json([
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ]);
});

router.get("/:id", (req, res) => {
  const user = { id: req.params.id, name: "Test User" };
  res.json(user);
});

module.exports = router;
`,
            },
        ],
        solution: {
            "server.js": `const express = require("express");
const app = express();
const userRoutes = require("./routes/users");

app.use(express.json());

// FIX: Mount the routes
app.use("/api/users", userRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
`,
        },
        hints: [
            "The route file is imported at the top of server.js. Is it being used?",
            "Express routes need to be mounted with app.use() to be accessible.",
        ],
        estimatedTime: 10,
        tags: ["Express", "Routing", "Node.js"],
        xpReward: 40,
    },
    {
        title: "Async/Await Error Handling",
        category: "backend",
        difficulty: "medium",
        description:
            "The API crashes with an unhandled promise rejection when the database query fails. Implement proper error handling so the server returns a 500 response instead of crashing.",
        incident:
            "UnhandledPromiseRejectionWarning: Error: ECONNREFUSED — The server crashes when the database is unreachable. No try/catch around the async operation.",
        steps: [
            { description: "Run server.js and observe the crash." },
            { description: "Add try/catch around the async database call." },
            { description: "Return a proper 500 error response to the client." },
        ],
        entryFile: "server.js",
        expectedOutput: "Server running on port 3000",
        initialFiles: [
            {
                name: "server.js",
                path: "server.js",
                language: "javascript",
                content: `const express = require("express");
const app = express();
const { getUsers } = require("./db");

app.get("/api/users", async (req, res) => {
  // BUG: No error handling — crashes the server if db fails
  const users = await getUsers();
  res.json(users);
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
`,
            },
            {
                name: "db.js",
                path: "db.js",
                language: "javascript",
                content: `// Simulated database module
async function getUsers() {
  // Simulate a database failure
  throw new Error("ECONNREFUSED: Database connection failed");
}

module.exports = { getUsers };
`,
            },
        ],
        solution: {
            "server.js": `const express = require("express");
const app = express();
const { getUsers } = require("./db");

app.get("/api/users", async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (error) {
    console.error("Database error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
`,
        },
        hints: [
            "What happens when an async function throws and there's no catch?",
            "Wrap the await call in a try/catch block and send res.status(500).",
        ],
        estimatedTime: 15,
        tags: ["Async/Await", "Error Handling", "Node.js"],
        xpReward: 60,
    },
    {
        title: "Environment Variable Misconfiguration",
        category: "backend",
        difficulty: "easy",
        description:
            "The server fails to start because it reads the PORT variable incorrectly, resulting in 'undefined' being used. Fix the config module.",
        incident:
            'TypeError: Cannot read properties of undefined — The server tries to listen on "undefined" because process.env.PORT is not loaded from .env.',
        steps: [
            { description: "Check how the config module exports the PORT." },
            { description: "Find why process.env.PORT is undefined." },
            { description: "Fix the config and verify the server starts." },
        ],
        entryFile: "server.js",
        expectedOutput: "Server running on port 3000",
        initialFiles: [
            {
                name: "server.js",
                path: "server.js",
                language: "javascript",
                content: `const { PORT } = require("./config");

console.log("Server running on port " + (PORT || 3000));
`,
            },
            {
                name: "config.js",
                path: "config.js",
                language: "javascript",
                content: `// BUG: Exporting the wrong variable name
const PORT = process.env.PORT || 3000;

module.exports = {
  PROT: PORT,  // Typo! Should be PORT
};
`,
            },
            {
                name: ".env",
                path: ".env",
                language: "plaintext",
                content: `PORT=3000
`,
            },
        ],
        solution: {
            "config.js": `const PORT = process.env.PORT || 3000;

module.exports = {
  PORT: PORT,
};
`,
        },
        hints: [
            "Check the export name in config.js — does it match what server.js destructures?",
            'There is a typo: "PROT" instead of "PORT".',
        ],
        estimatedTime: 5,
        tags: ["Config", "Environment", "Node.js"],
        xpReward: 30,
    },
    {
        title: "Middleware Ordering Bug",
        category: "backend",
        difficulty: "medium",
        description:
            "POST requests to /api/data always fail with 'undefined' body. The JSON body parser middleware is loaded after the route handler, so req.body is never populated.",
        incident:
            "POST /api/data → req.body is undefined. Data is sent correctly from the client but the server cannot parse it.",
        steps: [
            { description: "Look at the order of middleware and route declarations." },
            { description: "Move express.json() before the route handlers." },
            { description: "Run and verify req.body is now populated." },
        ],
        entryFile: "server.js",
        expectedOutput: "Server running on port 3000",
        initialFiles: [
            {
                name: "server.js",
                path: "server.js",
                language: "javascript",
                content: `const express = require("express");
const app = express();

// Route defined BEFORE body parser — req.body will be undefined
app.post("/api/data", (req, res) => {
  console.log("Body:", req.body);
  if (!req.body || !req.body.name) {
    return res.status(400).json({ error: "Name is required" });
  }
  res.json({ received: req.body });
});

// BUG: Body parser middleware loaded AFTER routes
app.use(express.json());

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
`,
            },
        ],
        solution: {
            "server.js": `const express = require("express");
const app = express();

// FIX: Body parser BEFORE routes
app.use(express.json());

app.post("/api/data", (req, res) => {
  console.log("Body:", req.body);
  if (!req.body || !req.body.name) {
    return res.status(400).json({ error: "Name is required" });
  }
  res.json({ received: req.body });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
`,
        },
        hints: [
            "Express middleware runs in the order it is declared.",
            "Move app.use(express.json()) above the route definition.",
        ],
        estimatedTime: 10,
        tags: ["Express", "Middleware", "Node.js"],
        xpReward: 50,
    },
    {
        title: "Circular Dependency Crash",
        category: "backend",
        difficulty: "hard",
        description:
            "The service crashes on startup due to a circular require between modules A and B. Refactor to break the cycle without changing functionality.",
        incident:
            "TypeError: moduleB.helper is not a function — Circular dependency between moduleA.js and moduleB.js causes one of them to be an empty object at require time.",
        steps: [
            { description: "Trace the require chain between the two modules." },
            { description: "Identify which module gets an incomplete export." },
            { description: "Extract shared logic into a third module to break the cycle." },
        ],
        entryFile: "index.js",
        expectedOutput: "Result: 42\nHelper: ok",
        initialFiles: [
            {
                name: "index.js",
                path: "index.js",
                language: "javascript",
                content: `const { compute } = require("./moduleA");
const { helper } = require("./moduleB");

console.log("Result:", compute(21));
console.log("Helper:", helper());
`,
            },
            {
                name: "moduleA.js",
                path: "moduleA.js",
                language: "javascript",
                content: `// BUG: Circular dependency — moduleA requires moduleB, moduleB requires moduleA
const { helper } = require("./moduleB");

function compute(x) {
  return x * 2;
}

function validate(x) {
  return typeof x === "number" && helper() === "ok";
}

module.exports = { compute, validate };
`,
            },
            {
                name: "moduleB.js",
                path: "moduleB.js",
                language: "javascript",
                content: `// BUG: Circular dependency — moduleB requires moduleA
const { validate } = require("./moduleA");

function helper() {
  return "ok";
}

function process(x) {
  if (validate(x)) return x;
  return null;
}

module.exports = { helper, process };
`,
            },
        ],
        solution: {
            "moduleA.js": `// FIX: Removed direct require of moduleB — shared logic in utils.js
const { helper } = require("./utils");

function compute(x) {
  return x * 2;
}

function validate(x) {
  return typeof x === "number" && helper() === "ok";
}

module.exports = { compute, validate };
`,
            "moduleB.js": `// FIX: Removed direct require of moduleA — uses utils for shared logic
const { helper } = require("./utils");

function process(x) {
  return typeof x === "number" ? x : null;
}

module.exports = { helper, process };
`,
            "utils.js": `// FIX: Extracted shared helper to break circular dependency
function helper() {
  return "ok";
}

module.exports = { helper };
`,
        },
        hints: [
            "When A requires B and B requires A, one of them gets a partial export.",
            "Extract the shared function into a new file that both modules can import.",
        ],
        estimatedTime: 20,
        tags: ["Node.js", "Modules", "Architecture"],
        xpReward: 80,
    },
];

// ── Replace the entire array above this line ──────────────────────────────
    try {
        await prisma.$connect();
        console.log("Connected to MongoDB via Prisma");

        for (const simData of seedSimulations) {
            const existing = await prisma.simulation.findFirst({
                where: { title: simData.title },
            });

            let simulation;
            if (existing) {
                // Always update to keep entryFile and expectedOutput in sync with seed data
                simulation = await prisma.simulation.update({
                    where: { id: existing.id },
                    data: {
                        entryFile: simData.entryFile,
                        expectedOutput: simData.expectedOutput,
                        difficulty: simData.difficulty,
                        steps: simData.steps,
                        hints: simData.hints,
                        estimatedTime: simData.estimatedTime,
                        xpReward: simData.xpReward,
                        tags: simData.tags,
                    },
                });
                console.log(`Updated: "${simulation.title}" (entryFile=${simulation.entryFile})`);
            } else {
                simulation = await prisma.simulation.create({ data: simData });
                console.log(`Created: "${simulation.title}" (${simulation.id})`);
            }

            if (UPLOAD_TO_CLOUDINARY) {
                console.log(`  Uploading ${simulation.initialFiles.length} file(s) to Cloudinary...`);

                const updatedFiles = [];
                for (const file of simulation.initialFiles) {
                    try {
                        const { url, publicId } = await uploadFileToCloudinary(
                            file.content,
                            file.path,
                            simulation.id,
                        );
                        updatedFiles.push({
                            ...file,
                            cloudinaryUrl: url,
                            cloudinaryPublicId: publicId,
                        });
                        console.log(`    Uploaded: ${file.path}`);
                    } catch (err) {
                        console.error(`    Failed to upload ${file.path}:`, err.message);
                        updatedFiles.push(file);
                    }
                }

                await prisma.simulation.update({
                    where: { id: simulation.id },
                    data: { initialFiles: updatedFiles },
                });
                console.log(`  Cloudinary URLs saved to database`);
            }
        }

        console.log("\nSeeding complete!");
    } catch (err) {
        console.error("Seeding failed:", err);
    } finally {
        await prisma.$disconnect();
        console.log("Disconnected from MongoDB");
    }
}

seed();

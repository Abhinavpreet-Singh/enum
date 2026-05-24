/**
 * Seed script: populates the database with backend coding simulations.
 *
 * Each simulation is SELF-TESTING: the server starts, makes HTTP requests
 * to itself, and prints TEST PASSED / TEST FAILED. The grader checks stdout.
 * This prevents "solved on click" — the buggy code always fails the test.
 *
 * Usage:
 *   node scripts/seed-simulations.js
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

// ─── SELF-TEST PATTERN ───────────────────────────────────────────────────────
// Every server.js ends with an AUTO-GRADER section that:
//   1. Starts the Express server
//   2. Makes HTTP request(s) to itself after 150 ms
//   3. Prints exactly "TEST PASSED: <message>" or "TEST FAILED: <reason>"
//   4. Shuts down
//
// The engine captures stdout and compares with expectedOutput.
// Buggy code → test fails → output does NOT match expectedOutput → not solved.
// Fixed code → test passes → output matches expectedOutput → solved.
// ─────────────────────────────────────────────────────────────────────────────

const seedSimulations = [
  // ═══════════════════════ 1. EXPRESS ROUTE NOT MOUNTED (Easy) ════════════
  {
    title: "Express Route 404 Bug",
    category: "backend",
    difficulty: "easy",
    description:
      "Users report that GET /api/users always returns 404. The server starts correctly but the route is never responding. Inspect how routes are registered in server.js and fix it.",
    incident:
      "GET /api/users → 404 Not Found. The userRoutes file exists and is imported, but every request returns 404. The auto-grader below will expose the bug.",
    steps: [
      {
        description:
          "Open server.js and look at how userRoutes is used after being imported.",
      },
      {
        description:
          "Find the missing app.use() call that mounts the router on /api/users.",
      },
      {
        description:
          "Add the correct app.use() line and run. The auto-grader will confirm success.",
      },
    ],
    entryFile: "server.js",
    expectedOutput: "TEST PASSED: GET /api/users returned 200 OK",
    initialFiles: [
      {
        name: "server.js",
        path: "server.js",
        language: "javascript",
        content: `const express = require("express");
const http = require("http");
const app = express();
const userRoutes = require("./routes/users");

app.use(express.json());

// ── YOUR TASK ──────────────────────────────────────────────────────────────
// BUG: userRoutes is imported but never mounted.
// Every request to /api/users returns 404 because Express doesn't know
// where to send it. Add one line to fix this.
//
// HINT: app.use("/api/users", userRoutes);
// ──────────────────────────────────────────────────────────────────────────

// ── AUTO-GRADER (do not modify) ────────────────────────────────────────────
const server = app.listen(3000, () => {
  setTimeout(() => {
    http.get("http://localhost:3000/api/users", (res) => {
      res.resume();
      if (res.statusCode === 200) {
        console.log("TEST PASSED: GET /api/users returned 200 OK");
      } else {
        console.log("TEST FAILED: GET /api/users returned " + res.statusCode + " (expected 200)");
      }
      server.close();
    }).on("error", (e) => {
      console.log("TEST FAILED: " + e.message);
      server.close();
    });
  }, 150);
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

module.exports = router;
`,
      },
    ],
    solution: {
      "server.js": `const express = require("express");
const http = require("http");
const app = express();
const userRoutes = require("./routes/users");

app.use(express.json());

// FIX: Mount the router on /api/users
app.use("/api/users", userRoutes);

// ── AUTO-GRADER (do not modify) ────────────────────────────────────────────
const server = app.listen(3000, () => {
  setTimeout(() => {
    http.get("http://localhost:3000/api/users", (res) => {
      res.resume();
      if (res.statusCode === 200) {
        console.log("TEST PASSED: GET /api/users returned 200 OK");
      } else {
        console.log("TEST FAILED: GET /api/users returned " + res.statusCode + " (expected 200)");
      }
      server.close();
    }).on("error", (e) => {
      console.log("TEST FAILED: " + e.message);
      server.close();
    });
  }, 150);
});
`,
    },
    hints: [
      "The route file is imported with require('./routes/users') — but that alone doesn't register it.",
      "Express routes need app.use('/path', router) to be reachable.",
      "Add app.use('/api/users', userRoutes); before the AUTO-GRADER section.",
    ],
    estimatedTime: 10,
    tags: ["Express", "Routing", "Node.js"],
    xpReward: 50,
  },

  // ═══════════════════════ 2. CONFIG VARIABLE TYPO (Easy) ══════════════════
  {
    title: "Environment Variable Misconfiguration",
    category: "backend",
    difficulty: "easy",
    description:
      "The server cannot read its own PORT setting. config.js is supposed to export PORT read from process.env, but it exports the wrong key name due to a typo.",
    incident:
      "Server tries to start on port 'undefined'. The config.js module has a typo in the export name — PORT is defined locally but exported under a different name.",
    steps: [
      { description: "Open config.js and check the module.exports object." },
      { description: "Find the typo in the exported key name." },
      {
        description:
          "Fix the typo so the exported key matches what server.js destructures.",
      },
    ],
    entryFile: "server.js",
    expectedOutput: "TEST PASSED: Server would run on port 3000",
    initialFiles: [
      {
        name: "server.js",
        path: "server.js",
        language: "javascript",
        content: `const { PORT } = require("./config");

// ── AUTO-GRADER (do not modify) ────────────────────────────────────────────
if (PORT !== undefined && !isNaN(Number(PORT))) {
  console.log("TEST PASSED: Server would run on port " + PORT);
} else {
  console.log("TEST FAILED: PORT is " + PORT + " (expected a number — check config.js export)");
}
`,
      },
      {
        name: "config.js",
        path: "config.js",
        language: "javascript",
        content: `// ── YOUR TASK ──────────────────────────────────────────────────────────────
// BUG: There is a typo in the exported key name.
// server.js destructures { PORT } but config.js exports it under
// a different (misspelled) name, so PORT comes back as undefined.
// Fix the typo in module.exports below.
// ──────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

module.exports = {
  PROT: PORT, // <-- typo here
};
`,
      },
    ],
    solution: {
      "config.js": `const PORT = process.env.PORT || 3000;

// FIX: Correct the key name from PROT to PORT
module.exports = {
  PORT: PORT,
};
`,
    },
    hints: [
      "Compare what server.js destructures ({ PORT }) with what config.js exports.",
      "Look carefully at the key name in module.exports — one letter is wrong.",
      'Change "PROT" to "PORT" in the exports object.',
    ],
    estimatedTime: 5,
    tags: ["Config", "Environment", "Node.js"],
    xpReward: 50,
  },

  // ═══════════════════════ 3. RESPONSE NEVER SENT (Easy) ═══════════════════
  {
    title: "Hanging Request — No Response Sent",
    category: "backend",
    difficulty: "easy",
    description:
      "GET /api/calc?a=3&b=4 never gets a response. The route handler computes the result correctly but forgets to send it back to the client. All requests hang indefinitely.",
    incident:
      "Clients time out waiting for /api/calc. The calculation logic is correct — the result variable holds the right answer — but no res.json() or res.send() is called.",
    steps: [
      { description: "Open server.js and find the /api/calc route handler." },
      {
        description:
          "Trace through the handler: the result is computed but what happens next?",
      },
      {
        description:
          "Add the missing res.json({ result }) call to send the response.",
      },
    ],
    entryFile: "server.js",
    expectedOutput: "TEST PASSED: Response received — result is 7",
    initialFiles: [
      {
        name: "server.js",
        path: "server.js",
        language: "javascript",
        content: `const express = require("express");
const http = require("http");
const app = express();

app.get("/api/calc", (req, res) => {
  // ── YOUR TASK ────────────────────────────────────────────────────────────
  // BUG: The result is calculated but never sent back to the client.
  // Requests to /api/calc hang forever until they time out.
  // Fix: add res.json({ result }) after the calculation.
  // ──────────────────────────────────────────────────────────────────────────
  const a = parseInt(req.query.a) || 0;
  const b = parseInt(req.query.b) || 0;
  const result = a + b;
  // Missing: res.json({ result });
});

// ── AUTO-GRADER (do not modify) ────────────────────────────────────────────
const server = app.listen(3000, () => {
  setTimeout(() => {
    let done = false;
    const hangTimeout = setTimeout(() => {
      if (!done) {
        done = true;
        console.log("TEST FAILED: Request timed out — did you forget res.json({ result })?");
        server.close();
      }
    }, 2500);

    http.get("http://localhost:3000/api/calc?a=3&b=4", (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        if (done) return;
        done = true;
        clearTimeout(hangTimeout);
        try {
          const json = JSON.parse(data);
          if (json.result === 7) {
            console.log("TEST PASSED: Response received — result is 7");
          } else {
            console.log("TEST FAILED: Wrong result — got " + json.result + ", expected 7");
          }
        } catch (e) {
          console.log("TEST FAILED: Invalid JSON response: " + data);
        }
        server.close();
      });
    }).on("error", (e) => {
      if (done) return;
      done = true;
      clearTimeout(hangTimeout);
      console.log("TEST FAILED: " + e.message);
      server.close();
    });
  }, 150);
});
`,
      },
    ],
    solution: {
      "server.js": `const express = require("express");
const http = require("http");
const app = express();

app.get("/api/calc", (req, res) => {
  const a = parseInt(req.query.a) || 0;
  const b = parseInt(req.query.b) || 0;
  const result = a + b;
  // FIX: Send the response
  res.json({ result });
});

// ── AUTO-GRADER (do not modify) ────────────────────────────────────────────
const server = app.listen(3000, () => {
  setTimeout(() => {
    let done = false;
    const hangTimeout = setTimeout(() => {
      if (!done) {
        done = true;
        console.log("TEST FAILED: Request timed out — did you forget res.json({ result })?");
        server.close();
      }
    }, 2500);

    http.get("http://localhost:3000/api/calc?a=3&b=4", (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        if (done) return;
        done = true;
        clearTimeout(hangTimeout);
        try {
          const json = JSON.parse(data);
          if (json.result === 7) {
            console.log("TEST PASSED: Response received — result is 7");
          } else {
            console.log("TEST FAILED: Wrong result — got " + json.result + ", expected 7");
          }
        } catch (e) {
          console.log("TEST FAILED: Invalid JSON response: " + data);
        }
        server.close();
      });
    }).on("error", (e) => {
      if (done) return;
      done = true;
      clearTimeout(hangTimeout);
      console.log("TEST FAILED: " + e.message);
      server.close();
    });
  }, 150);
});
`,
    },
    hints: [
      "The route computes 'result' but never sends it anywhere.",
      "Express needs you to call res.json(), res.send(), or res.end() to finish the request.",
      "Add res.json({ result }); after the calculation.",
    ],
    estimatedTime: 8,
    tags: ["Express", "Response", "Node.js"],
    xpReward: 50,
  },

  // ═══════════════════════ 4. ASYNC ERROR NOT CAUGHT (Medium) ══════════════
  {
    title: "Async/Await Error Handling",
    category: "backend",
    difficulty: "medium",
    description:
      "The API crashes with an unhandled promise rejection when the database query fails. The server process exits entirely, causing all subsequent requests to fail. Wrap the async operation in proper error handling.",
    incident:
      "UnhandledPromiseRejection crashes the server on GET /api/users. db.js always throws (simulating a real DB failure). The route has no try/catch, so Node exits and no 500 is returned.",
    steps: [
      { description: "Open server.js and read the /api/users route handler." },
      {
        description: "Notice there is no try/catch around 'await getUsers()'.",
      },
      {
        description:
          "Wrap the await call in try/catch and return res.status(500).json({ error: ... }).",
      },
    ],
    entryFile: "server.js",
    expectedOutput: "TEST PASSED: Server returned 500 on DB failure",
    initialFiles: [
      {
        name: "server.js",
        path: "server.js",
        language: "javascript",
        content: `const express = require("express");
const http = require("http");
const app = express();
const { getUsers } = require("./db");

// ── YOUR TASK ──────────────────────────────────────────────────────────────
// BUG: No error handling around the async DB call.
// When getUsers() throws, Node emits an UnhandledPromiseRejection
// and the process crashes — no 500 is ever returned.
//
// Fix: Wrap the await in try/catch and return a 500 response:
//   try { const users = await getUsers(); res.json(users); }
//   catch (err) { res.status(500).json({ error: "Internal server error" }); }
// ──────────────────────────────────────────────────────────────────────────
app.get("/api/users", async (req, res) => {
  const users = await getUsers(); // always throws!
  res.json(users);
});

// ── AUTO-GRADER (do not modify) ────────────────────────────────────────────
const server = app.listen(3000, () => {
  setTimeout(() => {
    const req = http.get("http://localhost:3000/api/users", (res) => {
      res.resume();
      if (res.statusCode === 500) {
        console.log("TEST PASSED: Server returned 500 on DB failure");
      } else {
        console.log("TEST FAILED: Expected status 500, got " + res.statusCode);
      }
      server.close();
    });
    req.on("error", (e) => {
      console.log("TEST FAILED: Server crashed before responding — " + e.message);
      server.close();
    });
  }, 150);
});
`,
      },
      {
        name: "db.js",
        path: "db.js",
        language: "javascript",
        content: `// Simulates a database that is currently unreachable
async function getUsers() {
  throw new Error("ECONNREFUSED: Database connection failed");
}

module.exports = { getUsers };
`,
      },
    ],
    solution: {
      "server.js": `const express = require("express");
const http = require("http");
const app = express();
const { getUsers } = require("./db");

// FIX: try/catch around the async call
app.get("/api/users", async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (err) {
    console.error("DB error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── AUTO-GRADER (do not modify) ────────────────────────────────────────────
const server = app.listen(3000, () => {
  setTimeout(() => {
    const req = http.get("http://localhost:3000/api/users", (res) => {
      res.resume();
      if (res.statusCode === 500) {
        console.log("TEST PASSED: Server returned 500 on DB failure");
      } else {
        console.log("TEST FAILED: Expected status 500, got " + res.statusCode);
      }
      server.close();
    });
    req.on("error", (e) => {
      console.log("TEST FAILED: Server crashed before responding — " + e.message);
      server.close();
    });
  }, 150);
});
`,
    },
    hints: [
      "async functions that throw without a catch cause UnhandledPromiseRejection.",
      "Wrap the entire await block in try { ... } catch (err) { ... }.",
      "Return res.status(500).json({ error: 'Internal server error' }) from the catch block.",
    ],
    estimatedTime: 15,
    tags: ["Async/Await", "Error Handling", "Node.js"],
    xpReward: 100,
  },

  // ═══════════════════════ 5. MIDDLEWARE ORDER BUG (Medium) ════════════════
  {
    title: "Middleware Ordering Bug",
    category: "backend",
    difficulty: "medium",
    description:
      "POST requests to /api/echo always return 400 'message required' even when the body is correctly sent. The problem is that req.body is undefined because the body parser middleware is registered after the route.",
    incident:
      "POST /api/echo returns 400 even with a valid JSON body. Express middleware runs in declaration order — the route handler fires before express.json() has a chance to parse the body.",
    steps: [
      {
        description:
          "Read server.js and check the order of app.use() calls vs route definitions.",
      },
      {
        description:
          "Notice that app.use(express.json()) appears AFTER app.post('/api/echo', ...).",
      },
      {
        description:
          "Move app.use(express.json()) above all route definitions and run again.",
      },
    ],
    entryFile: "server.js",
    expectedOutput: "TEST PASSED: POST body parsed correctly — echo: hello",
    initialFiles: [
      {
        name: "server.js",
        path: "server.js",
        language: "javascript",
        content: `const express = require("express");
const http = require("http");
const app = express();

// ── YOUR TASK ──────────────────────────────────────────────────────────────
// BUG: express.json() is loaded AFTER the route definition.
// req.body is undefined when the route handler runs, so every POST
// returns 400 even with a valid body.
//
// Fix: Move app.use(express.json()); above the app.post() route.
// ──────────────────────────────────────────────────────────────────────────

app.post("/api/echo", (req, res) => {
  if (!req.body || !req.body.message) {
    return res.status(400).json({ error: "message required" });
  }
  res.json({ echo: req.body.message });
});

app.use(express.json()); // BUG: loaded after the route — move this up!

// ── AUTO-GRADER (do not modify) ────────────────────────────────────────────
const server = app.listen(3000, () => {
  setTimeout(() => {
    const body = JSON.stringify({ message: "hello" });
    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/api/echo",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200 && json.echo === "hello") {
            console.log("TEST PASSED: POST body parsed correctly — echo: " + json.echo);
          } else {
            console.log("TEST FAILED: Got status " + res.statusCode + " body: " + data);
          }
        } catch (e) {
          console.log("TEST FAILED: Invalid JSON response: " + data);
        }
        server.close();
      });
    });
    req.on("error", (e) => {
      console.log("TEST FAILED: " + e.message);
      server.close();
    });
    req.write(body);
    req.end();
  }, 150);
});
`,
      },
    ],
    solution: {
      "server.js": `const express = require("express");
const http = require("http");
const app = express();

// FIX: Register body parser BEFORE route definitions
app.use(express.json());

app.post("/api/echo", (req, res) => {
  if (!req.body || !req.body.message) {
    return res.status(400).json({ error: "message required" });
  }
  res.json({ echo: req.body.message });
});

// ── AUTO-GRADER (do not modify) ────────────────────────────────────────────
const server = app.listen(3000, () => {
  setTimeout(() => {
    const body = JSON.stringify({ message: "hello" });
    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/api/echo",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200 && json.echo === "hello") {
            console.log("TEST PASSED: POST body parsed correctly — echo: " + json.echo);
          } else {
            console.log("TEST FAILED: Got status " + res.statusCode + " body: " + data);
          }
        } catch (e) {
          console.log("TEST FAILED: Invalid JSON response: " + data);
        }
        server.close();
      });
    });
    req.on("error", (e) => {
      console.log("TEST FAILED: " + e.message);
      server.close();
    });
    req.write(body);
    req.end();
  }, 150);
});
`,
    },
    hints: [
      "Express middleware runs in the exact order it is declared with app.use().",
      "If app.use(express.json()) comes after the route, the route runs before body parsing.",
      "Move the app.use(express.json()) line to the very top, before any route.",
    ],
    estimatedTime: 12,
    tags: ["Express", "Middleware", "Node.js"],
    xpReward: 100,
  },

  // ═══════════════════════ 6. UNAUTHENTICATED ROUTE (Medium) ═══════════════
  {
    title: "Missing Auth Guard on Admin Route",
    category: "backend",
    difficulty: "medium",
    description:
      "The /api/admin/data endpoint is supposed to be protected — only authenticated users with a valid Authorization header should access it. But any request, even without a token, gets through.",
    incident:
      "GET /api/admin/data returns admin data to unauthenticated requests. The requireAuth middleware exists but was not applied to this route.",
    steps: [
      {
        description:
          "Open server.js and find the /api/admin/data route definition.",
      },
      {
        description:
          "Notice that requireAuth is never used as a middleware argument for this route.",
      },
      {
        description:
          "Add requireAuth as the second argument: app.get('/api/admin/data', requireAuth, handler).",
      },
    ],
    entryFile: "server.js",
    expectedOutput: "TEST PASSED: Unauthenticated request rejected with 401",
    initialFiles: [
      {
        name: "server.js",
        path: "server.js",
        language: "javascript",
        content: `const express = require("express");
const http = require("http");
const app = express();
app.use(express.json());

function requireAuth(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "Unauthorized — token required" });
  req.user = { id: "user-1", role: "admin" };
  next();
}

// ── YOUR TASK ──────────────────────────────────────────────────────────────
// BUG: The admin route is missing the requireAuth middleware.
// Any request — even without an Authorization header — gets the data.
//
// Fix: Add the requireAuth argument between the path and the handler:
//   app.get("/api/admin/data", requireAuth, (req, res) => { ... });
// ──────────────────────────────────────────────────────────────────────────
app.get("/api/admin/data", (req, res) => {
  res.json({ secret: "admin-data-12345" });
});

// ── AUTO-GRADER (do not modify) ────────────────────────────────────────────
const server = app.listen(3000, () => {
  setTimeout(() => {
    // Test: request WITHOUT Authorization header should return 401
    http.get("http://localhost:3000/api/admin/data", (res) => {
      res.resume();
      if (res.statusCode === 401) {
        console.log("TEST PASSED: Unauthenticated request rejected with 401");
      } else {
        console.log("TEST FAILED: Expected 401, got " + res.statusCode + " — route is not protected!");
      }
      server.close();
    }).on("error", (e) => {
      console.log("TEST FAILED: " + e.message);
      server.close();
    });
  }, 150);
});
`,
      },
    ],
    solution: {
      "server.js": `const express = require("express");
const http = require("http");
const app = express();
app.use(express.json());

function requireAuth(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "Unauthorized — token required" });
  req.user = { id: "user-1", role: "admin" };
  next();
}

// FIX: Added requireAuth middleware to protect the route
app.get("/api/admin/data", requireAuth, (req, res) => {
  res.json({ secret: "admin-data-12345" });
});

// ── AUTO-GRADER (do not modify) ────────────────────────────────────────────
const server = app.listen(3000, () => {
  setTimeout(() => {
    http.get("http://localhost:3000/api/admin/data", (res) => {
      res.resume();
      if (res.statusCode === 401) {
        console.log("TEST PASSED: Unauthenticated request rejected with 401");
      } else {
        console.log("TEST FAILED: Expected 401, got " + res.statusCode + " — route is not protected!");
      }
      server.close();
    }).on("error", (e) => {
      console.log("TEST FAILED: " + e.message);
      server.close();
    });
  }, 150);
});
`,
    },
    hints: [
      "Express routes accept multiple middleware functions as arguments before the final handler.",
      "app.get('/path', middleware1, middleware2, handler) — each runs in order.",
      "Add requireAuth as the second argument to app.get('/api/admin/data', ...).",
    ],
    estimatedTime: 12,
    tags: ["Authentication", "Middleware", "Express", "Security"],
    xpReward: 100,
  },

  // ═══════════════════════ 7. WRONG HTTP STATUS CODES (Hard) ═══════════════
  {
    title: "Incorrect HTTP Status Codes",
    category: "backend",
    difficulty: "hard",
    description:
      "The API uses wrong HTTP status codes throughout. POST /api/users returns 200 instead of 201 on resource creation, and GET /api/users/:id returns 200 instead of 404 when no user is found. Fix both routes to use semantically correct codes.",
    incident:
      "API clients cannot distinguish success from failure. POST returns 200 (should be 201 Created). GET for missing resource returns 200 with an error body (should be 404). REST contract is broken.",
    steps: [
      {
        description:
          "Find the POST /api/users route and change res.json() to res.status(201).json().",
      },
      {
        description:
          "Find the GET /api/users/:id 'not found' branch and add .status(404) before .json().",
      },
      { description: "Run the auto-grader — both tests must pass." },
    ],
    entryFile: "server.js",
    expectedOutput: "TEST PASSED: All status codes are correct (2/2)",
    initialFiles: [
      {
        name: "server.js",
        path: "server.js",
        language: "javascript",
        content: `const express = require("express");
const http = require("http");
const app = express();
app.use(express.json());

const users = [];

// ── YOUR TASK ──────────────────────────────────────────────────────────────
// BUG 1: POST /api/users should return 201 Created, not 200.
// BUG 2: GET /api/users/:id should return 404 when user not found, not 200.
//
// Fix each route to use the semantically correct HTTP status code.
// ──────────────────────────────────────────────────────────────────────────

app.post("/api/users", (req, res) => {
  const user = { id: users.length + 1, name: req.body.name };
  users.push(user);
  res.json(user); // BUG: should be res.status(201).json(user)
});

app.get("/api/users/:id", (req, res) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));
  if (!user) {
    res.json({ error: "Not found" }); // BUG: should be res.status(404).json(...)
    return;
  }
  res.json(user);
});

// ── AUTO-GRADER (do not modify) ────────────────────────────────────────────
const server = app.listen(3000, () => {
  setTimeout(() => {
    let passed = 0;
    let total = 0;

    const finish = () => {
      if (total === 2) {
        if (passed === 2) {
          console.log("TEST PASSED: All status codes are correct (2/2)");
        } else {
          console.log("TEST FAILED: " + passed + "/2 status codes correct");
        }
        server.close();
      }
    };

    // Test 1: POST should return 201
    const postBody = JSON.stringify({ name: "Alice" });
    const postOpts = {
      hostname: "localhost", port: 3000, path: "/api/users", method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(postBody) },
    };
    const postReq = http.request(postOpts, (res) => {
      res.resume();
      total++;
      if (res.statusCode === 201) { passed++; }
      else { console.log("  T1 FAIL: POST returned " + res.statusCode + " (expected 201)"); }
      finish();
    });
    postReq.on("error", () => { total++; console.log("  T1 FAIL: request error"); finish(); });
    postReq.write(postBody);
    postReq.end();

    // Test 2: GET non-existent user should return 404
    http.get("http://localhost:3000/api/users/9999", (res) => {
      res.resume();
      total++;
      if (res.statusCode === 404) { passed++; }
      else { console.log("  T2 FAIL: GET missing user returned " + res.statusCode + " (expected 404)"); }
      finish();
    }).on("error", () => { total++; console.log("  T2 FAIL: request error"); finish(); });
  }, 150);
});
`,
      },
    ],
    solution: {
      "server.js": `const express = require("express");
const http = require("http");
const app = express();
app.use(express.json());

const users = [];

// FIX 1: Return 201 for resource creation
app.post("/api/users", (req, res) => {
  const user = { id: users.length + 1, name: req.body.name };
  users.push(user);
  res.status(201).json(user);
});

// FIX 2: Return 404 when user not found
app.get("/api/users/:id", (req, res) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));
  if (!user) {
    return res.status(404).json({ error: "Not found" });
  }
  res.json(user);
});

// ── AUTO-GRADER (do not modify) ────────────────────────────────────────────
const server = app.listen(3000, () => {
  setTimeout(() => {
    let passed = 0;
    let total = 0;

    const finish = () => {
      if (total === 2) {
        if (passed === 2) {
          console.log("TEST PASSED: All status codes are correct (2/2)");
        } else {
          console.log("TEST FAILED: " + passed + "/2 status codes correct");
        }
        server.close();
      }
    };

    const postBody = JSON.stringify({ name: "Alice" });
    const postOpts = {
      hostname: "localhost", port: 3000, path: "/api/users", method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(postBody) },
    };
    const postReq = http.request(postOpts, (res) => {
      res.resume();
      total++;
      if (res.statusCode === 201) { passed++; }
      else { console.log("  T1 FAIL: POST returned " + res.statusCode + " (expected 201)"); }
      finish();
    });
    postReq.on("error", () => { total++; console.log("  T1 FAIL: request error"); finish(); });
    postReq.write(postBody);
    postReq.end();

    http.get("http://localhost:3000/api/users/9999", (res) => {
      res.resume();
      total++;
      if (res.statusCode === 404) { passed++; }
      else { console.log("  T2 FAIL: GET missing user returned " + res.statusCode + " (expected 404)"); }
      finish();
    }).on("error", () => { total++; console.log("  T2 FAIL: request error"); finish(); });
  }, 150);
});
`,
    },
    hints: [
      "HTTP 201 Created is the correct response code for successful resource creation (POST).",
      "HTTP 404 Not Found means the resource doesn't exist — use res.status(404).json(...).",
      "Chain .status(code) before .json(): res.status(201).json(user) and res.status(404).json({ error }).",
    ],
    estimatedTime: 20,
    tags: ["HTTP", "REST", "Express", "Status Codes"],
    xpReward: 150,
  },

  // ═══════════════════════ 8. AUTH TOKEN NOT VALIDATED (Hard) ══════════════
  {
    title: "Auth Middleware Accepts Any Token",
    category: "backend",
    difficulty: "hard",
    description:
      "The authentication middleware checks that an Authorization header exists but never validates its format. Any string — even 'banana' — passes auth. Fix the middleware to reject tokens that don't look like a valid JWT (three Base64 dot-separated parts).",
    incident:
      "Security audit finds that passing 'Authorization: notavalidtoken' grants full access to protected endpoints. The middleware only checks for the header's presence, not its validity.",
    steps: [
      { description: "Find the requireAuth middleware in server.js." },
      {
        description:
          "Add validation: a JWT has exactly 3 parts separated by '.' (header.payload.signature).",
      },
      {
        description:
          "Reject tokens that don't match this pattern with res.status(401). Valid-format tokens should still pass.",
      },
    ],
    entryFile: "server.js",
    expectedOutput: "TEST PASSED: Auth middleware validates token format (2/2)",
    initialFiles: [
      {
        name: "server.js",
        path: "server.js",
        language: "javascript",
        content: `const express = require("express");
const http = require("http");
const app = express();
app.use(express.json());

// ── YOUR TASK ──────────────────────────────────────────────────────────────
// BUG: The auth middleware only checks that the Authorization header exists.
// Any value — even "banana" — is accepted as a valid token.
//
// Fix: A real JWT has 3 dot-separated Base64 parts (header.payload.signature).
// Reject tokens that don't have exactly 3 parts when split by ".".
//
// Example valid format: "eyJhbGc.eyJ1c2VyI.SflKxwRJ"  (3 parts)
// Example invalid:      "notavalidtoken"                (1 part — reject)
// ──────────────────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "No token provided" });
  // BUG: No validation — any string passes
  req.user = { id: "user-1" };
  next();
}

app.get("/api/profile", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ── AUTO-GRADER (do not modify) ────────────────────────────────────────────
const server = app.listen(3000, () => {
  setTimeout(() => {
    let passed = 0;
    let total = 0;

    const finish = () => {
      if (total === 2) {
        if (passed === 2) {
          console.log("TEST PASSED: Auth middleware validates token format (2/2)");
        } else {
          console.log("TEST FAILED: " + passed + "/2 checks passed");
        }
        server.close();
      }
    };

    // Test 1: Valid JWT format (3 dot-separated parts) should return 200
    http.get({
      hostname: "localhost", port: 3000, path: "/api/profile",
      headers: { "Authorization": "eyJhbGc.eyJ1c2VyI.SflKxwRJ" },
    }, (res) => {
      res.resume();
      total++;
      if (res.statusCode === 200) { passed++; }
      else { console.log("  T1 FAIL: Valid-format token rejected (got " + res.statusCode + ")"); }
      finish();
    }).on("error", () => { total++; console.log("  T1 FAIL: request error"); finish(); });

    // Test 2: Invalid token (no dots) should return 401
    http.get({
      hostname: "localhost", port: 3000, path: "/api/profile",
      headers: { "Authorization": "notavalidtoken" },
    }, (res) => {
      res.resume();
      total++;
      if (res.statusCode === 401) { passed++; }
      else { console.log("  T2 FAIL: Invalid token accepted (got " + res.statusCode + ", expected 401)"); }
      finish();
    }).on("error", () => { total++; console.log("  T2 FAIL: request error"); finish(); });
  }, 150);
});
`,
      },
    ],
    solution: {
      "server.js": `const express = require("express");
const http = require("http");
const app = express();
app.use(express.json());

// FIX: Validate that the token has the correct JWT structure (3 dot-separated parts)
function requireAuth(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "No token provided" });

  const parts = token.split(".");
  if (parts.length !== 3) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  req.user = { id: "user-1" };
  next();
}

app.get("/api/profile", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ── AUTO-GRADER (do not modify) ────────────────────────────────────────────
const server = app.listen(3000, () => {
  setTimeout(() => {
    let passed = 0;
    let total = 0;

    const finish = () => {
      if (total === 2) {
        if (passed === 2) {
          console.log("TEST PASSED: Auth middleware validates token format (2/2)");
        } else {
          console.log("TEST FAILED: " + passed + "/2 checks passed");
        }
        server.close();
      }
    };

    http.get({
      hostname: "localhost", port: 3000, path: "/api/profile",
      headers: { "Authorization": "eyJhbGc.eyJ1c2VyI.SflKxwRJ" },
    }, (res) => {
      res.resume();
      total++;
      if (res.statusCode === 200) { passed++; }
      else { console.log("  T1 FAIL: Valid-format token rejected (got " + res.statusCode + ")"); }
      finish();
    }).on("error", () => { total++; console.log("  T1 FAIL: request error"); finish(); });

    http.get({
      hostname: "localhost", port: 3000, path: "/api/profile",
      headers: { "Authorization": "notavalidtoken" },
    }, (res) => {
      res.resume();
      total++;
      if (res.statusCode === 401) { passed++; }
      else { console.log("  T2 FAIL: Invalid token accepted (got " + res.statusCode + ", expected 401)"); }
      finish();
    }).on("error", () => { total++; console.log("  T2 FAIL: request error"); finish(); });
  }, 150);
});
`,
    },
    hints: [
      "A JWT always has exactly 3 parts: header, payload, signature — joined by dots.",
      "Use token.split('.') and check that the result has length === 3.",
      "Return res.status(401).json({ error: 'Invalid token format' }) if the check fails.",
    ],
    estimatedTime: 25,
    tags: ["Authentication", "JWT", "Security", "Express"],
    xpReward: 150,
  },

  // ═══════════════════════ 9. CIRCULAR DEPENDENCY (Hard) ═══════════════════
  {
    title: "Circular Dependency Crash",
    category: "backend",
    difficulty: "hard",
    description:
      "The service crashes at runtime because moduleA and moduleB require each other. When Node.js loads them, one module gets an incomplete export (an empty object) — causing 'TypeError: validate is not a function'. Refactor to break the cycle.",
    incident:
      "TypeError: validate is not a function — moduleB requires moduleA during its own initialization. But moduleA is still loading (it required moduleB first), so moduleA's exports are an empty {} at that point. The process(x) function in moduleB crashes.",
    steps: [
      {
        description:
          "Trace the require chain: moduleA → moduleB → moduleA (cycle). One of them gets {}.",
      },
      {
        description:
          "Notice that the shared 'validate' function causes the cycle. Extract it to a new utils.js.",
      },
      {
        description:
          "Update moduleA and moduleB to require utils.js instead of each other. The cycle is broken.",
      },
    ],
    entryFile: "index.js",
    expectedOutput:
      "TEST PASSED: Modules work correctly — compute:42, process:10",
    initialFiles: [
      {
        name: "index.js",
        path: "index.js",
        language: "javascript",
        content: `const moduleA = require("./moduleA");
const moduleB = require("./moduleB");

// ── AUTO-GRADER (do not modify) ────────────────────────────────────────────
try {
  const computed = moduleA.compute(21);
  const processed = moduleB.process(10);
  if (computed === 42 && processed === 10) {
    console.log("TEST PASSED: Modules work correctly — compute:" + computed + ", process:" + processed);
  } else {
    console.log("TEST FAILED: Unexpected values — compute:" + computed + " process:" + processed);
  }
} catch (e) {
  console.log("TEST FAILED: " + e.message);
}
`,
      },
      {
        name: "moduleA.js",
        path: "moduleA.js",
        language: "javascript",
        content: `// ── YOUR TASK ──────────────────────────────────────────────────────────────
// BUG: Circular dependency. moduleA requires moduleB, and moduleB requires
// moduleA. When Node loads them, one gets an incomplete export (empty {}).
//
// Fix: Extract the shared "validate" function into a new utils.js file
// and have both modules require utils.js instead of each other.
// ──────────────────────────────────────────────────────────────────────────
const { helper } = require("./moduleB"); // creates the cycle

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
        content: `const { validate } = require("./moduleA"); // BUG: circular import

function helper() {
  return "ok";
}

function process(x) {
  if (!validate(x)) throw new Error("validate is not a function or returned false");
  return x;
}

module.exports = { helper, process };
`,
      },
    ],
    solution: {
      "utils.js": `// FIX: Extract shared logic here to break the circular dependency
function validate(x) {
  return typeof x === "number";
}

function helper() {
  return "ok";
}

module.exports = { validate, helper };
`,
      "moduleA.js": `// FIX: Require utils instead of moduleB — cycle broken
const { helper } = require("./utils");

function compute(x) {
  return x * 2;
}

function validate(x) {
  return typeof x === "number" && helper() === "ok";
}

module.exports = { compute, validate };
`,
      "moduleB.js": `// FIX: Require utils instead of moduleA — cycle broken
const { validate } = require("./utils");

function helper() {
  return "ok";
}

function process(x) {
  if (!validate(x)) throw new Error("Invalid input");
  return x;
}

module.exports = { helper, process };
`,
    },
    hints: [
      "When A requires B and B requires A, one gets an empty {} because the other hasn't finished exporting yet.",
      "The fix is to extract shared logic (validate, helper) into a third file (utils.js) that neither A nor B imports from the other.",
      "Create utils.js with the shared functions, then update moduleA and moduleB to require('./utils') instead of each other.",
    ],
    estimatedTime: 30,
    tags: ["Node.js", "Modules", "Architecture", "Debugging"],
    xpReward: 150,
  },
];

async function seed() {
  try {
    await prisma.$connect();
    console.log("Connected to MongoDB via Prisma");

    for (const simData of seedSimulations) {
      const existing = await prisma.simulation.findFirst({
        where: { title: simData.title },
      });

      let simulation;
      if (existing) {
        // Full update — including files, solution, description, incident, and grading fields
        simulation = await prisma.simulation.update({
          where: { id: existing.id },
          data: {
            description: simData.description,
            incident: simData.incident,
            entryFile: simData.entryFile,
            expectedOutput: simData.expectedOutput,
            difficulty: simData.difficulty,
            steps: simData.steps,
            hints: simData.hints,
            estimatedTime: simData.estimatedTime,
            xpReward: simData.xpReward,
            tags: simData.tags,
            initialFiles: simData.initialFiles,
            solution: simData.solution,
          },
        });
        console.log(
          `Updated: "${simulation.title}" (entry: ${simulation.entryFile}, expected: "${simulation.expectedOutput?.slice(0, 50)}")`,
        );
      } else {
        simulation = await prisma.simulation.create({ data: simData });
        console.log(`Created: "${simulation.title}" (${simulation.id})`);
      }

      if (UPLOAD_TO_CLOUDINARY) {
        console.log(
          `  Uploading ${simulation.initialFiles.length} file(s) to Cloudinary...`,
        );

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

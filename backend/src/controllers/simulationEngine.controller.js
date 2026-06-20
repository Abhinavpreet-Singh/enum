import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";
import { fetchFileFromCloudinary } from "../utils/cloudinary.js";
import { executeCompilerCode } from "../services/compilerService.js";

/**
 * Bundle simulation files into a single CommonJS bootstrap script.
 *
 * The generated /app/code.js is executed by the Docker runner with plain
 * `node code.js`, so the bootstrap itself must be CommonJS. The simulation
 * files also use CJS require(). The bootstrap:
 *
 *   1. Writes all files to /tmp/enum-sim/ with a package.json forcing CJS.
 *   2. Symlinks node_modules from known locations so require("express") etc.
 *      always resolve, regardless of Docker image layout.
 *   3. Spawns the entry file as a child Node process in CJS mode.
 */
function bundleFiles(files, entryFile) {
    return [
        `const fs = require("fs");`,
        `const path = require("path");`,
        `const { execSync } = require("child_process");`,
        ``,
        `const SIM_DIR = "/tmp/enum-sim";`,
        ``,
        `// Clean previous run`,
        `try {`,
        `  if (fs.rmSync) fs.rmSync(SIM_DIR, { recursive: true, force: true });`,
        `  else fs.rmdirSync(SIM_DIR, { recursive: true });`,
        `} catch(e) {}`,
        `fs.mkdirSync(SIM_DIR, { recursive: true });`,
        ``,
        `// Force CJS mode so require() works in simulation files`,
        `fs.writeFileSync(path.join(SIM_DIR, "package.json"), '{"type":"commonjs"}');`,
        ``,
        `// Symlink node_modules so require("express") etc. resolve from SIM_DIR.`,
        `// Try /node_modules first (Docker image root), then /app/node_modules (volume mount).`,
        `const nmTarget = fs.existsSync("/node_modules") ? "/node_modules"`,
        `               : fs.existsSync("/app/node_modules") ? "/app/node_modules"`,
        `               : null;`,
        `if (nmTarget) {`,
        `  try { fs.symlinkSync(nmTarget, path.join(SIM_DIR, "node_modules"), "dir"); } catch(e) {}`,
        `}`,
        ``,
        `const simFiles = ${JSON.stringify(files)};`,
        ``,
        `for (const [name, content] of Object.entries(simFiles)) {`,
        `  const fp = path.join(SIM_DIR, name);`,
        `  fs.mkdirSync(path.dirname(fp), { recursive: true });`,
        `  fs.writeFileSync(fp, content, "utf-8");`,
        `}`,
        ``,
        `// Verify entry file exists`,
        `const entryPath = path.join(SIM_DIR, ${JSON.stringify(entryFile)});`,
        `if (!fs.existsSync(entryPath)) {`,
        `  const written = fs.readdirSync(SIM_DIR).join(", ");`,
        `  console.error("Error: Entry file ${entryFile} not found. Files: " + written);`,
        `  process.exit(1);`,
        `}`,
        ``,
        `// Run entry file as a separate CJS Node process.`,
        `// stdio:"inherit" streams output to the parent so the compiler captures it.`,
        `try {`,
        `  execSync("node " + ${JSON.stringify(entryFile)}, {`,
        `    cwd: SIM_DIR,`,
        `    stdio: "inherit",`,
        `    timeout: 8000,`,
        `    env: { ...process.env, NODE_PATH: nmTarget || "" }`,
        `  });`,
        `} catch(e) {`,
        `  // execSync throws on non-zero exit — output is already streamed via inherit`,
        `  process.exitCode = e.status || 1;`,
        `}`,
    ].join("\n");
}

/**
 * POST /api/v1/simulation-engine/run
 *
 * Accepts { simulationId, editedFiles } from the frontend.
 * - Fetches the original simulation files (from Cloudinary if hosted).
 * - Overlays the user's edits on top.
 * - Sends the bundled code to enum-compiler for execution.
 * - Compares output to simulation.expectedOutput and returns a score.
 *
 * Response shape expected by the frontend (SimulationEngineResponse):
 *   { score, passedTests, totalTests, logs, submissionId }
 */
export const runSimulationEngine = asyncHandler(async (req, res) => {
    const { simulationId, editedFiles } = req.body;

    if (!simulationId) throw new ApiError(400, "simulationId is required");
    if (!editedFiles || !Array.isArray(editedFiles) || editedFiles.length === 0) {
        throw new ApiError(400, "editedFiles array is required");
    }

    const simulation = await prisma.simulation.findUnique({
        where: { id: simulationId },
    });
    if (!simulation) throw new ApiError(404, "Simulation not found");

    // ── Build base file map from simulation's stored files ───────────────
    const fileMap = {};
    await Promise.all(
        simulation.initialFiles.map(async (file) => {
            if (file.cloudinaryUrl) {
                try {
                    fileMap[file.path] = await fetchFileFromCloudinary(file.cloudinaryUrl);
                } catch {
                    fileMap[file.path] = file.content || "";
                }
            } else {
                fileMap[file.path] = file.content || "";
            }
        }),
    );

    // ── Overlay user's edited files ──────────────────────────────────────
    for (const { filename, content } of editedFiles) {
        fileMap[filename] = content;
    }

    // ── Resolve entry file ───────────────────────────────────────────────
    // Priority: 1) entryFile sent by client (most accurate — computed from
    //              live file map in the browser), 2) stored simulation.entryFile,
    //              3) auto-detect from common candidates.
    const ENTRY_CANDIDATES = ["server.js", "index.js", "main.js", "app.js"];
    let entryFile =
        req.body.entryFile ||
        simulation.entryFile ||
        "";

    if (!entryFile || !fileMap[entryFile]) {
        // Auto-detect: try common names, then first top-level .js file
        entryFile =
            ENTRY_CANDIDATES.find((c) => fileMap[c]) ||
            Object.keys(fileMap).find((k) => k.endsWith(".js") && !k.includes("/")) ||
            Object.keys(fileMap)[0] ||
            "index.js";
    }

    if (!fileMap[entryFile]) {
        throw new ApiError(
            400,
            `Could not determine entry file. Available files: ${Object.keys(fileMap).join(", ")}`,
        );
    }

    // ── Bundle and send to enum-compiler ─────────────────────────────────
    const code = bundleFiles(fileMap, entryFile);

    const { output: compilerOutput = "" } = await executeCompilerCode({
        language: "node",
        code,
    });

    // ── Evaluate result ──────────────────────────────────────────────────
    const expectedOutput = (simulation.expectedOutput || "").trim();
    const actualOutput = compilerOutput.trim();
    const totalTests = 1;
    let passedTests = 0;

    if (!expectedOutput) {
        // No expected output defined — pass if no runtime error keywords present
        const hasError =
            /^(Error|TypeError|ReferenceError|SyntaxError|RangeError|UnhandledPromiseRejection)/m.test(
                actualOutput,
            );
        passedTests = hasError ? 0 : 1;
    } else {
        passedTests = actualOutput === expectedOutput ? 1 : 0;
    }

    const score = Math.round((passedTests / totalTests) * 100);

    return res.status(200).json({
        message: "Simulation engine run complete",
        data: {
            score,
            passedTests,
            totalTests,
            logs: compilerOutput,
            submissionId: crypto.randomUUID(),
        },
    });
});

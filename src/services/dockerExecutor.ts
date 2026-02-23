/**
 * Code execution service for simulations.
 *
 * Routes execution through the Enum Compiler service at
 * enumcompiler.duckdns.org/run which already handles Docker
 * sandboxing (--network none, --memory=256m, --cpus=0.5).
 *
 * For multi-file simulations the files are bundled into a single
 * self-contained script that writes them to /tmp at runtime, then
 * executes the entry file via require().
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExecutionRequest {
    /** filename → source code */
    files: Record<string, string>;
    /** Which file to run (e.g. "server.js") */
    entryFile: string;
}

export interface ExecutionResult {
    success: boolean;
    output: string;
    error?: string;
    exitCode: number | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COMPILER_URL = "http://enumcompiler.duckdns.org/run";
const COMPILER_TIMEOUT_MS = 30_000; // 30 s network timeout

// ─── Bundle multi-file simulation into a single Node.js script ──────────────

function bundleFiles(
    files: Record<string, string>,
    entryFile: string,
): string {
    const fileEntries = Object.entries(files);

    // Single-file shortcut: no bundling needed
    if (fileEntries.length === 1) {
        return fileEntries[0][1];
    }

    // Multi-file: generate a bootstrap script that writes all files to a temp
    // directory and then requires the entry file.
    //
    // This works because the compiler runs `node code.js` inside Docker.
    // The bootstrap:
    //   1. Creates /tmp/sim/<filename> for every file
    //   2. Requires /tmp/sim/<entryFile>
    //
    // Using JSON.stringify to safely embed file contents as string literals.

    const lines: string[] = [
        `"use strict";`,
        `const fs = require("fs");`,
        `const path = require("path");`,
        ``,
        `const SIM_DIR = path.join(require("os").tmpdir(), "enum-sim");`,
        ``,
        `// ── Write simulation files ──`,
        `const files = ${JSON.stringify(files)};`,
        ``,
        `for (const [name, content] of Object.entries(files)) {`,
        `  const fp = path.join(SIM_DIR, name);`,
        `  fs.mkdirSync(path.dirname(fp), { recursive: true });`,
        `  fs.writeFileSync(fp, content, "utf-8");`,
        `}`,
        ``,
        `// ── Execute entry file ──`,
        `require(path.join(SIM_DIR, ${JSON.stringify(entryFile)}));`,
    ];

    return lines.join("\n");
}

// ─── Main entry point ───────────────────────────────────────────────────────

export async function executeInDocker(
    request: ExecutionRequest,
): Promise<ExecutionResult> {
    const { files, entryFile } = request;

    try {
        const code = bundleFiles(files, entryFile);

        const controller = new AbortController();
        const timeoutId = setTimeout(
            () => controller.abort(),
            COMPILER_TIMEOUT_MS,
        );

        const response = await fetch(COMPILER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language: "node", code }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            return {
                success: false,
                output: "",
                error: `Compiler service error (${response.status}): ${errorText}`,
                exitCode: null,
            };
        }

        const data = await response.json();
        const output: string = data.output ?? "";

        // The compiler returns combined stdout+stderr in `output`.
        // Heuristic: if the output contains common error patterns, treat as failure.
        const hasError =
            /^(Error|TypeError|ReferenceError|SyntaxError|RangeError|UnhandledPromiseRejection)/m.test(
                output,
            ) ||
            /^\s*at\s+/m.test(output) ||
            output.includes("throw ") ||
            output.includes("Cannot find module");

        if (hasError) {
            return {
                success: false,
                output: "",
                error: output,
                exitCode: 1,
            };
        }

        return {
            success: true,
            output: output || "Code executed successfully (no output).",
            exitCode: 0,
        };
    } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
            return {
                success: false,
                output: "",
                error: "Execution timed out — the compiler service did not respond in time.",
                exitCode: null,
            };
        }

        return {
            success: false,
            output: "",
            error:
                err instanceof Error
                    ? err.message
                    : "Unknown execution error",
            exitCode: null,
        };
    }
}

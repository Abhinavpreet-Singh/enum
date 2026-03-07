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
    // The bootstrap (code.js) runs as ESM because the compiler's
    // /app/package.json has "type":"module".
    //
    // It writes simulation files into /app/__sim__/ — a sub-directory of the
    // Docker volume mount — so that Node's upward module resolution reaches
    // /app/node_modules/ (where express, cors, etc. live).
    //
    // A package.json with {"type":"commonjs"} is written into __sim__/ so
    // the simulation's .js files default to CJS and require() works.
    //
    // The entry file is launched as a separate CJS Node process via execSync,
    // avoiding all ESM ↔ CJS interop issues.

    const lines: string[] = [
        `import fs from "fs";`,
        `import path from "path";`,
        `import child_process from "child_process";`,
        ``,
        `const SIM_DIR = path.join("/app", "__sim__");`,
        ``,
        `// Clean slate`,
        `try { fs.rmSync(SIM_DIR, { recursive: true, force: true }); } catch(e) {}`,
        `fs.mkdirSync(SIM_DIR, { recursive: true });`,
        ``,
        `// Force CJS so require() works inside simulation files`,
        `fs.writeFileSync(`,
        `  path.join(SIM_DIR, "package.json"),`,
        `  JSON.stringify({ type: "commonjs" })`,
        `);`,
        ``,
        `const simFiles = ${JSON.stringify(files)};`,
        ``,
        `for (const [name, content] of Object.entries(simFiles)) {`,
        `  const fp = path.join(SIM_DIR, name);`,
        `  fs.mkdirSync(path.dirname(fp), { recursive: true });`,
        `  fs.writeFileSync(fp, content, "utf-8");`,
        `}`,
        ``,
        `// Run the entry file as a separate CJS Node process.`,
        `// Module resolution: /app/__sim__/node_modules → /app/node_modules/ ✓`,
        `try {`,
        `  child_process.execSync(`,
        `    "node " + ${JSON.stringify(entryFile)},`,
        `    { cwd: SIM_DIR, stdio: "inherit", timeout: 8000 }`,
        `  );`,
        `} catch(e) {`,
        `  if (e.stderr) process.stderr.write(e.stderr);`,
        `  process.exit(e.status || 1);`,
        `}`,
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

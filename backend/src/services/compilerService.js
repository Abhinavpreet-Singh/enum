import { execFile, spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

import { ApiError } from "../utils/apiError.js";
import { codeExecutionGate } from "../utils/executionGate.js";

const execFileAsync = promisify(execFile);

const COMPILER_TIMEOUT_MS = 30_000;
const NODE_TIMEOUT_MS = 10_000;
const DEFAULT_LANG_TIMEOUT_MS = 5_000;
const DOCKER_IMAGE = process.env.COMPILER_DOCKER_IMAGE || "enum-runner";
const WINDOWS_DOCKER_CLI =
  "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe";
const DOCKER_COMMAND =
  process.env.DOCKER_COMMAND ||
  (process.platform === "win32" && fs.existsSync(WINDOWS_DOCKER_CLI)
    ? WINDOWS_DOCKER_CLI
    : "docker");
const OUTPUT_BUFFER_BYTES = 1024 * 1024;
const MAX_OUTPUT_BYTES = 1024 * 1024;

/**
 * auto  — try Docker, fall back to local (default; works on Dokploy/DO without DinD)
 * docker — Docker only
 * local  — in-process compilers only (matches backend Dockerfile tooling)
 */
const COMPILER_RUNTIME = String(
  process.env.COMPILER_RUNTIME || "auto",
)
  .trim()
  .toLowerCase();

const LANGUAGE_FILES = {
  python: "code.py",
  cpp: "code.cpp",
  c: "code.c",
  java: "Main.java",
  node: "code.js",
  javascript: "code.js",
  js: "code.js",
  bash: "code.sh",
  sh: "code.sh",
  shell: "code.sh",
};

const RUNNER_LANGUAGES = {
  javascript: "node",
  js: "node",
};

function normalizeLanguage(language) {
  return String(language || "").trim().toLowerCase();
}

function getRunnerLanguage(language) {
  return RUNNER_LANGUAGES[language] || language;
}

function cleanupWorkdir(workdir) {
  try {
    fs.rmSync(workdir, { recursive: true, force: true });
  } catch {
    // Best effort cleanup; execution result should not fail because temp cleanup did.
  }
}

function isDockerInfrastructureError(error) {
  const message = `${error?.message || ""}\n${error?.stderr || ""}`.toLowerCase();

  return (
    error?.code === "ENOENT" ||
    message.includes("cannot connect to the docker daemon") ||
    message.includes("failed to connect to the docker") ||
    message.includes("docker daemon") ||
    message.includes("docker api") ||
    message.includes("pull access denied") ||
    message.includes("unable to find image") ||
    message.includes("is the docker daemon running") ||
    message.includes("error during connect")
  );
}

function appendBounded(target, chunk, maxBytes) {
  if (target.length >= maxBytes) return target;
  const next = target + chunk.toString();
  return next.length > maxBytes ? next.slice(0, maxBytes) : next;
}

function killProcessTree(child) {
  if (!child?.pid) return;

  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"], {
        stdio: "ignore",
      });
      return;
    }

    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  } catch {
    // Process may already have exited.
  }
}

function runLocalCommand(command, args, { cwd, timeoutMs, env } = {}) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const child = spawn(command, args, {
      cwd,
      env: env || process.env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
      windowsHide: true,
    });

    const timer = setTimeout(() => {
      killProcessTree(child);
      finish({
        stdout,
        stderr,
        exitCode: 124,
        timedOut: true,
      });
    }, timeoutMs);

    child.stdout.on("data", (data) => {
      stdout = appendBounded(stdout, data, MAX_OUTPUT_BYTES);
    });

    child.stderr.on("data", (data) => {
      stderr = appendBounded(stderr, data, MAX_OUTPUT_BYTES);
    });

    child.on("error", (err) => {
      finish({
        stdout,
        stderr: err.message,
        exitCode: 1,
        timedOut: false,
      });
    });

    child.on("close", (code) => {
      finish({
        stdout,
        stderr,
        exitCode: code ?? 1,
        timedOut: false,
      });
    });
  });
}

function combineOutput(stdout, stderr) {
  return String(stdout || stderr || "");
}

async function executeLocally({ language, workdir, filename }) {
  const timeoutMs =
    language === "node" ? NODE_TIMEOUT_MS : DEFAULT_LANG_TIMEOUT_MS;
  const pythonCmd = process.platform === "win32" ? "python" : "python3";
  const env = {
    ...process.env,
    NODE_PATH:
      process.env.NODE_PATH ||
      "/usr/local/lib/node_modules:/node_modules",
  };

  if (language === "python") {
    const result = await runLocalCommand(pythonCmd, [filename], {
      cwd: workdir,
      timeoutMs,
      env,
    });
    return { output: combineOutput(result.stdout, result.stderr) };
  }

  if (language === "node") {
    // Match enum-runner: long-lived servers are killed by timeout; stdout is kept.
    const result = await runLocalCommand("node", [filename], {
      cwd: workdir,
      timeoutMs,
      env,
    });
    return { output: combineOutput(result.stdout, result.stderr) };
  }

  if (language === "bash" || language === "sh" || language === "shell") {
    const shell = process.platform === "win32" ? "bash" : "bash";
    const result = await runLocalCommand(shell, [filename], {
      cwd: workdir,
      timeoutMs,
      env,
    });
    return { output: combineOutput(result.stdout, result.stderr) };
  }

  if (language === "cpp" || language === "c") {
    const compiler = language === "cpp" ? "g++" : "gcc";
    const binaryName =
      process.platform === "win32" ? "output.exe" : "output";
    const binaryPath = path.join(workdir, binaryName);
    const compile = await runLocalCommand(
      compiler,
      [filename, "-o", binaryPath],
      { cwd: workdir, timeoutMs: COMPILER_TIMEOUT_MS, env },
    );

    if (compile.exitCode !== 0) {
      return { output: combineOutput(compile.stdout, compile.stderr) };
    }

    const result = await runLocalCommand(binaryPath, [], {
      cwd: workdir,
      timeoutMs,
      env,
    });
    return { output: combineOutput(result.stdout, result.stderr) };
  }

  if (language === "java") {
    const compile = await runLocalCommand("javac", [filename], {
      cwd: workdir,
      timeoutMs: COMPILER_TIMEOUT_MS,
      env,
    });

    if (compile.exitCode !== 0) {
      return { output: combineOutput(compile.stdout, compile.stderr) };
    }

    const className = path.basename(filename, ".java");
    const result = await runLocalCommand("java", [className], {
      cwd: workdir,
      timeoutMs,
      env,
    });
    return { output: combineOutput(result.stdout, result.stderr) };
  }

  throw new ApiError(400, "Invalid language");
}

async function executeInDocker({ language, workdir, filename }) {
  const { stdout, stderr } = await execFileAsync(
    DOCKER_COMMAND,
    [
      "run",
      "--rm",
      "--network",
      "none",
      "--memory=256m",
      "--cpus=0.5",
      "-v",
      `${workdir}:/app`,
      DOCKER_IMAGE,
      language,
      filename,
    ],
    {
      timeout: COMPILER_TIMEOUT_MS,
      maxBuffer: OUTPUT_BUFFER_BYTES,
    },
  );

  return { output: stdout || stderr };
}

export async function executeCompilerCode({ language, code }) {
  const requestedLanguage = normalizeLanguage(language);
  const filename = LANGUAGE_FILES[requestedLanguage];

  if (!filename) {
    throw new ApiError(400, "Invalid language");
  }

  if (typeof code !== "string" || !code.trim()) {
    throw new ApiError(400, "Code is required");
  }

  // Gate at this level only. Acquiring per-spawn instead would let a queued
  // compile step wait on slots held by its own callers, which can deadlock, and
  // a capacity error raised inside executeInDocker would be misread by the
  // fallback handler below as compiler output.
  return codeExecutionGate.run(() =>
    runCompilerPipeline({ requestedLanguage, filename, code }),
  );
}

async function runCompilerPipeline({ requestedLanguage, filename, code }) {
  const runnerLanguage = getRunnerLanguage(requestedLanguage);
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "enum-run-"));
  const filePath = path.join(workdir, filename);

  try {
    if (filename === "code.sh") {
      fs.writeFileSync(path.join(workdir, ".arena-secret"), "", "utf-8");
    }

    fs.writeFileSync(filePath, code, "utf-8");

    if (COMPILER_RUNTIME === "local") {
      return await executeLocally({
        language: runnerLanguage,
        workdir,
        filename,
      });
    }

    if (COMPILER_RUNTIME === "docker") {
      try {
        return await executeInDocker({
          language: runnerLanguage,
          workdir,
          filename,
        });
      } catch (error) {
        if (isDockerInfrastructureError(error)) {
          throw new ApiError(
            503,
            `Compiler runtime unavailable. Ensure Docker is installed, running, and the ${DOCKER_IMAGE} image is built.`,
          );
        }

        if (error?.killed || error?.signal === "SIGTERM") {
          throw new ApiError(504, "Execution timed out");
        }

        const output = error?.stdout || error?.stderr || error?.message || "";
        return { output: String(output) };
      }
    }

    // auto: prefer Docker isolation when available, otherwise run locally.
    try {
      return await executeInDocker({
        language: runnerLanguage,
        workdir,
        filename,
      });
    } catch (error) {
      if (isDockerInfrastructureError(error)) {
        return await executeLocally({
          language: runnerLanguage,
          workdir,
          filename,
        });
      }

      if (error?.killed || error?.signal === "SIGTERM") {
        throw new ApiError(504, "Execution timed out");
      }

      const output = error?.stdout || error?.stderr || error?.message || "";
      return { output: String(output) };
    }
  } finally {
    cleanupWorkdir(workdir);
  }
}

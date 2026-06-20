import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

import { ApiError } from "../utils/apiError.js";

const execFileAsync = promisify(execFile);

const COMPILER_TIMEOUT_MS = 30_000;
const DOCKER_IMAGE = process.env.COMPILER_DOCKER_IMAGE || "enum-runner";
const WINDOWS_DOCKER_CLI = "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe";
const DOCKER_COMMAND =
  process.env.DOCKER_COMMAND ||
  (process.platform === "win32" && fs.existsSync(WINDOWS_DOCKER_CLI)
    ? WINDOWS_DOCKER_CLI
    : "docker");
const OUTPUT_BUFFER_BYTES = 1024 * 1024;
const DIRECT_RUNNER_COMMANDS = {
  python: { command: "python3" },
  node: { command: "node" },
  bash: { command: "bash" },
  sh: { command: "bash" },
  shell: { command: "bash" },
};

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
  const message = `${error?.message || ""}\n${error?.stderr || ""}`;

  return (
    error?.code === "ENOENT" ||
    message.includes("Cannot connect to the Docker daemon") ||
    message.includes("failed to connect to the docker API") ||
    message.includes("docker daemon") ||
    message.includes("pull access denied") ||
    message.includes("Unable to find image")
  );
}

function getDirectRunnerEnv() {
  const nodePaths = [
    process.env.NODE_PATH,
    path.resolve(process.cwd(), "node_modules"),
  ].filter(Boolean);

  return {
    ...process.env,
    NODE_PATH: nodePaths.join(path.delimiter),
  };
}

async function runDirectly({ runnerLanguage, filename, workdir }) {
  if (runnerLanguage === "cpp") {
    await execFileAsync("g++", [filename, "-o", "output"], {
      cwd: workdir,
      timeout: COMPILER_TIMEOUT_MS,
      maxBuffer: OUTPUT_BUFFER_BYTES,
    });
    return execFileAsync(path.join(workdir, "output"), [], {
      cwd: workdir,
      env: getDirectRunnerEnv(),
      timeout: COMPILER_TIMEOUT_MS,
      maxBuffer: OUTPUT_BUFFER_BYTES,
    });
  }

  if (runnerLanguage === "c") {
    await execFileAsync("gcc", [filename, "-o", "output"], {
      cwd: workdir,
      timeout: COMPILER_TIMEOUT_MS,
      maxBuffer: OUTPUT_BUFFER_BYTES,
    });
    return execFileAsync(path.join(workdir, "output"), [], {
      cwd: workdir,
      env: getDirectRunnerEnv(),
      timeout: COMPILER_TIMEOUT_MS,
      maxBuffer: OUTPUT_BUFFER_BYTES,
    });
  }

  if (runnerLanguage === "java") {
    await execFileAsync("javac", [filename], {
      cwd: workdir,
      timeout: COMPILER_TIMEOUT_MS,
      maxBuffer: OUTPUT_BUFFER_BYTES,
    });
    return execFileAsync("java", [path.basename(filename, ".java")], {
      cwd: workdir,
      env: getDirectRunnerEnv(),
      timeout: COMPILER_TIMEOUT_MS,
      maxBuffer: OUTPUT_BUFFER_BYTES,
    });
  }

  const runner = DIRECT_RUNNER_COMMANDS[runnerLanguage];
  if (!runner) {
    throw new ApiError(400, `Unsupported language: ${runnerLanguage}`);
  }

  return execFileAsync(runner.command, [filename], {
    cwd: workdir,
    env: getDirectRunnerEnv(),
    timeout: COMPILER_TIMEOUT_MS,
    maxBuffer: OUTPUT_BUFFER_BYTES,
  });
}

async function executeInDocker({ runnerLanguage, filename, workdir }) {
  return execFileAsync(
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
      runnerLanguage,
      filename,
    ],
    {
      timeout: COMPILER_TIMEOUT_MS,
      maxBuffer: OUTPUT_BUFFER_BYTES,
    },
  );
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

  const runnerLanguage = getRunnerLanguage(requestedLanguage);
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "enum-run-"));
  const filePath = path.join(workdir, filename);

  try {
    if (filename === "code.sh") {
      fs.writeFileSync(path.join(workdir, ".arena-secret"), "", "utf-8");
    }

    fs.writeFileSync(filePath, code, "utf-8");

    let stdout;
    let stderr;
    try {
      ({ stdout, stderr } = await executeInDocker({
        runnerLanguage,
        filename,
        workdir,
      }));
    } catch (error) {
      if (!isDockerInfrastructureError(error)) throw error;
      ({ stdout, stderr } = await runDirectly({
        runnerLanguage,
        filename,
        workdir,
      }));
    }

    return { output: stdout || stderr };
  } catch (error) {
    if (error?.killed || error?.signal === "SIGTERM") {
      throw new ApiError(504, "Execution timed out");
    }

    const output = error?.stdout || error?.stderr || error?.message || "";
    return { output: String(output) };
  } finally {
    cleanupWorkdir(workdir);
  }
}


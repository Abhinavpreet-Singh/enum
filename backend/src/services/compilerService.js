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
    message.includes("docker daemon") ||
    message.includes("pull access denied") ||
    message.includes("Unable to find image")
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
        runnerLanguage,
        filename,
      ],
      {
        timeout: COMPILER_TIMEOUT_MS,
        maxBuffer: OUTPUT_BUFFER_BYTES,
      },
    );

    return { output: stdout || stderr };
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
  } finally {
    cleanupWorkdir(workdir);
  }
}


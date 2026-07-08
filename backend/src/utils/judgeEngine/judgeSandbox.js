import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";

const JUDGE_TMP_ROOT =
  process.env.ENUM_JUDGE_TMPDIR || path.join(os.tmpdir(), "enum-judge");

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_OUTPUT_BYTES = 256 * 1024;

function ensureTmpRoot() {
  fs.mkdirSync(JUDGE_TMP_ROOT, { recursive: true });
}

export function createJudgeWorkdir() {
  ensureTmpRoot();
  return fs.mkdtempSync(path.join(JUDGE_TMP_ROOT, "run-"));
}

export function cleanupJudgeWorkdir(workdir) {
  try {
    fs.rmSync(workdir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup only.
  }
}

export function writeJudgeFile(workdir, filename, contents) {
  const filePath = path.join(workdir, filename);
  fs.writeFileSync(filePath, contents, "utf8");
  return filePath;
}

export function getCompiledBinaryPath(workdir, basename = "main") {
  const binaryName = process.platform === "win32" ? `${basename}.exe` : basename;
  return path.join(workdir, binaryName);
}

function appendBounded(target, chunk, maxBytes) {
  if (target.length >= maxBytes) return target;
  const next = target + chunk.toString();
  return next.length > maxBytes ? next.slice(0, maxBytes) : next;
}

export function runCommandWithInput(command, args, input, timeoutMs = DEFAULT_TIMEOUT_MS) {
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
      stdio: ["pipe", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({
        stdout,
        stderr: stderr || `Timed out after ${timeoutMs}ms`,
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
      finish({ stdout: "", stderr: err.message, exitCode: 1, timedOut: false });
    });

    child.on("close", (code) => {
      finish({
        stdout,
        stderr,
        exitCode: code ?? 1,
        timedOut: false,
      });
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

export async function withJudgeWorkdir(run) {
  const workdir = createJudgeWorkdir();
  try {
    return await run(workdir);
  } finally {
    cleanupJudgeWorkdir(workdir);
  }
}

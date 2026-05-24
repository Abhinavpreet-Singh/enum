/**
 * @fileoverview Benchmark runner — executes user code in Docker sandbox
 * with timing instrumentation for empirical complexity analysis.
 *
 * DESIGN DECISIONS:
 * - Reuses the existing `enum-runner` Docker image (already configured with
 *   multi-language support, network isolation, memory/CPU limits).
 * - Generates a self-contained benchmark file that includes user code +
 *   timing harness + input generation.
 * - Parses structured output (__BENCHMARK_RESULT__<JSON>) from stdout.
 * - 30-second timeout per benchmark run (covers all input sizes).
 * - Temp files are cleaned up after execution.
 * - Process isolation via `child_process.exec` with timeout.
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  getWrapperGenerator,
  DEFAULT_INPUT_SIZES,
  EXPONENTIAL_SAFE_SIZES,
} from './input-generator.js';

// ============================================================
// Configuration
// ============================================================

const BENCHMARK_TIMEOUT_MS = 30_000; // 30 seconds for all input sizes
const DOCKER_MEMORY_LIMIT = '512m';
const DOCKER_CPU_LIMIT = '1.0';
const TEMP_DIR = path.resolve(process.cwd(), 'temp', 'benchmarks');
const DOCKER_IMAGE = 'enum-runner';

/** File extensions per language */
const FILE_EXTENSIONS = {
  javascript: '.js',
  node: '.js',
  python: '.py',
  java: '.java',
  cpp: '.cpp',
  c: '.c',
};

// ============================================================
// Core Runner
// ============================================================

/**
 * Ensure the temp directory exists.
 */
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

/**
 * Run a benchmark for the given code inside a Docker sandbox.
 *
 * @param {Object} params
 * @param {string} params.code - User source code
 * @param {string} params.language - Programming language
 * @param {string} params.functionName - Name of the function to benchmark
 * @param {number[]} [params.inputSizes] - Custom input sizes (optional)
 * @param {boolean} [params.useExponentialSafeSizes] - Use reduced sizes for potentially exponential algos
 * @returns {Promise<import('../types.js').BenchmarkDataPoint[]>}
 */
export async function runBenchmark({
  code,
  language,
  functionName,
  inputSizes = null,
  useExponentialSafeSizes = false,
}) {
  ensureTempDir();

  const sizes = inputSizes || (useExponentialSafeSizes ? EXPONENTIAL_SAFE_SIZES : DEFAULT_INPUT_SIZES);
  const wrapperGenerator = getWrapperGenerator(language);
  const wrappedCode = wrapperGenerator(code, functionName, sizes);

  // Generate unique filename to prevent collisions under concurrent load
  const fileId = randomUUID().slice(0, 8);
  const lang = language === 'node' ? 'javascript' : language;
  const ext = FILE_EXTENSIONS[lang] || '.js';

  // Java requires class name to match filename
  const filename = lang === 'java' ? 'Main.java' : `bench_${fileId}${ext}`;
  const filePath = path.join(TEMP_DIR, filename);

  // Map language names for the Docker runner
  const dockerLang = language === 'javascript' ? 'node' : language;

  try {
    fs.writeFileSync(filePath, wrappedCode, 'utf-8');

    const output = await executeInDocker(filePath, filename, dockerLang);
    return parseBenchmarkOutput(output, sizes);
  } finally {
    // Always clean up temp files
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      // Clean up Java .class files
      if (lang === 'java') {
        const classFile = path.join(TEMP_DIR, 'Main.class');
        if (fs.existsSync(classFile)) fs.unlinkSync(classFile);
      }
    } catch {
      // Non-critical cleanup error
    }
  }
}

/**
 * Execute a file inside the Docker sandbox.
 *
 * @param {string} filePath - Absolute path to the file
 * @param {string} filename - Filename for Docker
 * @param {string} language - Language identifier for the runner
 * @returns {Promise<string>} stdout output
 */
function executeInDocker(filePath, filename, language) {
  return new Promise((resolve, reject) => {
    const hostDir = path.dirname(filePath);

    // Docker command mirrors the existing enum-compiler setup
    // but with higher resource limits for benchmarking
    const command = [
      'docker run --rm',
      '--network none',           // No network access (security)
      `--memory="${DOCKER_MEMORY_LIMIT}"`,
      `--cpus="${DOCKER_CPU_LIMIT}"`,
      `--ulimit nproc=64:64`,     // Limit processes (fork bomb protection)
      `--ulimit fsize=10485760`,  // 10MB max file size
      `-v "${hostDir}:/app"`,     // Mount temp directory
      DOCKER_IMAGE,
      language,
      filename,
    ].join(' ');

    exec(command, {
      timeout: BENCHMARK_TIMEOUT_MS,
      maxBuffer: 1024 * 1024, // 1MB output buffer
      cwd: hostDir,
    }, (error, stdout, stderr) => {
      if (error) {
        // Check if it was a timeout
        if (error.killed || error.signal === 'SIGTERM') {
          resolve('__BENCHMARK_TIMEOUT__');
          return;
        }

        // Other execution errors — still try to parse partial output
        if (stdout && stdout.includes('__BENCHMARK_RESULT__')) {
          resolve(stdout);
          return;
        }

        reject(new Error(
          `Docker execution failed: ${error.message}${stderr ? '\nStderr: ' + stderr : ''}`
        ));
        return;
      }

      resolve(stdout || '');
    });
  });
}

/**
 * Parse the structured benchmark output from Docker execution.
 *
 * @param {string} output - Raw stdout from Docker
 * @param {number[]} inputSizes - Expected input sizes (for timeout fallback)
 * @returns {import('../types.js').BenchmarkDataPoint[]}
 */
function parseBenchmarkOutput(output, inputSizes) {
  // Handle complete timeout
  if (output === '__BENCHMARK_TIMEOUT__') {
    return inputSizes.map((size) => ({
      inputSize: size,
      executionTimeMs: -1,
      memoryUsageBytes: 0,
      timedOut: true,
    }));
  }

  // Extract the JSON result from stdout
  const marker = '__BENCHMARK_RESULT__';
  const markerIdx = output.indexOf(marker);

  if (markerIdx === -1) {
    console.warn('[Benchmark] No result marker found in output');
    return inputSizes.map((size) => ({
      inputSize: size,
      executionTimeMs: -1,
      memoryUsageBytes: 0,
      timedOut: true,
      error: 'No benchmark output produced',
    }));
  }

  const jsonStr = output.slice(markerIdx + marker.length).trim();

  try {
    const results = JSON.parse(jsonStr);

    return results.map((dp) => ({
      inputSize: dp.inputSize,
      executionTimeMs: dp.executionTimeMs >= 0 ? dp.executionTimeMs : -1,
      memoryUsageBytes: dp.memoryUsageBytes || 0,
      timedOut: dp.executionTimeMs < 0,
      error: dp.error || null,
    }));
  } catch (parseErr) {
    console.warn('[Benchmark] Failed to parse output JSON:', parseErr.message);
    return inputSizes.map((size) => ({
      inputSize: size,
      executionTimeMs: -1,
      memoryUsageBytes: 0,
      timedOut: true,
      error: 'Output parse error',
    }));
  }
}

/**
 * Check if Docker is available and the enum-runner image exists.
 *
 * @returns {Promise<boolean>}
 */
export async function isDockerAvailable() {
  return new Promise((resolve) => {
    exec(`docker image inspect ${DOCKER_IMAGE}`, { timeout: 5000 }, (error) => {
      resolve(!error);
    });
  });
}

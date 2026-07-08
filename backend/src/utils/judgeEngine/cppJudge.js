import { exec } from "child_process";
import { promisify } from "util";
import { generateCppWrapper } from "./cppWrapper.js";
import {
  getCompiledBinaryPath,
  runCommandWithInput,
  withJudgeWorkdir,
  writeJudgeFile,
} from "./judgeSandbox.js";

const execAsync = promisify(exec);

export async function runCppJudge({
  userCode,
  functionName,
  parameterTypes,
  returnType,
  testcases,
}) {
  return withJudgeWorkdir(async (workdir) => {
    const sourcePath = writeJudgeFile(
      workdir,
      "main.cpp",
      generateCppWrapper({
        userFunctionCode: userCode,
        functionName,
        parameterTypes,
        returnType,
      }),
    );
    const binaryPath = getCompiledBinaryPath(workdir);

    try {
      await execAsync(`g++ "${sourcePath}" -o "${binaryPath}"`);
    } catch (compileError) {
      const message =
        compileError?.stderr ||
        compileError?.message ||
        "C++ Compilation Error";
      return testcases.map((tc) => ({
        input: tc.input,
        expected: tc.expectedOutput,
        output: "",
        passed: false,
        error: `Compilation Error: ${message}`,
      }));
    }

    const results = [];

    for (const tc of testcases) {
      try {
        const inputString = `${tc.input.join("\n")}\n`;
        const { stdout, stderr, exitCode } = await runCommandWithInput(
          binaryPath,
          [],
          inputString,
        );

        if (exitCode !== 0) {
          results.push({
            input: tc.input,
            expected: tc.expectedOutput,
            output: "",
            passed: false,
            error: stderr || `Runtime Error (exit code ${exitCode})`,
          });
        } else {
          const output = stdout.trim();
          results.push({
            input: tc.input,
            expected: tc.expectedOutput,
            output,
            passed: output === tc.expectedOutput,
          });
        }
      } catch (error) {
        results.push({
          input: tc.input,
          expected: tc.expectedOutput,
          output: "",
          passed: false,
          error: String(error),
        });
      }
    }

    return results;
  });
}

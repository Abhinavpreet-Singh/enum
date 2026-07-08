import { generatePythonWrapper } from "./pythonWrapper.js";
import {
  runCommandWithInput,
  withJudgeWorkdir,
  writeJudgeFile,
} from "./judgeSandbox.js";

const PYTHON_CMD = process.platform === "win32" ? "python" : "python3";

export async function runPythonJudge({
  userCode,
  functionName,
  parameterTypes,
  returnType,
  testcases,
}) {
  return withJudgeWorkdir(async (workdir) => {
    const fullCode = generatePythonWrapper({
      userFunctionCode: userCode,
      functionName,
      parameterTypes,
      returnType,
    });

    const scriptPath = writeJudgeFile(workdir, "main.py", fullCode);
    const results = [];

    for (const tc of testcases) {
      try {
        const inputString = `${tc.input.join("\n")}\n`;
        const { stdout, stderr, exitCode } = await runCommandWithInput(
          PYTHON_CMD,
          [scriptPath],
          inputString,
        );

        if (exitCode !== 0) {
          results.push({
            input: tc.input,
            expected: tc.expectedOutput,
            output: "",
            passed: false,
            error: stderr || `Process exited with code ${exitCode}`,
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

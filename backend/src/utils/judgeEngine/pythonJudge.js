import fs from "fs";
import { spawn } from "child_process";
import { generatePythonWrapper } from "./pythonWrapper.js";

const PYTHON_CMD = process.platform === "win32" ? "python" : "python3";

export const runPythonJudge = ({
  userCode,
  functionName,
  parameterTypes,
  returnType,
  testcases
}) => {
  return new Promise(async (resolve) => {
    if (!fs.existsSync("./temp")) {
      fs.mkdirSync("./temp");
    }

    const fullCode = generatePythonWrapper({
      userFunctionCode: userCode,
      functionName,
      parameterTypes,
      returnType
    });

    fs.writeFileSync("./temp/main.py", fullCode);

    let results = [];

    for (const tc of testcases) {
      try {
        const inputString = tc.input.join("\n") + "\n";

        const { stdout, stderr, exitCode } = await new Promise((res) => {
          const run = spawn(PYTHON_CMD, ["temp/main.py"]);

          let stdout = "";
          let stderr = "";

          run.stdout.on("data", (data) => {
            stdout += data.toString();
          });

          run.stderr.on("data", (data) => {
            stderr += data.toString();
          });

          run.on("error", (err) => {
            res({ stdout: "", stderr: err.message, exitCode: 1 });
          });

          run.on("close", (code) => {
            res({ stdout, stderr, exitCode: code });
          });

          run.stdin.write(inputString);
          run.stdin.end();
        });

        if (exitCode !== 0) {
          results.push({
            input: tc.input,
            expected: tc.expectedOutput,
            output: "",
            passed: false,
            error: stderr || `Process exited with code ${exitCode}`
          });
        } else {
          const output = stdout.trim();
          results.push({
            input: tc.input,
            expected: tc.expectedOutput,
            output,
            passed: output === tc.expectedOutput
          });
        }
      } catch (error) {
        results.push({
          input: tc.input,
          expected: tc.expectedOutput,
          output: "",
          passed: false,
          error: String(error)
        });
      }
    }

    resolve(results);
  });
};

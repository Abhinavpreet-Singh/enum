import fs from "fs";
import { exec, spawn } from "child_process";
import { generateCppWrapper } from "./cppWrapper.js";

export const runCppJudge = ({
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

    const fullCode = generateCppWrapper({
      userFunctionCode: userCode,
      functionName,
      parameterTypes,
      returnType
    });

    fs.writeFileSync("./temp/main.cpp", fullCode);

    try {
      await new Promise((res, rej) => {
        exec("g++ temp/main.cpp -o temp/main.exe", (err, _stdout, stderr) => {
          if (err) return rej(stderr || "C++ Compilation Error");
          res();
        });
      });
    } catch (compileError) {
      return resolve(
        testcases.map(tc => ({
          input: tc.input,
          expected: tc.expectedOutput,
          output: "",
          passed: false,
          error: `Compilation Error: ${compileError}`
        }))
      );
    }

    let results = [];

    for (const tc of testcases) {
      try {
        const inputString = tc.input.join("\n") + "\n";

        const { stdout, stderr, exitCode } = await new Promise((res) => {
          const run = spawn("temp/main.exe");

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
            error: stderr || `Runtime Error (exit code ${exitCode})`
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

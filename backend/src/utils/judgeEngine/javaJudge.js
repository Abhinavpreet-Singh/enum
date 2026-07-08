import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { generateJavaWrapper } from "./javaWrapper.js";
import {
  runCommandWithInput,
  withJudgeWorkdir,
  writeJudgeFile,
} from "./judgeSandbox.js";

const execAsync = promisify(exec);

function resolveJavaBinaries() {
  const javaHome = process.env.JAVA_HOME;
  if (javaHome) {
    return {
      javac: path.join(javaHome, "bin", "javac"),
      java: path.join(javaHome, "bin", "java"),
    };
  }

  const candidates = [
    "/usr/lib/jvm/java-17-openjdk-amd64/bin",
    "/usr/lib/jvm/java-21-openjdk-amd64/bin",
    "/usr/lib/jvm/java-11-openjdk-amd64/bin",
    "/usr/local/bin",
    "/usr/bin",
  ];

  for (const dir of candidates) {
    const javacPath = path.join(dir, "javac");
    if (fs.existsSync(javacPath)) {
      return { javac: javacPath, java: path.join(dir, "java") };
    }
  }

  return { javac: "javac", java: "java" };
}

export async function runJavaJudge({
  userCode,
  functionName,
  parameterTypes,
  returnType,
  testcases,
}) {
  return withJudgeWorkdir(async (workdir) => {
    const fullCode = generateJavaWrapper({
      userFunctionCode: userCode,
      functionName,
      parameterTypes,
      returnType,
    });

    const sourcePath = writeJudgeFile(workdir, "Main.java", fullCode);
    const { javac: javacCmd, java: javaCmd } = resolveJavaBinaries();

    try {
      await execAsync(`"${javacCmd}" "${sourcePath}"`, { cwd: workdir });
    } catch (compileError) {
      const message =
        compileError?.stderr ||
        compileError?.message ||
        "Java Compilation Error";
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
          javaCmd,
          ["-cp", workdir, "Main"],
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

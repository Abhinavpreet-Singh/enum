import fs from "fs";
import path from "path";
import { exec, spawn } from "child_process";
import { generateJavaWrapper } from "./javaWrapper.js";

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

export const runJavaJudge = ({
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

    const fullCode = generateJavaWrapper({
      userFunctionCode: userCode,
      functionName,
      parameterTypes,
      returnType
    });

    fs.writeFileSync("./temp/Main.java", fullCode);

    const { javac: javacCmd, java: javaCmd } = resolveJavaBinaries();

    try {
      await new Promise((res, rej) => {
        exec(`"${javacCmd}" temp/Main.java`, (err, _stdout, stderr) => {
          if (err) {
            const msg = stderr || err.message || "Java Compilation Error";
            if (msg.includes("not found") || msg.includes("No such file")) {
              return rej(
                "Java (JDK) is not installed on this server. " +
                "Run: sudo apt-get install -y openjdk-17-jdk"
              );
            }
            return rej(msg);
          }
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
          const run = spawn(javaCmd, ["-cp", "temp", "Main"]);

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

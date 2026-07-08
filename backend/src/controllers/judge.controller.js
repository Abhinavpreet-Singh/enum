import prisma from "../db/index.js";
import { questionInclude, serializeQuestion } from "../utils/prismaNormalizers.js";
import { runJavaJudge } from "../utils/judgeEngine/javaJudge.js";
import { runCppJudge } from "../utils/judgeEngine/cppJudge.js";
import { runCJudge } from "../utils/judgeEngine/cJudge.js";
import { runPythonJudge } from "../utils/judgeEngine/pythonJudge.js";
import { normaliseJudgeTestCaseInput } from "../utils/judgeEngine/testCaseInput.js";

/**
 * Normalise a raw test-case object into the shape the judge engines expect:
 *   { input: string[], expectedOutput: string }
 */
function normaliseTestCase(tc, parameterTypes = []) {
  const expectedOutput = String(tc.expectedOutput ?? tc.output ?? "").trim();
  const input = normaliseJudgeTestCaseInput(tc.input, parameterTypes);

  return { input, expectedOutput };
}

export const judgeCode = async (req, res) => {
  // Accept `code` (desktop exam) as a fallback for `userCode` (DSA flow)
  const {
    questionId,
    language,
    userCode,
    code,
    mode,
    testCases,
    // Function-signature metadata sent by the exam client for bank coding questions
    functionName: inlineFunctionName,
    parameterTypes: inlineParamTypes,
    returnType: inlineReturnType,
  } = req.body;
  const sourceCode = userCode ?? code;

  if (!sourceCode) {
    return res.status(400).json({ message: "No code provided." });
  }

  let testcases = [];
  let functionName;
  let parameterTypes;
  let returnType;

  if (questionId) {
    // ── Legacy DSA flow: load question + test cases from DB ──────────────────
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: questionInclude,
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found." });
    }

    testcases = (question.testcases || []).map((tc) =>
      normaliseTestCase(tc, question.parameterTypes || []),
    );
    functionName = question.functionName;
    parameterTypes = question.parameterTypes;
    returnType = question.returnType;
  } else if (Array.isArray(testCases) && testCases.length > 0) {
    // ── Exam coding-question flow: test cases (+ optional function metadata) ─
    const paramTypes =
      Array.isArray(inlineParamTypes) && inlineParamTypes.length ? inlineParamTypes : [];
    testcases = testCases.map((tc) => normaliseTestCase(tc, paramTypes));
    // Use the function signature the exam client sent (from the bank question record)
    functionName = inlineFunctionName || undefined;
    parameterTypes = Array.isArray(inlineParamTypes) && inlineParamTypes.length
      ? inlineParamTypes
      : undefined;
    returnType = inlineReturnType || undefined;
  } else {
    // No question ID and no test cases — run without assertions (output-only)
    testcases = [];
  }

  if (mode === "run") {
    testcases = testcases.slice(0, 3);
  }

  try {
    const judgeArgs = {
      userCode: sourceCode,
      functionName,
      parameterTypes,
      returnType,
      testcases,
    };

    let results;
    if (language === "java") {
      results = await runJavaJudge(judgeArgs);
    } else if (language === "cpp") {
      results = await runCppJudge(judgeArgs);
    } else if (language === "c") {
      results = await runCJudge(judgeArgs);
    } else if (language === "python") {
      results = await runPythonJudge(judgeArgs);
    } else if (language === "javascript" || language === "typescript") {
      // Fall through for now — unsupported but don't throw
      return res.status(400).json({ message: `Language '${language}' is not supported by the judge engine.` });
    } else {
      return res.status(400).json({ message: `Unsupported language: ${language}` });
    }

    const passed = results.filter((r) => r.passed).length;
    const hasErrors = results.some((r) => r.error);

    return res.json({
      results,
      allPassed: results.length > 0 && results.every((r) => r.passed),
      passedCount: passed,
      totalCount: results.length,
      ...(hasErrors && { hasErrors: true }),
    });
  } catch (err) {
    return res.status(500).json({ message: String(err) });
  }
};

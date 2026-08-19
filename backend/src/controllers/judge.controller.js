import prisma from "../db/index.js";
import {
  bankQuestionInclude,
  questionInclude,
} from "../utils/prismaNormalizers.js";
import { runJavaJudge } from "../utils/judgeEngine/javaJudge.js";
import { runCppJudge } from "../utils/judgeEngine/cppJudge.js";
import { runCJudge } from "../utils/judgeEngine/cJudge.js";
import { runPythonJudge } from "../utils/judgeEngine/pythonJudge.js";
import { normaliseJudgeTestCaseInput } from "../utils/judgeEngine/testCaseInput.js";

/**
 * Normalise a raw test-case object into the shape the judge engines expect:
 *   { input: string[], expectedOutput: string, isHidden: boolean }
 */
function normaliseTestCase(tc, parameterTypes = []) {
  const expectedOutput = String(tc.expectedOutput ?? tc.output ?? "").trim();
  const input = normaliseJudgeTestCaseInput(tc.input, parameterTypes);

  return { input, expectedOutput, isHidden: Boolean(tc.isHidden) };
}

function mapPublicResult(result, index, meta) {
  return {
    input: result.input,
    expected: result.expected,
    expectedOutput: result.expected,
    output: result.output,
    actualOutput: result.output,
    passed: result.passed,
    error: result.error,
    isHidden: Boolean(meta[index]?.isHidden),
    caseNumber: index + 1,
  };
}

/**
 * LeetCode-style response:
 * - Run: full details for sample (and custom) cases only
 * - Submit success: counts only — never leak hidden I/O
 * - Submit failure: reveal only the first failing case
 */
function publicizeJudgeResponse(results, meta, mode) {
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const allPassed = totalCount > 0 && passedCount === totalCount;
  const hasErrors = results.some((r) => r.error);
  const verdict = !results.length
    ? "error"
    : allPassed
      ? "accepted"
      : hasErrors
        ? "error"
        : "wrong_answer";

  const payload = {
    allPassed,
    passedCount,
    totalCount,
    verdict,
    ...(hasErrors && { hasErrors: true }),
  };

  if (mode !== "submit") {
    return {
      ...payload,
      results: results.map((r, i) => mapPublicResult(r, i, meta)),
    };
  }

  if (allPassed) {
    return { ...payload, results: [] };
  }

  const failIdx = results.findIndex((r) => !r.passed);
  const failed = mapPublicResult(results[failIdx], failIdx, meta);
  return {
    ...payload,
    results: [failed],
    failedTestCase: failed,
  };
}

export const judgeCode = async (req, res) => {
  // Accept `code` (desktop exam) as a fallback for `userCode` (DSA flow)
  const {
    questionId,
    bankQuestionId,
    language,
    userCode,
    code,
    mode,
    testCases,
    customTestCases,
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
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: questionInclude,
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found." });
    }

    const rawTestCases = question.testCases || [];
    testcases = rawTestCases.map((tc) =>
      normaliseTestCase(tc, question.parameterTypes || []),
    );
    functionName = question.functionName;
    parameterTypes = question.parameterTypes;
    returnType = question.returnType;
  } else if (bankQuestionId) {
    const question = await prisma.bankQuestion.findUnique({
      where: { id: bankQuestionId },
      include: bankQuestionInclude,
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found." });
    }

    testcases = (question.testCases || []).map((tc) =>
      normaliseTestCase(tc, question.parameterTypes || []),
    );
    functionName = question.functionName || inlineFunctionName || undefined;
    parameterTypes =
      Array.isArray(question.parameterTypes) && question.parameterTypes.length
        ? question.parameterTypes
        : Array.isArray(inlineParamTypes) && inlineParamTypes.length
          ? inlineParamTypes
          : undefined;
    returnType = question.returnType || inlineReturnType || undefined;
  } else if (Array.isArray(testCases) && testCases.length > 0) {
    const paramTypes =
      Array.isArray(inlineParamTypes) && inlineParamTypes.length
        ? inlineParamTypes
        : [];
    testcases = testCases.map((tc) => normaliseTestCase(tc, paramTypes));
    functionName = inlineFunctionName || undefined;
    parameterTypes =
      Array.isArray(inlineParamTypes) && inlineParamTypes.length
        ? inlineParamTypes
        : undefined;
    returnType = inlineReturnType || undefined;
  } else {
    testcases = [];
  }

  if (mode !== "submit") {
    testcases = testcases.filter((tc) => !tc.isHidden);

    if (Array.isArray(customTestCases) && customTestCases.length > 0) {
      const paramTypes = parameterTypes || [];
      testcases = [
        ...testcases,
        ...customTestCases.map((tc) =>
          normaliseTestCase({ ...tc, isHidden: false }, paramTypes),
        ),
      ];
    }
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
      return res.status(400).json({
        message: `Language '${language}' is not supported by the judge engine.`,
      });
    } else {
      return res.status(400).json({ message: `Unsupported language: ${language}` });
    }

    return res.json(publicizeJudgeResponse(results, testcases, mode));
  } catch (err) {
    return res.status(500).json({ message: String(err) });
  }
};

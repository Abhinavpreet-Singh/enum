import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { linuxQuestionModel } from "../models/LinuxQuestion.js";

const COMPILER_URL = "http://enumcompiler.duckdns.org/run";
const COMPILER_TIMEOUT_MS = 30_000;

function normalizeOutput(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

async function runBashCode(code) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), COMPILER_TIMEOUT_MS);

  try {
    const response = await fetch(COMPILER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "bash", code }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(
        502,
        `Compiler service error (${response.status}): ${errorText}`,
      );
    }

    const data = await response.json();
    return String(data.output ?? "");
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) throw error;
    if (error?.name === "AbortError") {
      throw new ApiError(504, "Execution timed out — compiler did not respond in time");
    }

    throw new ApiError(502, "Compiler service unavailable");
  }
}

export const getLinuxQuestions = asyncHandler(async (_req, res) => {
  const questions = await linuxQuestionModel.findMany({
    orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
  });

  return res.status(200).json({
    message: "Linux questions fetched successfully",
    data: questions,
  });
});

export const getLinuxQuestionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) throw new ApiError(400, "Question ID is required");

  const question = await linuxQuestionModel.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
  });

  if (!question) throw new ApiError(404, "Linux question not found");

  return res.status(200).json({
    message: "Linux question fetched successfully",
    data: question,
  });
});

export const submitLinuxQuestion = asyncHandler(async (req, res) => {
  const { questionId, code, language } = req.body;

  if (!questionId) throw new ApiError(400, "Question ID is required");
  if (!code || !String(code).trim()) throw new ApiError(400, "Code is required");

  const question = await linuxQuestionModel.findFirst({
    where: {
      OR: [{ id: questionId }, { slug: questionId }],
    },
  });

  if (!question) throw new ApiError(404, "Linux question not found");

  const compilerLanguage = language === "bash" || language === "shell" ? "bash" : "bash";
  const output = await runBashCode(String(code));

  const expectedOutput = normalizeOutput(question.expectedOutput);
  const actualOutput = normalizeOutput(output);
  const passed = actualOutput === expectedOutput;

  return res.status(200).json({
    success: true,
    message: passed ? "Submission passed" : "Submission failed",
    data: {
      questionId: question.id,
      slug: question.slug,
      language: compilerLanguage,
      passed,
      verdict: passed ? "passed" : "failed",
      output,
      expectedOutput: question.expectedOutput,
      normalizedOutput: actualOutput,
    },
  });
});
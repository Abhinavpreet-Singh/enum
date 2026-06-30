import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { linuxQuestionModel } from "../models/LinuxQuestion.js";
import { executeCompilerCode } from "../services/compilerService.js";
import {
  getTrackProductMap,
  getUserAccessSummary,
  hasTrackAccessFromSummary,
} from "../services/entitlement.service.js";

function normalizeOutput(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

async function runBashCode(code) {
  const { output } = await executeCompilerCode({ language: "bash", code });
  return String(output ?? "");
}

export const getLinuxQuestions = asyncHandler(async (req, res) => {
  const questions = await linuxQuestionModel.findMany({
    orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
  });

  const userId = req.user?.id;
  const [productsByTrack, accessSummary] = await Promise.all([
    getTrackProductMap(),
    getUserAccessSummary(userId),
  ]);

  const product = productsByTrack["linux"];
  const freeItemQuota = product?.freeItemQuota ?? 2;
  const hasAccess = !product || hasTrackAccessFromSummary(accessSummary, "linux");

  return res.status(200).json({
    message: "Linux questions fetched successfully",
    data: questions.map((question, index) => {
      const freeIndex = index + 1;
      const isFree = freeIndex <= freeItemQuota;
      const locked = !hasAccess && !isFree;

      return {
        ...question,
        access: {
          locked,
          isFree,
          freeItemQuota,
          freeIndex,
          trackKey: "linux",
          productSlug: product?.slug || "track-linux",
          reason: locked ? "Upgrade to unlock this Linux lab." : "",
        },
      };
    }),
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

  const allQuestions = await linuxQuestionModel.findMany({
    orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
  });
  const index = allQuestions.findIndex((q) => q.id === question.id);
  const freeIndex = index !== -1 ? index + 1 : 1;

  const userId = req.user?.id;
  const [productsByTrack, accessSummary] = await Promise.all([
    getTrackProductMap(),
    getUserAccessSummary(userId),
  ]);

  const product = productsByTrack["linux"];
  const freeItemQuota = product?.freeItemQuota ?? 2;
  const hasAccess = !product || hasTrackAccessFromSummary(accessSummary, "linux");
  const isFree = freeIndex <= freeItemQuota;
  const locked = !hasAccess && !isFree;

  if (locked) {
    throw new ApiError(403, "Upgrade to unlock this Linux lab.");
  }

  return res.status(200).json({
    message: "Linux question fetched successfully",
    data: {
      ...question,
      access: {
        locked,
        isFree,
        freeItemQuota,
        freeIndex,
        trackKey: "linux",
        productSlug: product?.slug || "track-linux",
        reason: "",
      },
    },
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

  const allQuestions = await linuxQuestionModel.findMany({
    orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
  });
  const index = allQuestions.findIndex((q) => q.id === question.id);
  const freeIndex = index !== -1 ? index + 1 : 1;

  const userId = req.user?.id;
  const [productsByTrack, accessSummary] = await Promise.all([
    getTrackProductMap(),
    getUserAccessSummary(userId),
  ]);

  const product = productsByTrack["linux"];
  const freeItemQuota = product?.freeItemQuota ?? 2;
  const hasAccess = !product || hasTrackAccessFromSummary(accessSummary, "linux");
  const isFree = freeIndex <= freeItemQuota;
  const locked = !hasAccess && !isFree;

  if (locked) {
    throw new ApiError(403, "Upgrade to unlock this Linux lab.");
  }

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
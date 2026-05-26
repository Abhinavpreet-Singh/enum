import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";
import {
  tryAwardXp,
  AWARD_TYPES,
  buildAwardKey,
  isDsaFullSuccess,
  dsaXpAmount,
} from "../services/xpService.js";
import {
  logUserActivity,
  outcomeFromDsaVerdict,
} from "../services/activityLogService.js";

const saveSubmission = asyncHandler(async (req, res) => {
  const {
    questionId,
    code,
    language,
    verdict,
    passedCount,
    totalCount,
    runtime,
  } = req.body;

  if (!questionId) throw new ApiError(400, "Question ID is required");
  if (!code || code.trim() === "") throw new ApiError(400, "Code is required");
  if (!language) throw new ApiError(400, "Language is required");

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question) throw new ApiError(404, "Question not found");

  const normaliseVerdict = (v) => {
    if (v === "accepted") return "accepted";
    if (v === "wrong_answer") return "wrong_answer";
    if (v === "error" || v === "runtime_error") return "runtime_error";
    if (v === "partial") return "partial";
    return "wrong_answer";
  };

  const normalisedVerdict = normaliseVerdict(verdict);
  const fullSuccess = isDsaFullSuccess(normalisedVerdict);
  const outcome = outcomeFromDsaVerdict(normalisedVerdict);
  const { submission, xpEarned, alreadySolved, totalXp } =
    await prisma.$transaction(async (tx) => {
      const created = await tx.submission.create({
        data: {
          questionId,
          userId: req.user.id,
          code,
          language,
          verdict: normalisedVerdict,
          passedCount: passedCount ?? 0,
          totalCount: totalCount ?? 0,
          runtime: runtime ?? null,
        },
      });

      const xpResult = await tryAwardXp(tx, {
        userId: req.user.id,
        awardKey: buildAwardKey(AWARD_TYPES.dsa, questionId),
        amount: dsaXpAmount(question.level),
        fullSuccess,
      });

      await logUserActivity(tx, {
        userId: req.user.id,
        activityType: "dsa",
        resourceId: questionId,
        resourceTitle: question.title ?? "DSA Question",
        outcome,
        xpEarned: xpResult.xpEarned,
        score: passedCount ?? 0,
        maxScore: totalCount ?? 0,
        detail: `${normalisedVerdict} (${passedCount ?? 0}/${totalCount ?? 0} tests)`,
      });

      return {
        submission: created,
        xpEarned: xpResult.xpEarned,
        alreadySolved: xpResult.alreadyClaimed,
        totalXp: xpResult.totalXp,
      };
    });

  return res.status(201).json({
    message: "Submission saved successfully",
    data: {
      submission,
      xpEarned,
      alreadySolved,
      totalXp,
    },
  });
});

const getMySubmissions = asyncHandler(async (req, res) => {
  const { questionId } = req.params;
  if (!questionId) throw new ApiError(400, "Question ID is required");

  const submissions = await prisma.submission.findMany({
    where: {
      userId: req.user.id,
      questionId,
    },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json({
    message: "Submissions fetched successfully",
    data: submissions,
  });
});

const getRecentSubmissions = asyncHandler(async (req, res) => {
  const submissions = await prisma.submission.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      question: {
        select: { title: true, level: true },
      },
    },
  });

  return res.status(200).json({
    message: "Recent submissions fetched",
    data: submissions,
  });
});

export { saveSubmission, getMySubmissions, getRecentSubmissions };

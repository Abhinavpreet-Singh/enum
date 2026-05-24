import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";

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

  // Award XP on first accepted submission for this question
  if (normalisedVerdict === "accepted") {
    const alreadySolved = await prisma.submission.findFirst({
      where: { userId: req.user.id, questionId, verdict: "accepted" },
      select: { id: true },
    });
    if (!alreadySolved) {
      const level = question.level ?? "Easy";
      const xpToAward = level === "Hard" ? 50 : level === "Medium" ? 25 : 10;
      await prisma.user.update({
        where: { id: req.user.id },
        data: { xp: { increment: xpToAward } },
      });
    }
  }

  const submission = await prisma.submission.create({
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

  return res.status(201).json({
    message: "Submission saved successfully",
    data: submission,
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
  // Fetch DSA submissions
  const dsaSubmissions = await prisma.submission.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      question: { select: { title: true, level: true } },
    },
  });

  // Fetch System Design submissions
  const systemDesignSubmissions = await prisma.systemDesignSubmission.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      simulation: { select: { id: true, title: true, difficulty: true } },
    },
  });

  // Combine and sort all submissions by date
  const allSubmissions = [
    ...dsaSubmissions.map((s) => ({
      _id: s._id,
      question: s.question
        ? {
            _id: s.questionId,
            title: s.question.title,
            level: s.question.level,
          }
        : null,
      verdict: s.verdict,
      language: s.language,
      createdAt: s.createdAt,
      type: "dsa",
    })),
    ...systemDesignSubmissions.map((s) => ({
      _id: s.id,
      question: s.simulation
        ? {
            _id: s.simulationId,
            title: s.simulation.title,
            level: s.simulation.difficulty,
          }
        : null,
      verdict:
        s.score >= 80 ? "accepted" : s.score >= 50 ? "partial" : "failed",
      language: "System Design",
      createdAt: s.createdAt,
      type: "system-design",
      score: s.score,
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Deduplicate - keep most recent submission per question/simulation
  const seen = new Set();
  const recent = [];
  for (const s of allSubmissions) {
    const qid = s.question?._id;
    if (qid && !seen.has(qid)) {
      seen.add(qid);
      recent.push(s);
    }
    if (recent.length === 10) break;
  }

  return res.status(200).json({
    message: "Recent submissions fetched",
    data: recent,
  });
});

export { saveSubmission, getMySubmissions, getRecentSubmissions };

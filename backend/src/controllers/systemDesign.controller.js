import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";
import {
  evaluateSystemDesign,
  PRESET_RULES,
} from "../evaluators/systemDesignEvaluator.js";

// XP awarded at 100% score per difficulty tier
const XP_BY_DIFFICULTY = { easy: 50, medium: 100, hard: 150 };

// ── Submit a system design ──────────────────────────────────────────────────

export const submitSystemDesign = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Authentication required");

  const { simulationId, nodes, edges, explanation, replayEvents } = req.body;

  if (!simulationId) throw new ApiError(400, "simulationId is required");
  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new ApiError(400, "At least one node is required");
  }

  // Fetch the simulation to get evaluation rules + difficulty for XP calc
  const simulation = await prisma.systemDesignSimulation.findUnique({
    where: { id: simulationId },
  });

  let evaluation;
  if (simulation && simulation.evaluationRules?.length > 0) {
    evaluation = evaluateSystemDesign(
      { nodes, edges },
      simulation.evaluationRules,
      simulation.maxScore,
    );
  } else {
    const preset = PRESET_RULES.url_shortener;
    evaluation = evaluateSystemDesign(
      { nodes, edges },
      preset.rules,
      preset.maxScore,
    );
  }

  // Calculate XP: scales with score percentage × difficulty multiplier
  const difficulty = simulation?.difficulty?.toLowerCase() || "medium";
  const baseXP = XP_BY_DIFFICULTY[difficulty] ?? 100;
  const xpEarned =
    evaluation.maxScore > 0
      ? Math.round((evaluation.score / evaluation.maxScore) * baseXP)
      : 0;

  // Calculate streak update
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastActivityDate: true, currentStreak: true },
  });

  const now = new Date();
  const lastActivity = user?.lastActivityDate;
  let streakUpdate = {};

  if (!lastActivity) {
    // First ever activity
    streakUpdate = { currentStreak: 1, lastActivityDate: now };
  } else {
    const daysSinceLastActivity = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceLastActivity === 0) {
      // Same day - no streak change, just update timestamp
      streakUpdate = { lastActivityDate: now };
    } else if (daysSinceLastActivity === 1) {
      // Consecutive day - increment streak
      streakUpdate = {
        currentStreak: (user?.currentStreak ?? 0) + 1,
        lastActivityDate: now,
      };
    } else {
      // Streak broken - reset to 1
      streakUpdate = { currentStreak: 1, lastActivityDate: now };
    }
  }

  // Persist submission, award XP, and update streak atomically
  const [submission] = await prisma.$transaction([
    prisma.systemDesignSubmission.create({
      data: {
        simulationId,
        userId,
        nodes,
        edges,
        explanation: explanation || "",
        replayEvents: replayEvents || null,
        score: evaluation.score,
        maxScore: evaluation.maxScore,
        feedback: evaluation.feedback,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: xpEarned },
        ...streakUpdate,
      },
    }),
  ]);

  // Return updated user stats
  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, currentStreak: true },
  });

  return res.status(201).json({
    success: true,
    message: "System design submitted and evaluated",
    data: {
      submissionId: submission.id,
      evaluation,
      xpEarned,
      totalXp: updatedUser?.xp ?? 0,
      currentStreak: updatedUser?.currentStreak ?? 0,
    },
  });
});

// ── Get submissions for a simulation ────────────────────────────────────────

export const getSubmissions = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Authentication required");

  const { simulationId } = req.params;
  if (!simulationId) throw new ApiError(400, "simulationId is required");

  const submissions = await prisma.systemDesignSubmission.findMany({
    where: { simulationId, userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return res.status(200).json({
    success: true,
    data: submissions,
  });
});

// ── Get all submissions for the current user (across simulations) ────────────

export const getMySubmissions = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Authentication required");

  const submissions = await prisma.systemDesignSubmission.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      simulationId: true,
      score: true,
      maxScore: true,
      explanation: true,
      createdAt: true,
      simulation: {
        select: { title: true, difficulty: true },
      },
    },
  });

  return res.status(200).json({
    success: true,
    data: submissions,
  });
});

// ── Get a single submission (for replay) ────────────────────────────────────

export const getSubmissionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new ApiError(400, "Submission ID is required");

  const submission = await prisma.systemDesignSubmission.findUnique({
    where: { id },
  });

  if (!submission) throw new ApiError(404, "Submission not found");

  return res.status(200).json({
    success: true,
    data: submission,
  });
});

// ── List all system design simulations ──────────────────────────────────────

export const getSystemDesignSimulations = asyncHandler(async (req, res) => {
  const simulations = await prisma.systemDesignSimulation.findMany({
    orderBy: { createdAt: "desc" },
  });

  const userId = req.user?.id;
  let userProgress = {};

  // Fetch user's submissions if authenticated
  if (userId) {
    const submissions = await prisma.systemDesignSubmission.findMany({
      where: { userId },
      select: {
        simulationId: true,
        score: true,
        maxScore: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Track best score per simulation
    submissions.forEach((sub) => {
      if (!userProgress[sub.simulationId]) {
        const scorePercent =
          sub.maxScore > 0 ? (sub.score / sub.maxScore) * 100 : 0;
        userProgress[sub.simulationId] = {
          attempted: true,
          solved: scorePercent >= 80,
          bestScore: sub.score,
          bestScorePercent: scorePercent,
        };
      } else {
        const scorePercent =
          sub.maxScore > 0 ? (sub.score / sub.maxScore) * 100 : 0;
        if (scorePercent > userProgress[sub.simulationId].bestScorePercent) {
          userProgress[sub.simulationId] = {
            attempted: true,
            solved: scorePercent >= 80,
            bestScore: sub.score,
            bestScorePercent: scorePercent,
          };
        }
      }
    });
  }

  // Enrich simulations with user progress
  const enrichedSimulations = simulations.map((sim) => ({
    ...sim,
    status:
      userId && userProgress[sim.id]
        ? userProgress[sim.id]
        : {
            attempted: false,
            solved: false,
            bestScore: 0,
            bestScorePercent: 0,
          },
  }));

  return res.status(200).json({
    success: true,
    data: enrichedSimulations,
  });
});

// ── Get a single system design simulation ───────────────────────────────────

export const getSystemDesignSimulationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new ApiError(400, "Simulation ID is required");

  const simulation = await prisma.systemDesignSimulation.findUnique({
    where: { id },
  });

  if (!simulation)
    throw new ApiError(404, "System design simulation not found");

  return res.status(200).json({
    success: true,
    data: simulation,
  });
});

// ── Admin: create a system design simulation ────────────────────────────────

export const createSystemDesignSimulation = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    difficulty,
    evaluationRules,
    maxScore,
    tags,
    templateUrl,
  } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  const simulation = await prisma.systemDesignSimulation.create({
    data: {
      title,
      description,
      difficulty: difficulty || "medium",
      evaluationRules: evaluationRules || [],
      maxScore: maxScore || 10,
      tags: tags || [],
      templateUrl: templateUrl || "",
    },
  });

  return res.status(201).json({
    success: true,
    message: "System design simulation created",
    data: simulation,
  });
});

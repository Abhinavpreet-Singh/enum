import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";
import {
  evaluateSystemDesign,
  PRESET_RULES,
} from "../evaluators/systemDesignEvaluator.js";
import {
  tryAwardXp,
  AWARD_TYPES,
  buildAwardKey,
  isSystemDesignFullSuccess,
  systemDesignXpAmount,
} from "../services/xpService.js";
import {
  logUserActivity,
  outcomeFromSystemDesign,
} from "../services/activityLogService.js";
import {
  getTrackProductMap,
  getUserAccessSummary,
  hasTrackAccessFromSummary,
  TRACK_KEYS,
} from "../services/entitlement.service.js";
import {
  buildFeedbackItemsCreate,
  buildSystemDesignRulesCreate,
  serializeSystemDesignSimulation,
  serializeSystemDesignSubmission,
  systemDesignSimulationInclude,
  systemDesignSubmissionInclude,
} from "../utils/prismaNormalizers.js";

const enrichSystemDesignAccess = async (simulations, userId) => {
  const [productsByTrack, accessSummary] = await Promise.all([
    getTrackProductMap(),
    getUserAccessSummary(userId),
  ]);
  const product = productsByTrack[TRACK_KEYS.SYSTEM_DESIGN];
  const freeItemQuota = product?.freeItemQuota ?? 0;
  const hasAccess =
    !product || hasTrackAccessFromSummary(accessSummary, TRACK_KEYS.SYSTEM_DESIGN);

  return simulations.map((sim, index) => {
    const freeIndex = index + 1;
    const isFree = freeIndex <= freeItemQuota;
    const locked = !hasAccess && !isFree;
    return {
      ...sim,
      access: {
        locked,
        isFree,
        freeIndex,
        freeItemQuota,
        trackKey: TRACK_KEYS.SYSTEM_DESIGN,
        productSlug: product?.slug || "",
        reason: locked ? "Upgrade to unlock this system design simulation." : "",
      },
    };
  });
};

const canAccessSystemDesign = async (simulationId, userId) => {
  const simulations = await prisma.systemDesignSimulation.findMany({
    orderBy: { createdAt: "desc" },
  });
  const enriched = await enrichSystemDesignAccess(simulations, userId);
  const simulation = enriched.find((sim) => sim.id === simulationId);
  return { allowed: Boolean(simulation && !simulation.access?.locked), simulation };
};

// ── Submit a system design ──────────────────────────────────────────────────

export const submitSystemDesign = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Authentication required");

  const { simulationId, nodes, edges, explanation, replayEvents } = req.body;

  if (!simulationId) throw new ApiError(400, "simulationId is required");
  const { allowed } = await canAccessSystemDesign(simulationId, userId);
  if (!allowed) {
    throw new ApiError(403, "Upgrade to unlock this system design simulation.");
  }

  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new ApiError(400, "At least one node is required");
  }

  // Fetch the simulation to get evaluation rules + difficulty for XP calc
  const simulation = await prisma.systemDesignSimulation.findUnique({
    where: { id: simulationId },
    include: systemDesignSimulationInclude,
  });

  const evaluationRules = simulation
    ? serializeSystemDesignSimulation(simulation).evaluationRules
    : [];

  let evaluation;
  if (simulation && evaluationRules.length > 0) {
    evaluation = evaluateSystemDesign(
      { nodes, edges },
      evaluationRules,
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

  const difficulty = simulation?.difficulty?.toLowerCase() || "medium";
  const fullSuccess = isSystemDesignFullSuccess(
    evaluation.score,
    evaluation.maxScore,
  );
  const maxXp = systemDesignXpAmount(difficulty, evaluation.maxScore);
  const outcome = outcomeFromSystemDesign(
    evaluation.score,
    evaluation.maxScore,
  );

  const now = new Date();

  const { submission, xpResult, updatedUser } = await prisma.$transaction(
    async (tx) => {
      const created = await tx.systemDesignSubmission.create({
        data: {
          simulationId,
          userId,
          nodes,
          edges,
          explanation: explanation || "",
          replayEvents: replayEvents || null,
          score: evaluation.score,
          maxScore: evaluation.maxScore,
          ...buildFeedbackItemsCreate(evaluation.feedback),
        },
        include: systemDesignSubmissionInclude,
      });

      const xpResult = await tryAwardXp(tx, {
        userId,
        awardKey: buildAwardKey(AWARD_TYPES.system_design, simulationId),
        amount: maxXp,
        fullSuccess,
      });

      if (xpResult.awarded) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { currentStreak: true, lastActivityDate: true },
        });
        const lastActivity = user?.lastActivityDate;
        let streakUpdate = { lastActivityDate: now };
        if (!lastActivity) {
          streakUpdate = { currentStreak: 1, lastActivityDate: now };
        } else {
          const days = Math.floor(
            (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (days === 1) {
            streakUpdate = {
              currentStreak: (user?.currentStreak ?? 0) + 1,
              lastActivityDate: now,
            };
          } else if (days > 1) {
            streakUpdate = { currentStreak: 1, lastActivityDate: now };
          }
        }
        await tx.user.update({ where: { id: userId }, data: streakUpdate });
      }

      await logUserActivity(tx, {
        userId,
        activityType: "system_design",
        resourceId: simulationId,
        resourceTitle: simulation?.title ?? "System Design",
        outcome,
        xpEarned: xpResult.xpEarned,
        score: evaluation.score,
        maxScore: evaluation.maxScore,
        detail: `${evaluation.score}/${evaluation.maxScore} — ${
          fullSuccess ? "perfect score" : "partial — XP requires 100%"
        }`,
      });

      const updatedUser = await tx.user.findUnique({
        where: { id: userId },
        select: { xp: true, currentStreak: true },
      });

      return { submission: created, xpResult, updatedUser };
    },
  );

  return res.status(201).json({
    success: true,
    message: "System design submitted and evaluated",
    data: {
      submissionId: submission.id,
      evaluation,
      xpEarned: xpResult.xpEarned,
      alreadyAwarded: xpResult.alreadyClaimed,
      totalXp: updatedUser?.xp ?? xpResult.totalXp,
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
    include: systemDesignSubmissionInclude,
  });

  return res.status(200).json({
    success: true,
    data: submissions.map(serializeSystemDesignSubmission),
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
    include: systemDesignSubmissionInclude,
  });

  if (!submission) throw new ApiError(404, "Submission not found");

  return res.status(200).json({
    success: true,
    data: serializeSystemDesignSubmission(submission),
  });
});

// ── List all system design simulations ──────────────────────────────────────

export const getSystemDesignSimulations = asyncHandler(async (req, res) => {
  const simulations = await prisma.systemDesignSimulation.findMany({
    orderBy: { createdAt: "desc" },
    include: systemDesignSimulationInclude,
  });

  const userId = req.user?.id;
  let userProgress = {};

  // Fetch user's submissions if authenticated
  if (userId) {
    const [submissions, user] = await Promise.all([
      prisma.systemDesignSubmission.findMany({
        where: { userId },
        select: {
          simulationId: true,
          score: true,
          maxScore: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { systemDesignXpClaims: true },
      }),
    ]);

    const xpClaims = new Set(user?.systemDesignXpClaims ?? []);

    submissions.forEach((sub) => {
      const scorePercent =
        sub.maxScore > 0 ? (sub.score / sub.maxScore) * 100 : 0;
      const entry = userProgress[sub.simulationId];

      if (!entry) {
        userProgress[sub.simulationId] = {
          attempted: true,
          solved: scorePercent >= 100,
          xpAwarded: xpClaims.has(sub.simulationId),
          attempts: 1,
          bestScore: sub.score,
          bestScorePercent: scorePercent,
        };
      } else {
        entry.attempts += 1;
        entry.attempted = true;
        if (scorePercent >= 100) entry.solved = true;
        if (scorePercent > entry.bestScorePercent) {
          entry.bestScore = sub.score;
          entry.bestScorePercent = scorePercent;
        }
      }
    });

    for (const simId of xpClaims) {
      if (!userProgress[simId]) {
        userProgress[simId] = {
          attempted: true,
          solved: true,
          xpAwarded: true,
          attempts: 1,
          bestScore: 0,
          bestScorePercent: 0,
        };
      } else {
        userProgress[simId].xpAwarded = true;
        userProgress[simId].solved = true;
      }
    }
  }

  // Enrich simulations with user progress
  const enrichedSimulations = await enrichSystemDesignAccess(simulations.map((sim) => ({
    ...serializeSystemDesignSimulation(sim),
    status:
      userId && userProgress[sim.id]
        ? userProgress[sim.id]
        : {
            attempted: false,
            solved: false,
            xpAwarded: false,
            attempts: 0,
            bestScore: 0,
            bestScorePercent: 0,
          },
  })), userId);

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
    include: systemDesignSimulationInclude,
  });

  if (!simulation)
    throw new ApiError(404, "System design simulation not found");

  const { allowed } = await canAccessSystemDesign(id, req.user?.id);
  if (!allowed) {
    throw new ApiError(403, "Upgrade to unlock this system design simulation.");
  }

  return res.status(200).json({
    success: true,
    data: serializeSystemDesignSimulation(simulation),
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
      maxScore: maxScore || 10,
      tags: tags || [],
      templateUrl: templateUrl || "",
      ...buildSystemDesignRulesCreate(evaluationRules || []),
    },
    include: systemDesignSimulationInclude,
  });

  return res.status(201).json({
    success: true,
    message: "System design simulation created",
    data: serializeSystemDesignSimulation(simulation),
  });
});

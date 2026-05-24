import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";

function buildStreakUpdate(user, now) {
  const lastActivity = user?.lastActivityDate;

  if (!lastActivity) {
    return { currentStreak: 1, lastActivityDate: now };
  }

  const daysSinceLastActivity = Math.floor(
    (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceLastActivity === 0) {
    return { lastActivityDate: now };
  }

  if (daysSinceLastActivity === 1) {
    return {
      currentStreak: (user?.currentStreak ?? 0) + 1,
      lastActivityDate: now,
    };
  }

  return { currentStreak: 1, lastActivityDate: now };
}

const getProgress = asyncHandler(async (req, res) => {
  const { simulationId } = req.params;
  const userId = req.user?.id;

  if (!userId) throw new ApiError(401, "Authentication required");
  if (!simulationId) throw new ApiError(400, "Simulation ID is required");

  const progress = await prisma.userSimulationProgress.findUnique({
    where: {
      userId_simulationId: { userId, simulationId },
    },
  });

  return res.status(200).json({
    message: "Progress fetched!",
    data: progress || { solved: false, attempts: 0, lastAttemptAt: null },
  });
});

const getAllProgress = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Authentication required");

  const progress = await prisma.userSimulationProgress.findMany({
    where: { userId },
    include: {
      simulation: {
        select: {
          title: true,
          difficulty: true,
          category: true,
          xpReward: true,
        },
      },
    },
    orderBy: { lastAttemptAt: "desc" },
  });

  return res.status(200).json({
    message: "All progress fetched!",
    data: progress,
  });
});

const updateProgress = asyncHandler(async (req, res) => {
  const { simulationId } = req.params;
  const userId = req.user?.id;
  const { solved, modifiedFiles } = req.body;

  if (!userId) throw new ApiError(401, "Authentication required");
  if (!simulationId) throw new ApiError(400, "Simulation ID is required");

  const simulation = await prisma.simulation.findUnique({
    where: { id: simulationId },
  });
  if (!simulation) throw new ApiError(404, "Simulation not found");

  const now = new Date();
  const incomingSolved = solved === true;

  const result = await prisma.$transaction(async (tx) => {
    const existingProgress = await tx.userSimulationProgress.findUnique({
      where: {
        userId_simulationId: { userId, simulationId },
      },
      select: { solved: true },
    });

    const wasSolved = existingProgress?.solved ?? false;
    // Keep solved sticky once true. A later failed run should not undo completion.
    const finalSolved = wasSolved || incomingSolved;

    let progress;
    if (existingProgress) {
      const updateData = {
        lastAttemptAt: now,
        attempts: { increment: 1 },
        solved: finalSolved,
      };
      if (modifiedFiles !== undefined) updateData.modifiedFiles = modifiedFiles;

      progress = await tx.userSimulationProgress.update({
        where: {
          userId_simulationId: { userId, simulationId },
        },
        data: updateData,
      });
    } else {
      progress = await tx.userSimulationProgress.create({
        data: {
          userId,
          simulationId,
          attempts: 1,
          lastAttemptAt: now,
          solved: finalSolved,
          modifiedFiles: modifiedFiles ?? null,
        },
      });
    }

    const newlySolved = incomingSolved && !wasSolved;
    const xpEarned = newlySolved ? (simulation.xpReward ?? 0) : 0;

    let userStats;
    if (newlySolved) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { xp: true, currentStreak: true, lastActivityDate: true },
      });

      const streakUpdate = buildStreakUpdate(user, now);
      userStats = await tx.user.update({
        where: { id: userId },
        data: {
          xp: { increment: xpEarned },
          ...streakUpdate,
        },
        select: { xp: true, currentStreak: true },
      });
    } else {
      userStats = await tx.user.findUnique({
        where: { id: userId },
        select: { xp: true, currentStreak: true },
      });
    }

    return {
      progress,
      xpEarned,
      totalXp: userStats?.xp ?? 0,
      currentStreak: userStats?.currentStreak ?? 0,
      newlySolved,
    };
  });

  return res.status(200).json({
    message: "Progress updated!",
    data: result,
  });
});

export { getProgress, getAllProgress, updateProgress };

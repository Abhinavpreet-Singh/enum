import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import {
  getCompetitionStatus,
  joinCompetition,
  leaveCompetition,
  quickMatch,
  DEFAULT_MAX_PARTICIPANTS,
} from "../services/competition.service.js";

const getStatus = asyncHandler(async (req, res) => {
  const { questionId } = req.params;
  if (!questionId) throw new ApiError(400, "Question ID is required");

  const userId = req.user?.id ?? null;
  const data = await getCompetitionStatus(questionId, userId);

  return res.status(200).json({
    message: "Competition status fetched",
    data,
  });
});

const join = asyncHandler(async (req, res) => {
  const { questionId, maxParticipants } = req.body;
  if (!questionId) throw new ApiError(400, "Question ID is required");

  const username =
    req.user.displayName || req.user.username || req.user.email || "Anonymous";

  const competition = await joinCompetition({
    questionId,
    userId: req.user.id,
    username,
    maxParticipants: maxParticipants ?? DEFAULT_MAX_PARTICIPANTS,
  });

  return res.status(200).json({
    message: "Joined competition",
    data: { competition },
  });
});

const leave = asyncHandler(async (req, res) => {
  const { competitionId } = req.body;
  if (!competitionId) throw new ApiError(400, "Competition ID is required");

  const competition = await leaveCompetition({
    competitionId,
    userId: req.user.id,
  });

  return res.status(200).json({
    message: "Left competition",
    data: { competition },
  });
});

const match = asyncHandler(async (req, res) => {
  const username =
    req.user.displayName || req.user.username || req.user.email || "Anonymous";

  const result = await quickMatch({
    userId: req.user.id,
    username,
    maxParticipants: req.body?.maxParticipants ?? DEFAULT_MAX_PARTICIPANTS,
  });

  return res.status(200).json({
    message: result.matchedExisting
      ? "Rejoined your active race"
      : "Matched into a race",
    data: result,
  });
});

export { getStatus, join, leave, match };

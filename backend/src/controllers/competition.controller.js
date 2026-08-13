import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import {
  getCompetitionStatus,
  getCompetitionById,
  joinCompetition,
  leaveCompetition,
  createRace,
  startRace,
  endRace,
  quickMatch,
  DEFAULT_MAX_PARTICIPANTS,
} from "../services/competition.service.js";

function resolveUsername(req) {
  const fromBody =
    typeof req.body?.username === "string" ? req.body.username.trim() : "";
  if (fromBody) return fromBody.slice(0, 40);
  return (
    req.user.displayName || req.user.username || req.user.email || "Anonymous"
  );
}

const getStatus = asyncHandler(async (req, res) => {
  const { questionId } = req.params;
  if (!questionId) throw new ApiError(400, "Question ID is required");

  const userId = req.user?.id ?? null;
  const competitionId =
    typeof req.query?.competitionId === "string"
      ? req.query.competitionId
      : null;
  const data = await getCompetitionStatus(questionId, userId, competitionId);

  return res.status(200).json({
    message: "Competition status fetched",
    data,
  });
});

const getById = asyncHandler(async (req, res) => {
  const { competitionId } = req.params;
  if (!competitionId) throw new ApiError(400, "Competition ID is required");

  const competition = await getCompetitionById(competitionId, req.user.id);
  if (!competition) throw new ApiError(404, "Race not found");

  return res.status(200).json({
    message: "Race fetched",
    data: { competition },
  });
});

const join = asyncHandler(async (req, res) => {
  const { questionId, competitionId, maxParticipants } = req.body;
  if (!questionId && !competitionId) {
    throw new ApiError(400, "Question ID or competition ID is required");
  }

  const username = resolveUsername(req);

  const competition = await joinCompetition({
    questionId: questionId || null,
    competitionId: competitionId || null,
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

const start = asyncHandler(async (req, res) => {
  const { competitionId } = req.body;
  if (!competitionId) throw new ApiError(400, "Competition ID is required");

  const competition = await startRace({
    competitionId,
    userId: req.user.id,
  });

  return res.status(200).json({
    message: "Race started",
    data: { competition },
  });
});

const end = asyncHandler(async (req, res) => {
  const { competitionId } = req.body;
  if (!competitionId) throw new ApiError(400, "Competition ID is required");

  const competition = await endRace({
    competitionId,
    userId: req.user.id,
  });

  return res.status(200).json({
    message: "Race ended",
    data: { competition },
  });
});

const create = asyncHandler(async (req, res) => {
  const username = resolveUsername(req);

  const result = await createRace({
    userId: req.user.id,
    username,
    maxParticipants: req.body?.maxParticipants ?? 5,
  });

  return res.status(200).json({
    message: result.matchedExisting
      ? "Rejoined your active race"
      : "Race created",
    data: result,
  });
});

const match = asyncHandler(async (req, res) => {
  const username = resolveUsername(req);

  const result = await quickMatch({
    userId: req.user.id,
    username,
    maxParticipants: req.body?.maxParticipants ?? 5,
  });

  return res.status(200).json({
    message: result.matchedExisting
      ? "Rejoined your active race"
      : "Race created",
    data: result,
  });
});

export { getStatus, getById, join, leave, start, end, create, match };

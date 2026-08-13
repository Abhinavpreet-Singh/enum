import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { emitCompetitionState } from "../socket/io.js";

export const DEFAULT_MAX_PARTICIPANTS = 10;
export const MIN_QUESTION_COUNT = 1;
export const MAX_QUESTION_COUNT = 5;
export const RACE_MODES = new Set(["first_solve", "timed"]);
export const TIMED_DURATION_OPTIONS = [600, 900, 1800, 2700, 3600];

const competitionInclude = {
  participants: {
    orderBy: { joinedAt: "asc" },
    select: {
      id: true,
      userId: true,
      username: true,
      joinedAt: true,
    },
  },
  solves: {
    orderBy: { solvedAt: "asc" },
    select: {
      userId: true,
      questionId: true,
      solvedAt: true,
    },
  },
};

function normalizeStringList(value, { max = 20, maxLen = 80 } = {}) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim().slice(0, maxLen);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

function clampQuestionCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(
    MAX_QUESTION_COUNT,
    Math.max(MIN_QUESTION_COUNT, Math.round(n)),
  );
}

function normalizeMode(value) {
  return RACE_MODES.has(value) ? value : "first_solve";
}

function normalizeDurationSeconds(mode, value) {
  if (mode !== "timed") return null;
  const n = Number(value);
  if (TIMED_DURATION_OPTIONS.includes(n)) return n;
  if (Number.isFinite(n) && n >= 300 && n <= 7200) return Math.round(n);
  return 900;
}

function raceQuestionIds(competition) {
  if (Array.isArray(competition.questionIds) && competition.questionIds.length > 0) {
    return competition.questionIds;
  }
  return competition.questionId ? [competition.questionId] : [];
}

function endsAtFor(competition) {
  if (
    competition.mode !== "timed" ||
    !competition.startedAt ||
    !competition.durationSeconds
  ) {
    return null;
  }
  return new Date(
    new Date(competition.startedAt).getTime() +
      competition.durationSeconds * 1000,
  );
}

function isTimedExpired(competition, now = new Date()) {
  const endsAt = endsAtFor(competition);
  return Boolean(endsAt && now >= endsAt);
}

function progressByUser(competition) {
  const solves = competition.solves ?? [];
  const map = new Map();
  for (const solve of solves) {
    const entry = map.get(solve.userId) ?? {
      userId: solve.userId,
      solvedCount: 0,
      solvedQuestionIds: [],
      lastSolvedAt: null,
    };
    entry.solvedCount += 1;
    entry.solvedQuestionIds.push(solve.questionId);
    entry.lastSolvedAt = solve.solvedAt;
    map.set(solve.userId, entry);
  }
  return [...map.values()];
}

function pickTimedWinner(competition) {
  const participants = competition.participants ?? [];
  const progress = progressByUser(competition);
  if (progress.length === 0) return null;

  progress.sort((a, b) => {
    if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
    const aTime = a.lastSolvedAt ? new Date(a.lastSolvedAt).getTime() : Infinity;
    const bTime = b.lastSolvedAt ? new Date(b.lastSolvedAt).getTime() : Infinity;
    return aTime - bTime;
  });

  const top = progress[0];
  if (!top || top.solvedCount <= 0) return null;

  const user = participants.find((p) => p.userId === top.userId);
  return {
    id: top.userId,
    username: user?.username ?? "Competitor",
  };
}

async function loadQuestionSummaries(ids) {
  if (!ids?.length) return [];
  const rows = await prisma.question.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, topic: true, level: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((q) => ({
      id: q.id,
      title: q.title || "Untitled",
      topic: q.topic || "",
      level: q.level || "Easy",
    }));
}

export function serializeCompetition(competition, currentUserId) {
  if (!competition) return null;

  const isParticipant = competition.participants.some(
    (p) => p.userId === currentUserId,
  );
  const isWinner = competition.winnerId === currentUserId;
  const isCompleted = competition.status === "completed";
  const isWaiting = competition.status === "waiting";
  const isActive = competition.status === "active";
  const isFull =
    competition.participants.length >= competition.maxParticipants;
  const hostUserId = competition.participants[0]?.userId ?? null;
  const isHost =
    currentUserId != null && hostUserId != null && currentUserId === hostUserId;

  const qIds = raceQuestionIds(competition);
  const solves = competition.solves ?? [];
  const mySolvedQuestionIds = currentUserId
    ? solves.filter((s) => s.userId === currentUserId).map((s) => s.questionId)
    : [];
  const endsAt = endsAtFor(competition);
  const questionCount = competition.questionCount ?? (qIds.length || 1);

  return {
    id: competition.id,
    questionId: competition.questionId,
    questionIds: qIds,
    maxParticipants: competition.maxParticipants,
    status: competition.status,
    participantCount: competition.participants.length,
    isFull,
    winner: competition.winnerId
      ? {
          id: competition.winnerId,
          username: competition.winnerUsername,
        }
      : null,
    completedAt: competition.completedAt,
    createdAt: competition.createdAt,
    participants: competition.participants,
    settings: {
      excludeTopics: competition.excludeTopics ?? [],
      questionCount,
      includedQuestionIds: competition.includedQuestionIds ?? [],
      mode: competition.mode || "first_solve",
      durationSeconds: competition.durationSeconds ?? null,
    },
    startedAt: competition.startedAt ?? null,
    endsAt: endsAt ? endsAt.toISOString() : null,
    mySolvedQuestionIds,
    participantProgress: progressByUser(competition).map((p) => ({
      userId: p.userId,
      solvedCount: p.solvedCount,
      solvedQuestionIds: p.solvedQuestionIds,
    })),
    questions: competition._questionSummaries ?? undefined,
    isParticipant,
    isWinner,
    isWaiting,
    isActive,
    hostUserId,
    isHost,
    editorLocked:
      (isWaiting && isParticipant) ||
      (isCompleted &&
        Boolean(competition.winnerId) &&
        isParticipant &&
        !isWinner),
    canJoin:
      !isCompleted && !isFull && !isParticipant && currentUserId != null,
    canStart:
      isWaiting &&
      isHost &&
      competition.participants.length >= 2,
    canEnd: isHost && (isWaiting || isActive),
  };
}

async function serializeWithQuestions(competition, currentUserId) {
  if (!competition) return null;
  const summaries = await loadQuestionSummaries(raceQuestionIds(competition));
  return serializeCompetition(
    { ...competition, _questionSummaries: summaries },
    currentUserId,
  );
}

async function broadcastCompetition(competitionId) {
  const latest = await prisma.questionCompetition.findUnique({
    where: { id: competitionId },
    include: competitionInclude,
  });
  if (!latest) return null;
  const state = await serializeWithQuestions(latest, null);
  emitCompetitionState(competitionId, state);
  return latest;
}

const OPEN_STATUSES = ["waiting", "active"];

async function maybeFinalizeTimedRace(competition) {
  if (
    !competition ||
    competition.status !== "active" ||
    competition.mode !== "timed" ||
    !isTimedExpired(competition)
  ) {
    return competition;
  }

  const winner = pickTimedWinner(competition);
  const claim = await prisma.questionCompetition.updateMany({
    where: { id: competition.id, status: "active" },
    data: {
      status: "completed",
      winnerId: winner?.id ?? null,
      winnerUsername: winner?.username ?? null,
      completedAt: new Date(),
    },
  });

  if (claim.count === 0) {
    return prisma.questionCompetition.findUnique({
      where: { id: competition.id },
      include: competitionInclude,
    });
  }

  const updated = await prisma.questionCompetition.findUnique({
    where: { id: competition.id },
    include: competitionInclude,
  });
  await broadcastCompetition(competition.id);
  return updated;
}

export async function getActiveCompetition(questionId, currentUserId) {
  const competition = await prisma.questionCompetition.findFirst({
    where: {
      status: { in: OPEN_STATUSES },
      OR: [{ questionId }, { questionIds: { has: questionId } }],
    },
    include: competitionInclude,
    orderBy: { createdAt: "desc" },
  });

  if (!competition) return null;
  const finalized = await maybeFinalizeTimedRace(competition);
  return serializeWithQuestions(finalized, currentUserId);
}

export async function getCompetitionById(competitionId, currentUserId) {
  let competition = await prisma.questionCompetition.findUnique({
    where: { id: competitionId },
    include: competitionInclude,
  });
  if (!competition) return null;
  competition = await maybeFinalizeTimedRace(competition);
  return serializeWithQuestions(competition, currentUserId);
}

export async function getCompetitionStatus(
  questionId,
  currentUserId,
  competitionId = null,
) {
  if (competitionId) {
    let targeted = await prisma.questionCompetition.findFirst({
      where: {
        id: competitionId,
        OR: [{ questionId }, { questionIds: { has: questionId } }],
      },
      include: competitionInclude,
    });

    if (targeted) {
      targeted = await maybeFinalizeTimedRace(targeted);
      const serialized = await serializeWithQuestions(targeted, currentUserId);
      return {
        competition: serialized,
        lastCompleted:
          targeted.status === "completed" ? serialized : null,
        canStartNew: targeted.status === "completed",
      };
    }
  }

  let active = await prisma.questionCompetition.findFirst({
    where: {
      status: { in: OPEN_STATUSES },
      OR: [{ questionId }, { questionIds: { has: questionId } }],
    },
    include: competitionInclude,
    orderBy: { createdAt: "desc" },
  });

  if (active) {
    active = await maybeFinalizeTimedRace(active);
    return {
      competition: await serializeWithQuestions(active, currentUserId),
      lastCompleted: null,
      canStartNew: false,
    };
  }

  if (currentUserId) {
    const userRecent = await prisma.questionCompetition.findFirst({
      where: {
        status: "completed",
        OR: [{ questionId }, { questionIds: { has: questionId } }],
        participants: { some: { userId: currentUserId } },
      },
      include: competitionInclude,
      orderBy: { completedAt: "desc" },
    });

    if (userRecent) {
      const serialized = await serializeWithQuestions(userRecent, currentUserId);
      return {
        competition: serialized,
        lastCompleted: serialized,
        canStartNew: true,
      };
    }
  }

  const lastCompleted = await prisma.questionCompetition.findFirst({
    where: {
      status: "completed",
      OR: [{ questionId }, { questionIds: { has: questionId } }],
    },
    include: competitionInclude,
    orderBy: { completedAt: "desc" },
  });

  return {
    competition: null,
    lastCompleted: lastCompleted
      ? await serializeWithQuestions(lastCompleted, currentUserId)
      : null,
    canStartNew: true,
  };
}

export async function joinCompetition({
  questionId,
  competitionId = null,
  userId,
  username,
  maxParticipants = DEFAULT_MAX_PARTICIPANTS,
}) {
  const cappedMax = Math.min(Math.max(2, maxParticipants), 50);

  const result = await prisma.$transaction(async (tx) => {
    let competition = null;

    if (competitionId) {
      competition = await tx.questionCompetition.findUnique({
        where: { id: competitionId },
        include: competitionInclude,
      });
      if (!competition) throw new ApiError(404, "Race not found");
      const ids = raceQuestionIds(competition);
      if (
        questionId &&
        !ids.includes(questionId) &&
        competition.questionId !== questionId
      ) {
        throw new ApiError(400, "Invite does not match this question");
      }
    } else {
      if (!questionId) throw new ApiError(400, "Question ID is required");

      const question = await tx.question.findUnique({
        where: { id: questionId },
        select: { id: true },
      });
      if (!question) throw new ApiError(404, "Question not found");

      competition = await tx.questionCompetition.findFirst({
        where: {
          status: { in: OPEN_STATUSES },
          OR: [{ questionId }, { questionIds: { has: questionId } }],
        },
        include: competitionInclude,
        orderBy: { createdAt: "desc" },
      });

      if (!competition) {
        competition = await tx.questionCompetition.create({
          data: {
            questionId,
            questionIds: [questionId],
            includedQuestionIds: [questionId],
            questionCount: 1,
            maxParticipants: cappedMax,
            status: "waiting",
          },
          include: competitionInclude,
        });
      }
    }

    const alreadyJoined = competition.participants.some(
      (p) => p.userId === userId,
    );
    if (alreadyJoined) {
      return competition;
    }

    if (competition.status === "completed") {
      throw new ApiError(409, "This competition has already ended");
    }

    if (competition.status === "active") {
      throw new ApiError(409, "This race has already started");
    }

    if (competition.participants.length >= competition.maxParticipants) {
      throw new ApiError(
        409,
        `Competition is full (${competition.maxParticipants} participants max)`,
      );
    }

    await tx.questionCompetitionParticipant.create({
      data: {
        competitionId: competition.id,
        userId,
        username,
      },
    });

    return tx.questionCompetition.findUnique({
      where: { id: competition.id },
      include: competitionInclude,
    });
  });

  await broadcastCompetition(result.id);
  return serializeWithQuestions(result, userId);
}

export async function leaveCompetition({ competitionId, userId }) {
  const competition = await prisma.questionCompetition.findUnique({
    where: { id: competitionId },
    include: competitionInclude,
  });

  if (!competition) throw new ApiError(404, "Competition not found");
  if (competition.status === "completed") {
    throw new ApiError(409, "Cannot leave a completed competition");
  }

  const isParticipant = competition.participants.some(
    (p) => p.userId === userId,
  );
  if (!isParticipant) {
    throw new ApiError(400, "You are not in this competition");
  }

  await prisma.questionCompetitionParticipant.deleteMany({
    where: { competitionId, userId },
  });

  const updated = await broadcastCompetition(competitionId);
  return serializeWithQuestions(updated, userId);
}

async function pickRandomQuestionIds({
  count,
  excludeTopics = [],
  excludeIds = [],
}) {
  if (count <= 0) return [];

  const excluded = normalizeStringList(excludeTopics, { max: 40 });
  const excludeIdList = normalizeStringList(excludeIds, {
    max: 100,
    maxLen: 64,
  });

  const where = {
    ...(excludeIdList.length ? { id: { notIn: excludeIdList } } : {}),
    ...(excluded.length
      ? {
          OR: [
            { topic: null },
            { topic: "" },
            { NOT: { topic: { in: excluded } } },
          ],
        }
      : {}),
  };

  const pool = await prisma.question.findMany({
    where,
    select: { id: true, title: true },
    take: 500,
  });

  if (pool.length < count) {
    throw new ApiError(
      400,
      `Not enough questions available (${pool.length} left after filters). Lower the count or remove avoid-topics.`,
    );
  }

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count).map((q) => q.id);
}

async function resolveRaceQuestionIds({
  excludeTopics,
  questionCount,
  includedQuestionIds,
}) {
  const included = normalizeStringList(includedQuestionIds, {
    max: MAX_QUESTION_COUNT,
    maxLen: 64,
  });
  const count = clampQuestionCount(questionCount);

  if (included.length > count) {
    throw new ApiError(
      400,
      `You selected ${included.length} specific questions but question count is ${count}`,
    );
  }

  if (included.length > 0) {
    const found = await prisma.question.findMany({
      where: { id: { in: included } },
      select: { id: true },
    });
    if (found.length !== included.length) {
      throw new ApiError(400, "One or more selected questions were not found");
    }
  }

  const needed = count - included.length;
  const randomIds = await pickRandomQuestionIds({
    count: needed,
    excludeTopics,
    excludeIds: included,
  });

  return [...included, ...randomIds];
}

/**
 * Host updates lobby race settings while waiting.
 */
export async function updateRaceSettings({
  competitionId,
  userId,
  excludeTopics,
  questionCount,
  includedQuestionIds,
  mode,
  durationSeconds,
}) {
  const competition = await prisma.questionCompetition.findUnique({
    where: { id: competitionId },
    include: competitionInclude,
  });

  if (!competition) throw new ApiError(404, "Race not found");
  if (competition.status !== "waiting") {
    throw new ApiError(
      409,
      "Settings can only be changed before the race starts",
    );
  }

  const hostUserId = competition.participants[0]?.userId;
  if (!hostUserId || hostUserId !== userId) {
    throw new ApiError(403, "Only the race host can change settings");
  }

  const nextMode = normalizeMode(mode ?? competition.mode ?? "first_solve");
  const nextCount = clampQuestionCount(
    questionCount ?? competition.questionCount ?? 1,
  );
  const nextExcluded = normalizeStringList(
    excludeTopics ?? competition.excludeTopics ?? [],
    { max: 40 },
  );
  const nextIncluded = normalizeStringList(
    includedQuestionIds ?? competition.includedQuestionIds ?? [],
    { max: MAX_QUESTION_COUNT, maxLen: 64 },
  );
  const nextDuration = normalizeDurationSeconds(
    nextMode,
    durationSeconds ?? competition.durationSeconds,
  );

  const questionIds = await resolveRaceQuestionIds({
    excludeTopics: nextExcluded,
    questionCount: nextCount,
    includedQuestionIds: nextIncluded,
  });

  const updated = await prisma.questionCompetition.update({
    where: { id: competitionId },
    data: {
      excludeTopics: nextExcluded,
      questionCount: nextCount,
      includedQuestionIds: nextIncluded,
      questionIds,
      questionId: questionIds[0],
      mode: nextMode,
      durationSeconds: nextDuration,
    },
    include: competitionInclude,
  });

  await broadcastCompetition(competitionId);
  return serializeWithQuestions(updated, userId);
}

/**
 * Host starts a waiting race (requires at least 2 participants).
 */
export async function startRace({ competitionId, userId }) {
  const competition = await prisma.questionCompetition.findUnique({
    where: { id: competitionId },
    include: competitionInclude,
  });

  if (!competition) throw new ApiError(404, "Race not found");
  if (competition.status !== "waiting") {
    throw new ApiError(409, "Race is not waiting to start");
  }

  const hostUserId = competition.participants[0]?.userId;
  if (!hostUserId || hostUserId !== userId) {
    throw new ApiError(403, "Only the race host can start the race");
  }

  if (competition.participants.length < 2) {
    throw new ApiError(400, "Need at least 2 players to start the race");
  }

  const mode = normalizeMode(competition.mode);
  const durationSeconds = normalizeDurationSeconds(
    mode,
    competition.durationSeconds,
  );

  const questionIds = await resolveRaceQuestionIds({
    excludeTopics: competition.excludeTopics ?? [],
    questionCount: competition.questionCount ?? 1,
    includedQuestionIds: competition.includedQuestionIds ?? [],
  });

  const updated = await prisma.questionCompetition.update({
    where: { id: competitionId },
    data: {
      status: "active",
      startedAt: new Date(),
      mode,
      durationSeconds,
      questionIds,
      questionId: questionIds[0],
      questionCount: questionIds.length,
    },
    include: competitionInclude,
  });

  await broadcastCompetition(competitionId);
  return serializeWithQuestions(updated, userId);
}

/**
 * Host ends a waiting or active race without declaring a winner.
 */
export async function endRace({ competitionId, userId }) {
  const competition = await prisma.questionCompetition.findUnique({
    where: { id: competitionId },
    include: competitionInclude,
  });

  if (!competition) throw new ApiError(404, "Race not found");
  if (competition.status === "completed") {
    throw new ApiError(409, "Race has already ended");
  }

  const hostUserId = competition.participants[0]?.userId;
  if (!hostUserId || hostUserId !== userId) {
    throw new ApiError(403, "Only the race host can end the race");
  }

  const updated = await prisma.questionCompetition.update({
    where: { id: competitionId },
    data: {
      status: "completed",
      winnerId: null,
      winnerUsername: null,
      completedAt: new Date(),
    },
    include: competitionInclude,
  });

  await broadcastCompetition(competitionId);
  return serializeWithQuestions(updated, userId);
}

/**
 * Client/host asks to settle a timed race after the clock hits zero.
 */
export async function settleTimedRace({ competitionId, userId }) {
  let competition = await prisma.questionCompetition.findUnique({
    where: { id: competitionId },
    include: competitionInclude,
  });
  if (!competition) throw new ApiError(404, "Race not found");

  const isParticipant = competition.participants.some(
    (p) => p.userId === userId,
  );
  if (!isParticipant) {
    throw new ApiError(403, "Only participants can settle this race");
  }

  competition = await maybeFinalizeTimedRace(competition);
  return serializeWithQuestions(competition, userId);
}

/**
 * Atomically record a solve and declare a winner when race rules are met.
 */
export async function tryDeclareWinner({ questionId, userId, username }) {
  const participant = await prisma.questionCompetitionParticipant.findFirst({
    where: {
      userId,
      competition: {
        status: "active",
        OR: [{ questionId }, { questionIds: { has: questionId } }],
      },
    },
    include: {
      competition: { include: competitionInclude },
    },
  });

  if (!participant) {
    return { won: false, competition: null, reason: "not_in_competition" };
  }

  const competitionId = participant.competitionId;
  let competition = await maybeFinalizeTimedRace(participant.competition);

  if (!competition || competition.status === "completed") {
    return {
      won: false,
      competition: await serializeWithQuestions(competition, userId),
      reason: "already_completed",
    };
  }

  const qIds = raceQuestionIds(competition);
  if (!qIds.includes(questionId)) {
    return {
      won: false,
      competition: await serializeWithQuestions(competition, userId),
      reason: "question_not_in_race",
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.questionCompetition.findUnique({
      where: { id: competitionId },
      include: competitionInclude,
    });

    if (!current || current.status === "completed") {
      return {
        won: false,
        competition: current,
        reason: "already_completed",
      };
    }

    if (current.status !== "active") {
      return {
        won: false,
        competition: current,
        reason: "not_started",
      };
    }

    if (current.mode === "timed" && isTimedExpired(current)) {
      return {
        won: false,
        competition: current,
        reason: "time_expired",
        needsFinalize: true,
      };
    }

    await tx.questionCompetitionSolve.upsert({
      where: {
        competitionId_userId_questionId: {
          competitionId,
          userId,
          questionId,
        },
      },
      create: { competitionId, userId, questionId },
      update: {},
    });

    const refreshed = await tx.questionCompetition.findUnique({
      where: { id: competitionId },
      include: competitionInclude,
    });

    const solvedIds = new Set(
      (refreshed.solves ?? [])
        .filter((s) => s.userId === userId)
        .map((s) => s.questionId),
    );
    const allSolved = raceQuestionIds(refreshed).every((id) =>
      solvedIds.has(id),
    );

    if (!allSolved) {
      return {
        won: false,
        competition: refreshed,
        reason: "progress",
      };
    }

    const claim = await tx.questionCompetition.updateMany({
      where: { id: competitionId, status: "active" },
      data: {
        status: "completed",
        winnerId: userId,
        winnerUsername: username,
        completedAt: new Date(),
      },
    });

    if (claim.count === 0) {
      const latest = await tx.questionCompetition.findUnique({
        where: { id: competitionId },
        include: competitionInclude,
      });
      return {
        won: false,
        competition: latest,
        reason: "already_completed",
      };
    }

    const updated = await tx.questionCompetition.findUnique({
      where: { id: competitionId },
      include: competitionInclude,
    });

    return {
      won: true,
      competition: updated,
      reason: "won",
    };
  });

  if (result.needsFinalize) {
    const finalized = await maybeFinalizeTimedRace(result.competition);
    return {
      won: false,
      competition: await serializeWithQuestions(finalized, userId),
      reason: "time_expired",
    };
  }

  if (result.competition) {
    await broadcastCompetition(competitionId);
  }

  return {
    won: result.won,
    competition: await serializeWithQuestions(result.competition, userId),
    reason: result.reason,
  };
}

export async function assertCanSubmitInCompetition(questionId, userId) {
  const participant = await prisma.questionCompetitionParticipant.findFirst({
    where: {
      userId,
      competition: {
        OR: [{ questionId }, { questionIds: { has: questionId } }],
      },
    },
    include: {
      competition: { include: competitionInclude },
    },
    orderBy: {
      competition: { createdAt: "desc" },
    },
  });

  if (!participant) return { allowed: true, reason: "not_in_competition" };

  let competition = participant.competition;
  competition = (await maybeFinalizeTimedRace(competition)) ?? competition;

  if (competition.status === "waiting") {
    throw new ApiError(423, "Race has not started yet — wait in the lobby");
  }

  if (competition.status === "active") {
    return { allowed: true, competitionId: competition.id };
  }

  const isWinner = competition.winnerId === userId;
  if (!isWinner) {
    throw new ApiError(
      423,
      `${competition.winnerUsername || "Another competitor"} already won this race`,
    );
  }

  return { allowed: true, competitionId: competition.id };
}

async function pickRandomQuestionId(excludeTopics = []) {
  const ids = await pickRandomQuestionIds({
    count: 1,
    excludeTopics,
    excludeIds: [],
  });
  return ids[0];
}

/**
 * Create a private invite race on a random question (host only).
 * Rejoins an existing open race if the user already has one.
 */
export async function createRace({
  userId,
  username,
  maxParticipants = 5,
}) {
  const existing = await prisma.questionCompetitionParticipant.findFirst({
    where: {
      userId,
      competition: { status: { in: OPEN_STATUSES } },
    },
    include: {
      competition: { include: competitionInclude },
    },
    orderBy: { joinedAt: "desc" },
  });

  if (existing) {
    let competition = existing.competition;

    if (competition.maxParticipants < maxParticipants) {
      competition = await prisma.questionCompetition.update({
        where: { id: competition.id },
        data: { maxParticipants },
        include: competitionInclude,
      });
      await broadcastCompetition(competition.id);
      return {
        questionId: competition.questionId,
        questionTitle: null,
        competition: await serializeWithQuestions(competition, userId),
        matchedExisting: true,
      };
    }

    return {
      questionId: competition.questionId,
      questionTitle: null,
      competition: await serializeWithQuestions(competition, userId),
      matchedExisting: true,
    };
  }

  const randomQuestionId = await pickRandomQuestionId();
  const cappedMax = Math.min(Math.max(2, maxParticipants), 50);

  const competition = await prisma.questionCompetition.create({
    data: {
      questionId: randomQuestionId,
      questionIds: [randomQuestionId],
      questionCount: 1,
      maxParticipants: cappedMax,
      status: "waiting",
      mode: "first_solve",
      participants: {
        create: {
          userId,
          username,
        },
      },
    },
    include: competitionInclude,
  });

  await broadcastCompetition(competition.id);

  return {
    questionId: randomQuestionId,
    questionTitle: null,
    competition: await serializeWithQuestions(competition, userId),
    matchedExisting: false,
  };
}

/**
 * Match a user into an active race or start a new one on a random question.
 * Kept for backwards compatibility; prefer createRace for invite flow.
 */
export async function quickMatch({
  userId,
  username,
  maxParticipants = DEFAULT_MAX_PARTICIPANTS,
}) {
  return createRace({ userId, username, maxParticipants });
}

export async function listRaceQuestionCatalog() {
  const rows = await prisma.question.findMany({
    select: { id: true, title: true, topic: true, level: true },
    orderBy: { title: "asc" },
    take: 1000,
  });

  const topics = [
    ...new Set(rows.map((r) => (r.topic || "").trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));

  return {
    topics,
    questions: rows.map((q) => ({
      id: q.id,
      title: q.title || "Untitled",
      topic: q.topic || "",
      level: q.level || "Easy",
    })),
  };
}

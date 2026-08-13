import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { emitCompetitionState } from "../socket/io.js";

export const DEFAULT_MAX_PARTICIPANTS = 10;

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
};

export function serializeCompetition(competition, currentUserId) {
  if (!competition) return null;

  const isParticipant = competition.participants.some(
    (p) => p.userId === currentUserId,
  );
  const isWinner = competition.winnerId === currentUserId;
  const isCompleted = competition.status === "completed";
  const isFull =
    competition.participants.length >= competition.maxParticipants;

  return {
    id: competition.id,
    questionId: competition.questionId,
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
    isParticipant,
    isWinner,
    editorLocked: isCompleted && isParticipant && !isWinner,
    canJoin:
      !isCompleted && !isFull && !isParticipant && currentUserId != null,
  };
}

export async function getActiveCompetition(questionId, currentUserId) {
  const competition = await prisma.questionCompetition.findFirst({
    where: { questionId, status: "active" },
    include: competitionInclude,
    orderBy: { createdAt: "desc" },
  });

  if (!competition) return null;
  return serializeCompetition(competition, currentUserId);
}

export async function getCompetitionById(competitionId, currentUserId) {
  const competition = await prisma.questionCompetition.findUnique({
    where: { id: competitionId },
    include: competitionInclude,
  });
  if (!competition) return null;
  return serializeCompetition(competition, currentUserId);
}

export async function getCompetitionStatus(
  questionId,
  currentUserId,
  competitionId = null,
) {
  if (competitionId) {
    const targeted = await prisma.questionCompetition.findFirst({
      where: { id: competitionId, questionId },
      include: competitionInclude,
    });

    if (targeted) {
      const serialized = serializeCompetition(targeted, currentUserId);
      return {
        competition: serialized,
        lastCompleted:
          targeted.status === "completed" ? serialized : null,
        canStartNew: targeted.status === "completed",
      };
    }
  }

  const active = await prisma.questionCompetition.findFirst({
    where: { questionId, status: "active" },
    include: competitionInclude,
    orderBy: { createdAt: "desc" },
  });

  if (active) {
    return {
      competition: serializeCompetition(active, currentUserId),
      lastCompleted: null,
      canStartNew: false,
    };
  }

  if (currentUserId) {
    const userRecent = await prisma.questionCompetition.findFirst({
      where: {
        questionId,
        status: "completed",
        participants: { some: { userId: currentUserId } },
      },
      include: competitionInclude,
      orderBy: { completedAt: "desc" },
    });

    if (userRecent) {
      const serialized = serializeCompetition(userRecent, currentUserId);
      return {
        competition: serialized,
        lastCompleted: serialized,
        canStartNew: true,
      };
    }
  }

  const lastCompleted = await prisma.questionCompetition.findFirst({
    where: { questionId, status: "completed" },
    include: competitionInclude,
    orderBy: { completedAt: "desc" },
  });

  return {
    competition: null,
    lastCompleted: lastCompleted
      ? serializeCompetition(lastCompleted, currentUserId)
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
      if (questionId && competition.questionId !== questionId) {
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
        where: { questionId, status: "active" },
        include: competitionInclude,
        orderBy: { createdAt: "desc" },
      });

      if (!competition) {
        competition = await tx.questionCompetition.create({
          data: {
            questionId,
            maxParticipants: cappedMax,
          },
          include: competitionInclude,
        });
      }
    }

    const alreadyJoined = competition.participants.some(
      (p) => p.userId === userId,
    );
    if (alreadyJoined) {
      return serializeCompetition(competition, userId);
    }

    if (competition.status === "completed") {
      throw new ApiError(409, "This competition has already ended");
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

    const updated = await tx.questionCompetition.findUnique({
      where: { id: competition.id },
      include: competitionInclude,
    });

    return serializeCompetition(updated, userId);
  });

  emitCompetitionState(result.id, result);
  return result;
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

  const updated = await prisma.questionCompetition.findUnique({
    where: { id: competitionId },
    include: competitionInclude,
  });

  const state = serializeCompetition(updated, userId);
  emitCompetitionState(competitionId, state);
  return state;
}

/**
 * Atomically declare a winner when a participant passes all test cases.
 * Returns { won, competition } where won is true only for the first accept.
 */
export async function tryDeclareWinner({
  questionId,
  userId,
  username,
}) {
  const participant = await prisma.questionCompetitionParticipant.findFirst({
    where: {
      userId,
      competition: { questionId, status: "active" },
    },
    include: {
      competition: { include: competitionInclude },
    },
  });

  if (!participant) {
    return { won: false, competition: null, reason: "not_in_competition" };
  }

  const competitionId = participant.competitionId;

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.questionCompetition.findUnique({
      where: { id: competitionId },
      include: competitionInclude,
    });

    if (!current || current.status === "completed") {
      return {
        won: false,
        competition: serializeCompetition(current, userId),
        reason: "already_completed",
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
        competition: serializeCompetition(latest, userId),
        reason: "already_completed",
      };
    }

    const updated = await tx.questionCompetition.findUnique({
      where: { id: competitionId },
      include: competitionInclude,
    });

    return {
      won: true,
      competition: serializeCompetition(updated, userId),
      reason: "won",
    };
  });

  if (result.competition) {
    emitCompetitionState(competitionId, result.competition);
  }

  return result;
}

export async function assertCanSubmitInCompetition(questionId, userId) {
  const participant = await prisma.questionCompetitionParticipant.findFirst({
    where: {
      userId,
      competition: { questionId },
    },
    include: {
      competition: true,
    },
    orderBy: {
      competition: { createdAt: "desc" },
    },
  });

  if (!participant) return { allowed: true, reason: "not_in_competition" };

  if (participant.competition.status === "active") {
    return { allowed: true, competitionId: participant.competitionId };
  }

  const isWinner = participant.competition.winnerId === userId;
  if (!isWinner) {
    throw new ApiError(
      423,
      `${participant.competition.winnerUsername || "Another competitor"} already won this race`,
    );
  }

  return { allowed: true, competitionId: participant.competitionId };
}

async function pickRandomQuestionId() {
  // Single round-trip — fewer chances to hit a dropped idle connection.
  const rows = await prisma.$queryRaw`
    SELECT id, title
    FROM questions
    ORDER BY RANDOM()
    LIMIT 1
  `;
  const question = Array.isArray(rows) ? rows[0] : null;
  if (!question?.id) {
    throw new ApiError(404, "No questions available for racing");
  }
  return { id: question.id, title: question.title ?? null };
}

/**
 * Create a private invite race on a random question (host only).
 * Rejoins an existing active race if the user already has one.
 */
export async function createRace({
  userId,
  username,
  maxParticipants = 2,
}) {
  const existing = await prisma.questionCompetitionParticipant.findFirst({
    where: {
      userId,
      competition: { status: "active" },
    },
    include: {
      competition: { include: competitionInclude },
    },
    orderBy: { joinedAt: "desc" },
  });

  if (existing) {
    return {
      questionId: existing.competition.questionId,
      questionTitle: null,
      competition: serializeCompetition(existing.competition, userId),
      matchedExisting: true,
    };
  }

  const randomQuestion = await pickRandomQuestionId();
  const cappedMax = Math.min(Math.max(2, maxParticipants), 50);

  // Nested create avoids multi-step interactive transactions that hang when
  // the remote Postgres drops a pooled socket mid-flight.
  const competition = await prisma.questionCompetition.create({
    data: {
      questionId: randomQuestion.id,
      maxParticipants: cappedMax,
      participants: {
        create: {
          userId,
          username,
        },
      },
    },
    include: competitionInclude,
  });

  const serialized = serializeCompetition(competition, userId);
  emitCompetitionState(serialized.id, serialized);

  return {
    questionId: randomQuestion.id,
    questionTitle: randomQuestion.title,
    competition: serialized,
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

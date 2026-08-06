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

export async function getCompetitionStatus(questionId, currentUserId) {
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
  userId,
  username,
  maxParticipants = DEFAULT_MAX_PARTICIPANTS,
}) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });
  if (!question) throw new ApiError(404, "Question not found");

  const cappedMax = Math.min(Math.max(2, maxParticipants), 50);

  const result = await prisma.$transaction(async (tx) => {
    let competition = await tx.questionCompetition.findFirst({
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
  const total = await prisma.question.count();
  if (total === 0) throw new ApiError(404, "No questions available for racing");

  const skip = Math.floor(Math.random() * total);
  const [question] = await prisma.question.findMany({
    take: 1,
    skip,
    select: { id: true, title: true },
    orderBy: { id: "asc" },
  });

  if (!question) throw new ApiError(404, "No questions available for racing");
  return question;
}

/**
 * Match a user into an active race or start a new one on a random question.
 */
export async function quickMatch({
  userId,
  username,
  maxParticipants = DEFAULT_MAX_PARTICIPANTS,
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
    const question = await prisma.question.findUnique({
      where: { id: existing.competition.questionId },
      select: { id: true, title: true },
    });
    return {
      questionId: existing.competition.questionId,
      questionTitle: question?.title ?? null,
      competition: serializeCompetition(existing.competition, userId),
      matchedExisting: true,
    };
  }

  const actives = await prisma.questionCompetition.findMany({
    where: { status: "active" },
    include: competitionInclude,
    orderBy: { createdAt: "desc" },
  });

  const openRoom = actives
    .filter((c) => c.participants.length < c.maxParticipants)
    .sort((a, b) => b.participants.length - a.participants.length)[0];

  let questionId;
  let questionTitle = null;

  if (openRoom) {
    questionId = openRoom.questionId;
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { title: true },
    });
    questionTitle = question?.title ?? null;
  } else {
    const randomQuestion = await pickRandomQuestionId();
    questionId = randomQuestion.id;
    questionTitle = randomQuestion.title;
  }

  const competition = await joinCompetition({
    questionId,
    userId,
    username,
    maxParticipants,
  });

  return {
    questionId,
    questionTitle,
    competition,
    matchedExisting: false,
  };
}

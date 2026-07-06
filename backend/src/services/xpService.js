/**
 * Central XP: one UserXpAward row per awardKey (DB unique constraint).
 * Does not rely on String[] claim fields on User (those may be missing on old clients/DB).
 */

export function normalizeResourceId(id) {
  return String(id ?? "").trim();
}

export function buildAwardKey(type, resourceId) {
  return `${type}:${normalizeResourceId(resourceId)}`;
}

export const AWARD_TYPES = {
  incident: "incident",
  dsa: "dsa",
  simulation: "sim",
  system_design: "sd",
  browser: "browser",
};

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
export async function tryAwardXp(tx, {
  userId,
  awardKey,
  amount,
  fullSuccess,
}) {
  const xpAmount = Math.max(0, Math.round(Number(amount) || 0));
  const key = String(awardKey ?? "").trim();

  const readXp = async () => {
    const u = await tx.user.findUnique({
      where: { id: userId },
      select: { xp: true },
    });
    return u?.xp ?? 0;
  };

  if (!fullSuccess || xpAmount <= 0 || !key) {
    const existing = await tx.userXpAward.findUnique({
      where: { userId_awardKey: { userId, awardKey: key } },
    });
    return {
      xpEarned: 0,
      awarded: false,
      alreadyClaimed: Boolean(existing),
      totalXp: await readXp(),
    };
  }

  const existing = await tx.userXpAward.findUnique({
    where: { userId_awardKey: { userId, awardKey: key } },
  });

  if (existing) {
    return {
      xpEarned: 0,
      awarded: false,
      alreadyClaimed: true,
      totalXp: await readXp(),
    };
  }

  try {
    await tx.userXpAward.create({
      data: { userId, awardKey: key, xpAmount },
    });
  } catch (err) {
    if (err?.code === "P2002") {
      return {
        xpEarned: 0,
        awarded: false,
        alreadyClaimed: true,
        totalXp: await readXp(),
      };
    }
    throw err;
  }

  const updated = await tx.user.update({
    where: { id: userId },
    data: { xp: { increment: xpAmount } },
    select: { xp: true },
  });

  return {
    xpEarned: xpAmount,
    awarded: true,
    alreadyClaimed: false,
    totalXp: updated.xp,
  };
}

/** @deprecated use buildAwardKey + UserXpAward */
export function hasXpClaim(claims, resourceId) {
  const norm = normalizeResourceId(resourceId);
  return (claims ?? []).some((c) => normalizeResourceId(c) === norm);
}

export function isDsaFullSuccess(verdict) {
  return verdict === "accepted";
}

export function isSystemDesignFullSuccess(score, maxScore) {
  return maxScore > 0 && score >= maxScore;
}

function resolveIncidentActions(session, actionsTaken = []) {
  if (actionsTaken.length) return actionsTaken;
  if (Array.isArray(session.actions) && session.actions.length) {
    return session.actions.map((action) => ({
      actionId: action.actionKey,
      timestamp: action.timestamp,
      effective: action.effective,
    }));
  }
  return (session.actionsTaken || []).map((a) =>
    typeof a === "string" ? JSON.parse(a) : a,
  );
}

export function isIncidentFullSuccess(session, actionsTaken = []) {
  const actions = resolveIncidentActions(session, actionsTaken);
  return Boolean(session.correctDiagnosis) && actions.length > 0;
}

export function systemDesignXpAmount(difficulty, maxScore) {
  const tier = XP_BY_DIFFICULTY[difficulty?.toLowerCase()] ?? 100;
  return maxScore > 0 ? tier : 0;
}

const XP_BY_DIFFICULTY = { easy: 50, medium: 100, hard: 150 };

export function dsaXpAmount(level) {
  const l = level ?? "Easy";
  if (l === "Hard") return 50;
  if (l === "Medium") return 25;
  return 10;
}

/** Check if user already earned XP for this resource (for list UI). */
export async function hasUserXpAward(prismaClient, userId, awardKey) {
  const row = await prismaClient.userXpAward.findUnique({
    where: { userId_awardKey: { userId, awardKey } },
  });
  return Boolean(row);
}

export async function getIncidentAwardKeys(prismaClient, userId) {
  const rows = await prismaClient.userXpAward.findMany({
    where: { userId, awardKey: { startsWith: "incident:" } },
    select: { awardKey: true },
  });
  return new Set(
    rows.map((r) => normalizeResourceId(r.awardKey.replace(/^incident:/, ""))),
  );
}

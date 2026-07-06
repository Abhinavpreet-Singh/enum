/**
 * Persist every user submission attempt for the activity feed.
 */

export async function logUserActivity(tx, {
  userId,
  activityType,
  resourceId,
  resourceTitle = "",
  outcome,
  xpEarned = 0,
  score = null,
  maxScore = null,
  detail = "",
}) {
  return tx.userActivityLog.create({
    data: {
      userId,
      activityType,
      resourceId: String(resourceId),
      resourceTitle: resourceTitle.slice(0, 200),
      outcome,
      xpEarned: Math.max(0, Math.round(xpEarned)),
      score: score ?? undefined,
      maxScore: maxScore ?? undefined,
      detail: detail.slice(0, 500),
    },
  });
}

export function outcomeFromDsaVerdict(verdict) {
  if (verdict === "accepted") return "correct";
  if (verdict === "partial") return "partial";
  return "incorrect";
}

export function outcomeFromSystemDesign(score, maxScore) {
  if (maxScore <= 0) return "incorrect";
  if (score >= maxScore) return "correct";
  if (score > 0) return "partial";
  return "incorrect";
}

function resolveIncidentActions(session, actionsTaken = []) {
  if (actionsTaken?.length) return actionsTaken;
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

export function outcomeFromIncident(session, actionsTaken) {
  const actions = resolveIncidentActions(session, actionsTaken);
  if (session.correctDiagnosis && actions.length > 0) return "correct";
  if (session.correctDiagnosis || actions.length > 0) return "partial";
  return "incorrect";
}

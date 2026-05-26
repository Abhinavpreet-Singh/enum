import type { IncidentActionOption } from "@/types/incident";

/** How many remediation actions a player may execute per run. */
export const MAX_REMEDIATION_ACTIONS = 1;

export type RemediationImpact = "best" | "good" | "partial" | "low";

export interface RemediationMeta {
  impact: RemediationImpact;
  summary: string;
  detail: string;
}

const REMEDIATION_META: Record<string, RemediationMeta> = {
  rollback_deployment: {
    impact: "best",
    summary: "Full recovery — removes faulty deploy",
    detail:
      "Rolling back v2.4.1 removes the bad validation rule entirely. CPU, errors, and latency recover because the root cause is gone.",
  },
  bypass_regex: {
    impact: "good",
    summary: "Fast mitigation — disables the bad rule",
    detail:
      "Feature-flagging the new rule stops backtracking without a full rollback. Strong choice when rollback pipeline is slow, but leaves other v2.4.1 changes live.",
  },
  restart_processing: {
    impact: "partial",
    summary: "Temporary relief — issue returns under load",
    detail:
      "Restarting workers clears stuck processes briefly. The regex rule is still deployed, so catastrophic backtracking will return as traffic hits validation again.",
  },
  scale_up_api: {
    impact: "low",
    summary: "Masks symptoms — does not fix validation CPU",
    detail:
      "Adding API capacity does not stop runaway regex work in the processing tier. Errors may drop at the edge while core CPU stays saturated.",
  },
  drain_cache: {
    impact: "low",
    summary: "Unrelated to validation path failure",
    detail:
      "Cache flush does not address deploy-induced validation backtracking. Useful for cache issues, not this incident.",
  },
};

const IMPACT_LABEL: Record<RemediationImpact, string> = {
  best: "Best fit",
  good: "Good",
  partial: "Partial",
  low: "Low impact",
};

const IMPACT_ORDER: Record<RemediationImpact, number> = {
  best: 0,
  good: 1,
  partial: 2,
  low: 3,
};

export function getRemediationMeta(action: IncidentActionOption): RemediationMeta {
  return (
    REMEDIATION_META[action.id] ?? {
      impact: action.pointsIfCorrect >= 80 ? "good" : "partial",
      summary: action.description,
      detail: action.description,
    }
  );
}

export function getImpactLabel(impact: RemediationImpact): string {
  return IMPACT_LABEL[impact];
}

export function sortActionsByFit(
  actions: IncidentActionOption[],
): IncidentActionOption[] {
  return [...actions].sort(
    (a, b) =>
      IMPACT_ORDER[getRemediationMeta(a).impact] -
      IMPACT_ORDER[getRemediationMeta(b).impact],
  );
}

export function buildRemediationDebrief(
  actions: IncidentActionOption[],
  chosenActionId: string | undefined,
): {
  chosen: IncidentActionOption | null;
  chosenMeta: RemediationMeta | null;
  comparisons: Array<{
    action: IncidentActionOption;
    meta: RemediationMeta;
    isChosen: boolean;
  }>;
} {
  const sorted = sortActionsByFit(actions);
  const chosen = chosenActionId
    ? actions.find((a) => a.id === chosenActionId) ?? null
    : null;
  const chosenMeta = chosen ? getRemediationMeta(chosen) : null;

  return {
    chosen,
    chosenMeta,
    comparisons: sorted.map((action) => ({
      action,
      meta: getRemediationMeta(action),
      isChosen: action.id === chosenActionId,
    })),
  };
}

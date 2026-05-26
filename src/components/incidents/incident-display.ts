import type { IncidentRootCauseOption, IncidentSimulation } from "@/types/incident";

const NEUTRAL_SITUATION =
  "P1: Error rate and latency jumped after deploy v2.4.1. Processing CPU is climbing and gateways are timing out. Check logs, metrics, and the service map — what failed?";

/** Incident-aligned labels (regex OK here — not in the brief). */
const HYPOTHESIS_LABELS: Record<string, string> = {
  regex_backtracking:
    "Regex catastrophic backtracking in the validation engine",
  database_overload: "Database connection pool exhaustion",
  database_load: "Database connection pool exhaustion",
  memory_leak: "Memory pressure / eviction storm in cache tier",
  ddos_attack: "Abnormal external traffic (possible DDoS)",
};

export function getIncidentDisplayTitle(incident: IncidentSimulation): string {
  if (/regex catastrophe/i.test(incident.title)) {
    return "Production Outage — v2.4.1";
  }
  return incident.title;
}

export function getSituationBrief(incident: IncidentSimulation): string {
  if (
    /regex/i.test(incident.title) ||
    /regex/i.test(incident.description) ||
    /malformed pattern/i.test(incident.description)
  ) {
    return NEUTRAL_SITUATION;
  }
  return incident.description;
}

export function formatIncidentCode(index: number): string {
  return `INCIDENT ${String(index + 1).padStart(2, "0")}`;
}

export function getHypothesisLabel(option: IncidentRootCauseOption): string {
  if (HYPOTHESIS_LABELS[option.id]) {
    return HYPOTHESIS_LABELS[option.id];
  }
  if (/regex|backtracking/i.test(option.title)) {
    return "Regex catastrophic backtracking in the validation engine";
  }
  return option.title;
}

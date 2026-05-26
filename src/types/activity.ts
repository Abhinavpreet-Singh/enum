export interface ActivityLogEntry {
  id: string;
  activityType: string;
  resourceTitle: string;
  outcome: "correct" | "partial" | "incorrect";
  xpEarned: number;
  score?: number | null;
  maxScore?: number | null;
  detail?: string;
  createdAt: string;
}

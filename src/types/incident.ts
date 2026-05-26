/**
 * TypeScript types for Historical Incident Simulations - Full Scale with Resolution
 */

export interface IncidentService {
  id: string; /// Service identifier (e.g., "frontend", "api")
  name: string; /// Display name
  status: "healthy" | "degraded" | "critical" | "down";
  color: string; /// Hex color or Tailwind color name
}

export interface IncidentMetricSnapshot {
  timestamp: number; /// Seconds since simulation start
  value: number; /// Metric value (percentage, ms, requests/sec, etc.)
}

export interface IncidentMetrics {
  [key: string]: IncidentMetricSnapshot[]; /// e.g., { "cpu_usage": [...], "error_rate": [...] }
}

export interface IncidentTimelineEvent {
  id: string;
  incidentId: string;
  timeSecond: number;
  title: string;
  description: string;
  affectedServices: string[];
  metricChanges: Record<string, number>;
  logMessage: string;
  priority: "info" | "warning" | "critical";
  createdAt: string;
  updatedAt: string;
}

export interface IncidentRootCauseOption {
  id: string;
  title: string;
  description: string;
  isCorrect: boolean;
  hint: string;
}

export interface IncidentActionOption {
  id: string;
  title: string;
  description: string;
  category: "rollback" | "restart" | "scale" | "investigate";
  fixesMetrics: string[];
  recoveryTime: number;
  pointsIfCorrect: number;
  pointsIfWrong: number;
}

export interface IncidentSimulation {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  simulationType: string;
  durationSeconds: number;
  estimatedTime: number; /// In minutes
  xpReward: number;
  tags: string[];

  /// Initial state
  initialServices: IncidentService[];
  initialMetrics: IncidentMetrics;
  initialLogs: string[];

  /// Real incident inspiration
  realIncidentName: string;
  realIncidentDate: string;
  realIncidentLink: string;
  realIncidentDesc: string;

  /// Reveal screen
  revealTitle: string;
  revealText: string;

  /// Diagnosis & Resolution
  rootCauseOptions: IncidentRootCauseOption[];
  actionOptions: IncidentActionOption[];

  /// Relations (if included in response)
  sessions?: IncidentSession[];
  timelineEvents?: IncidentTimelineEvent[];

  createdAt: string;
  updatedAt: string;
}

export interface IncidentSessionState {
  id: string;
  sessionId: string;
  currentTime: number;
  services: IncidentService[];
  metrics: IncidentMetrics;
  logs: string[];
  activeAlerts: string[];
  updatedAt: string;
}

export interface IncidentActionRecord {
  actionId: string;
  timestamp: number;
  effective: boolean;
}

export interface IncidentSession {
  id: string;
  userId: string;
  incidentId: string;
  elapsedTime: number;
  isActive: boolean;
  isCompleted: boolean;
  
  /// Diagnosis phase
  selectedRootCauseId: string;
  diagnosedAt: string | null;
  correctDiagnosis: boolean;
  
  /// Actions taken
  actionsTaken: IncidentActionRecord[];
  
  /// Scoring
  diagnosticScore: number;
  actionScore: number;
  timeBonusScore: number;
  totalScore: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface IncidentWorkspaceProps {
  incident: IncidentSimulation;
  session: IncidentSession;
  state: IncidentSessionState;
  onTick: () => Promise<void>;
  onAction: (actionType: string, targetService?: string) => Promise<void>;
  onComplete: (rootCauseId: string) => Promise<void>;
}

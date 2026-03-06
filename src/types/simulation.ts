/** Represents a single file node in the file tree */
export interface FileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  language?: string;
  children?: FileNode[];
}

/** Flat file map: path → content */
export type FileMap = Record<string, string>;

/** Request payload for /api/simulations/run */
export interface SimulationRunRequest {
  files: FileMap;
  entryFile: string;
  simulationId?: string;
}

/** Response from /api/simulations/run */
export interface SimulationRunResponse {
  success: boolean;
  output: string;
  error?: string;
}

/** Response from the backend simulation engine */
export interface SimulationEngineResponse {
  score: number;
  passedTests: number;
  totalTests: number;
  logs: string;
  submissionId: string;
}

/** Status of a simulation attempt */
export type SimulationStatus = "idle" | "running" | "success" | "error";

/** User progress for a simulation */
export interface UserSimulationProgress {
  userId: string;
  simulationId: string;
  solved: boolean;
  attempts: number;
  lastAttemptAt: string | null;
  modifiedFiles: FileMap | null;
}

/** Cloudinary-backed file reference */
export interface CloudinaryFileRef {
  filename: string;
  path: string;
  cloudinaryUrl: string;
  cloudinaryPublicId?: string;
  language?: string;
}
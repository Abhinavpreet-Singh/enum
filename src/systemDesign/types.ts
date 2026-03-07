import { Node, Edge } from "reactflow";
import { ComponentConfig } from "./systemComponents";

export interface SystemDesignNodeData {
  label: string;
  componentId: string;
  icon: string;
  config: ComponentConfig;
}

export type SystemDesignNode = Node<SystemDesignNodeData>;
export type SystemDesignEdge = Edge;

export interface ArchitectureExport {
  simulationId: string;
  nodes: SystemDesignNode[];
  edges: SystemDesignEdge[];
  explanation: string;
}

export interface EvaluationResult {
  score: number;
  maxScore: number;
  feedback: FeedbackItem[];
}

export interface FeedbackItem {
  rule: string;
  passed: boolean;
  message: string;
}

export interface ReplayEvent {
  type: "node_add" | "node_remove" | "edge_add" | "edge_remove" | "config_change";
  timestamp: number;
  data: Record<string, unknown>;
}

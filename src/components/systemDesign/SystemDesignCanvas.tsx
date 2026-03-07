"use client";

import React, {
  useCallback,
  useRef,
  useState,
  useEffect,
  DragEvent,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  ReactFlowInstance,
  OnSelectionChangeParams,
} from "reactflow";
import "reactflow/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import { NODE_TYPES } from "./ArchitectureNode";
import type {
  SystemDesignNode,
  SystemDesignEdge,
  SystemDesignNodeData,
  ReplayEvent,
} from "@/systemDesign";

export interface CanvasHandle {
  exportGraph: () => {
    nodes: SystemDesignNode[];
    edges: SystemDesignEdge[];
  };
  getReplayEvents: () => ReplayEvent[];
}

interface SystemDesignCanvasProps {
  onNodeSelect?: (node: SystemDesignNode | null) => void;
}

function CanvasInner(
  { onNodeSelect }: SystemDesignCanvasProps,
  ref: React.Ref<CanvasHandle>
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<SystemDesignNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const replayLog = useRef<ReplayEvent[]>([]);

  const nodeTypes = useMemo(() => NODE_TYPES, []);

  // ---------- Replay logging ----------
  const logEvent = useCallback((event: ReplayEvent) => {
    replayLog.current.push(event);
  }, []);

  // ---------- Listen for config changes from NodeConfigPanel ----------
  useEffect(() => {
    function handleConfigChange(e: Event) {
      const { nodeId, config } = (e as CustomEvent).detail;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, config } } : n
        )
      );
      logEvent({
        type: "config_change",
        timestamp: Date.now(),
        data: { nodeId, config },
      });
    }
    window.addEventListener("sd:config-change", handleConfigChange);
    return () =>
      window.removeEventListener("sd:config-change", handleConfigChange);
  }, [setNodes, logEvent]);

  // ---------- Imperative handle for parent ----------
  useImperativeHandle(ref, () => ({
    exportGraph() {
      if (!rfInstance) return { nodes: [], edges: [] };
      const obj = rfInstance.toObject();
      return {
        nodes: obj.nodes as SystemDesignNode[],
        edges: obj.edges as SystemDesignEdge[],
      };
    },
    getReplayEvents() {
      return [...replayLog.current];
    },
  }));

  // ---------- Edge connection ----------
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
      logEvent({
        type: "edge_add",
        timestamp: Date.now(),
        data: { source: params.source, target: params.target },
      });
    },
    [setEdges, logEvent]
  );

  // ---------- Drop handler ----------
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/reactflow");
      if (!raw || !rfInstance || !wrapperRef.current) return;

      const { componentId, label, icon, config } = JSON.parse(raw) as {
        componentId: string;
        label: string;
        icon: string;
        config: Record<string, string | number | boolean>;
      };

      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = rfInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNode: SystemDesignNode = {
        id: uuidv4(),
        type: componentId,
        position,
        data: { label, componentId, icon, config },
      };

      setNodes((nds) => [...nds, newNode]);
      logEvent({
        type: "node_add",
        timestamp: Date.now(),
        data: { nodeId: newNode.id, componentId, position },
      });
    },
    [rfInstance, setNodes, logEvent]
  );

  // ---------- Selection ----------
  const onSelectionChange = useCallback(
    ({ nodes: selected }: OnSelectionChangeParams) => {
      onNodeSelect?.(
        selected.length === 1 ? (selected[0] as SystemDesignNode) : null
      );
    },
    [onNodeSelect]
  );

  // ---------- Delete key ----------
  const onNodesDelete = useCallback(
    (deleted: SystemDesignNode[]) => {
      deleted.forEach((n) =>
        logEvent({
          type: "node_remove",
          timestamp: Date.now(),
          data: { nodeId: n.id },
        })
      );
    },
    [logEvent]
  );

  const onEdgesDelete = useCallback(
    (deleted: SystemDesignEdge[]) => {
      deleted.forEach((e) =>
        logEvent({
          type: "edge_remove",
          timestamp: Date.now(),
          data: { edgeId: e.id },
        })
      );
    },
    [logEvent]
  );

  return (
    <div ref={wrapperRef} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setRfInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onSelectionChange={onSelectionChange}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        className="bg-gray-50 dark:bg-gray-950"
      >
        <Controls className="!bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700 !shadow-lg" />
        <MiniMap
          className="!bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700"
          nodeColor="#3b82f6"
          maskColor="rgba(0,0,0,0.1)"
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="#d1d5db"
        />
      </ReactFlow>
    </div>
  );
}

const CanvasWithRef = forwardRef(CanvasInner);

const SystemDesignCanvas = forwardRef<CanvasHandle, SystemDesignCanvasProps>(
  (props, ref) => (
    <ReactFlowProvider>
      <CanvasWithRef ref={ref} {...props} />
    </ReactFlowProvider>
  )
);

SystemDesignCanvas.displayName = "SystemDesignCanvas";

export default SystemDesignCanvas;

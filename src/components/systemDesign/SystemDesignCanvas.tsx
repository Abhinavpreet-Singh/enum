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
  onGraphChange?: (nodes: SystemDesignNode[], edges: SystemDesignEdge[]) => void;
}

function CanvasInner(
  { onNodeSelect, onGraphChange }: SystemDesignCanvasProps,
  ref: React.Ref<CanvasHandle>,
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<SystemDesignNodeData>(
    [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const replayLog = useRef<ReplayEvent[]>([]);

  // Trigger real-time callback when nodes or edges change
  useEffect(() => {
    onGraphChange?.(nodes as SystemDesignNode[], edges as SystemDesignEdge[]);
  }, [nodes, edges, onGraphChange]);

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
          n.id === nodeId ? { ...n, data: { ...n.data, config } } : n,
        ),
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
    [setEdges, logEvent],
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
    [rfInstance, setNodes, logEvent],
  );

  // ---------- Selection ----------
  const onSelectionChange = useCallback(
    ({ nodes: selected }: OnSelectionChangeParams) => {
      onNodeSelect?.(
        selected.length === 1 ? (selected[0] as SystemDesignNode) : null,
      );
    },
    [onNodeSelect],
  );

  // ---------- Delete key ----------
  const onNodesDelete = useCallback(
    (deleted: SystemDesignNode[]) => {
      deleted.forEach((n) =>
        logEvent({
          type: "node_remove",
          timestamp: Date.now(),
          data: { nodeId: n.id },
        }),
      );
    },
    [logEvent],
  );

  const onEdgesDelete = useCallback(
    (deleted: SystemDesignEdge[]) => {
      deleted.forEach((e) =>
        logEvent({
          type: "edge_remove",
          timestamp: Date.now(),
          data: { edgeId: e.id },
        }),
      );
    },
    [logEvent],
  );

  const onEdgeDoubleClick = useCallback(
    (event: React.MouseEvent, edge: any) => {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      logEvent({
        type: "edge_remove",
        timestamp: Date.now(),
        data: { edgeId: edge.id },
      });
    },
    [setEdges, logEvent],
  );

  return (
    <div ref={wrapperRef} className="w-full h-full">
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
        onEdgeDoubleClick={onEdgeDoubleClick}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 80, y: 60, zoom: 0.65 }}
        minZoom={0.2}
        maxZoom={2}
        deleteKeyCode={["Backspace", "Delete"]}
        proOptions={{ hideAttribution: true }}
        className="bg-[#fafafa] dark:bg-[#0c0c0c]"
      >
        <Controls
          position="bottom-right"
          showInteractive={false}
          className="bg-white! dark:bg-[#1a1a1a]! border! border-gray-200! dark:border-white/10! shadow-none! rounded-none!"
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(148,163,184,0.4)"
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
  ),
);

SystemDesignCanvas.displayName = "SystemDesignCanvas";

export default SystemDesignCanvas;

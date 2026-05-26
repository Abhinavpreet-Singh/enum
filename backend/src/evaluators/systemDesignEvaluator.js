/**
 * System Design Evaluator
 *
 * Scores a user-submitted architecture graph against a set of rules
 * defined per simulation.
 *
 * Rule types:
 *   - requiredComponent  → checks that a node of the given componentId exists
 *   - requiredEdge       → checks that an edge "source→target" (by componentId) exists
 */

/**
 * @param {{ nodes: Array, edges: Array }} graph   – ReactFlow export
 * @param {Array<{ description: string, requiredComponent: string, requiredEdge: string, points: number }>} rules
 * @param {number} maxScore
 * @returns {{ score: number, maxScore: number, feedback: Array<{ rule: string, passed: boolean, message: string }> }}
 */
export function evaluateSystemDesign(graph, rules, maxScore) {
  const { nodes = [], edges = [] } = graph;

  // Build lookup: componentId → array of node ids
  const componentToNodeIds = {};
  for (const node of nodes) {
    const cid = node.data?.componentId;
    if (!cid) continue;
    if (!componentToNodeIds[cid]) componentToNodeIds[cid] = [];
    componentToNodeIds[cid].push(node.id);
  }

  // Build edge lookup: Set of "sourceNodeId→targetNodeId"
  const edgeSet = new Set();
  for (const edge of edges) {
    edgeSet.add(`${edge.source}→${edge.target}`);
  }

  // Also build component-level edge set: "srcComponentId→tgtComponentId"
  const componentEdgeSet = new Set();
  const nodeIdToComponent = {};
  for (const node of nodes) {
    nodeIdToComponent[node.id] = node.data?.componentId;
  }
  for (const edge of edges) {
    const src = nodeIdToComponent[edge.source];
    const tgt = nodeIdToComponent[edge.target];
    if (src && tgt) {
      componentEdgeSet.add(`${src}→${tgt}`);
    }
  }

  let score = 0;
  const feedback = [];

  for (const rule of rules) {
    const points = rule.points || 1;

    // --- Required component ---
    if (rule.requiredComponent) {
      const found = !!componentToNodeIds[rule.requiredComponent];
      if (found) score += points;
      feedback.push({
        rule: rule.description || `Component: ${rule.requiredComponent}`,
        passed: found,
        message: found
          ? `${rule.requiredComponent} is present`
          : `Missing required component: ${rule.requiredComponent}`,
      });
    }

    // --- Required edge ---
    if (rule.requiredEdge) {
      const found = componentEdgeSet.has(rule.requiredEdge);
      if (found) score += points;
      feedback.push({
        rule: rule.description || `Connection: ${rule.requiredEdge}`,
        passed: found,
        message: found
          ? `Connection ${rule.requiredEdge} exists`
          : `Missing connection: ${rule.requiredEdge}`,
      });
    }
  }

  // --- Additional Topological & Best-Practice connection audits & point deductions ---
  const hasClient = !!componentToNodeIds["client"];
  const hasDb = !!componentToNodeIds["database"];
  const hasCache = !!componentToNodeIds["cache"];
  const hasLB = !!componentToNodeIds["load_balancer"];
  const hasAPI = !!componentToNodeIds["api_server"];
  const hasQueue = !!componentToNodeIds["message_queue"];
  const hasCDN = !!componentToNodeIds["cdn"];

  let deductions = 0;

  // 1. Direct Database Exposure Check (Database connected to Client, LB, or CDN)
  if (hasDb) {
    const directDbLink = edges.some(e => {
      const srcCid = nodeIdToComponent[e.source];
      const tgtCid = nodeIdToComponent[e.target];
      return (
        (srcCid === "database" && (tgtCid === "client" || tgtCid === "load_balancer" || tgtCid === "cdn")) ||
        (tgtCid === "database" && (srcCid === "client" || srcCid === "load_balancer" || srcCid === "cdn"))
      );
    });

    if (directDbLink) {
      deductions += 3;
    }

    feedback.push({
      rule: "Security Audit: Direct Database Isolation",
      passed: !directDbLink,
      message: !directDbLink
        ? "Excellent. Core Database is secure from direct client or edge (LB/CDN) ingress."
        : "Vulnerability: Core Database connects directly to Client, Load Balancer, or CDN! Bypasses API auth layer. (Deducted 3 points)",
    });
  }

  // 2. Direct Cache Exposure Check (Cache connected to Client, LB, or CDN)
  if (hasCache) {
    const directCacheLink = edges.some(e => {
      const srcCid = nodeIdToComponent[e.source];
      const tgtCid = nodeIdToComponent[e.target];
      return (
        (srcCid === "cache" && (tgtCid === "client" || tgtCid === "load_balancer" || tgtCid === "cdn")) ||
        (tgtCid === "cache" && (srcCid === "client" || srcCid === "load_balancer" || srcCid === "cdn"))
      );
    });

    if (directCacheLink) {
      deductions += 1;
    }

    feedback.push({
      rule: "Security Audit: Client Cache Access Isolation",
      passed: !directCacheLink,
      message: !directCacheLink
        ? "Excellent. In-memory Cache is protected behind backend API layer."
        : "Security Risk: In-memory Cache connects directly to Client, Load Balancer, or CDN! (Deducted 1 point)",
    });
  }

  // 3. Direct Message Queue Exposure Check (Queue connected to Client, LB, or CDN)
  if (hasQueue) {
    const directQueueLink = edges.some(e => {
      const srcCid = nodeIdToComponent[e.source];
      const tgtCid = nodeIdToComponent[e.target];
      return (
        (srcCid === "message_queue" && (tgtCid === "client" || tgtCid === "load_balancer" || tgtCid === "cdn")) ||
        (tgtCid === "message_queue" && (srcCid === "client" || srcCid === "load_balancer" || srcCid === "cdn"))
      );
    });

    if (directQueueLink) {
      deductions += 2;
    }

    feedback.push({
      rule: "Security Audit: Message Queue Ingress Protection",
      passed: !directQueueLink,
      message: !directQueueLink
        ? "Excellent. Message Broker is safe inside the internal application perimeter."
        : "Design Failure: Message broker is connected directly to Client, Load Balancer, or CDN! (Deducted 2 points)",
    });
  }

  // 4. Single Point of Failure (Client straight to API with no Load Balancer)
  if (hasClient && hasAPI) {
    const directApiLink = edges.some(e => {
      const srcCid = nodeIdToComponent[e.source];
      const tgtCid = nodeIdToComponent[e.target];
      return (srcCid === "client" && tgtCid === "api_server") || (srcCid === "api_server" && tgtCid === "client");
    });

    if (directApiLink && !hasLB) {
      deductions += 1;
    }

    feedback.push({
      rule: "Reliability Audit: Ingress Load Balancing",
      passed: !(directApiLink && !hasLB),
      message: !(directApiLink && !hasLB)
        ? "Good job. Client queries are load balanced or designed with reliability in mind."
        : "Single Point of Failure: Direct client connection to API Server. Consider adding a Load Balancer. (Deducted 1 point)",
    });
  }

  // 5. Disconnected Components Audit
  const connectedNodeIds = new Set();
  for (const edge of edges) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }
  
  let orphanCount = 0;
  for (const node of nodes) {
    const cid = node.data?.componentId;
    const label = node.data?.label || cid;
    if (cid && !connectedNodeIds.has(node.id)) {
      orphanCount++;
      feedback.push({
        rule: `Topology Audit: Connected component: ${label}`,
        passed: false,
        message: `Orphan Component: Node '${label}' is completely disconnected! (Deducted 1 point)`,
      });
    }
  }
  deductions += orphanCount;

  // Subtract deductions and clamp score
  score = score - deductions;
  if (score < 0) score = 0;
  if (score > maxScore) score = maxScore;

  return { score, maxScore, feedback };
}

/**
 * Pre-built rule sets for common system design problems.
 * Used as defaults when a simulation doesn't define custom rules.
 */
export const PRESET_RULES = {
  url_shortener: {
    maxScore: 10,
    rules: [
      { description: "Client included", requiredComponent: "client", requiredEdge: "", points: 1 },
      { description: "Load balancer included", requiredComponent: "load_balancer", requiredEdge: "", points: 2 },
      { description: "API server included", requiredComponent: "api_server", requiredEdge: "", points: 1 },
      { description: "Database included", requiredComponent: "database", requiredEdge: "", points: 2 },
      { description: "Cache included", requiredComponent: "cache", requiredEdge: "", points: 1 },
      { description: "Client → Load Balancer", requiredComponent: "", requiredEdge: "client→load_balancer", points: 1 },
      { description: "Load Balancer → API Server", requiredComponent: "", requiredEdge: "load_balancer→api_server", points: 1 },
      { description: "API Server → Database", requiredComponent: "", requiredEdge: "api_server→database", points: 1 },
    ],
  },

  chat_system: {
    maxScore: 12,
    rules: [
      { description: "Client included", requiredComponent: "client", requiredEdge: "", points: 1 },
      { description: "Load balancer included", requiredComponent: "load_balancer", requiredEdge: "", points: 1 },
      { description: "API server included", requiredComponent: "api_server", requiredEdge: "", points: 1 },
      { description: "Database included", requiredComponent: "database", requiredEdge: "", points: 2 },
      { description: "Cache included", requiredComponent: "cache", requiredEdge: "", points: 1 },
      { description: "Message queue included", requiredComponent: "message_queue", requiredEdge: "", points: 2 },
      { description: "Client → Load Balancer", requiredComponent: "", requiredEdge: "client→load_balancer", points: 1 },
      { description: "Load Balancer → API Server", requiredComponent: "", requiredEdge: "load_balancer→api_server", points: 1 },
      { description: "API Server → Message Queue", requiredComponent: "", requiredEdge: "api_server→message_queue", points: 1 },
      { description: "API Server → Database", requiredComponent: "", requiredEdge: "api_server→database", points: 1 },
    ],
  },
};

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

  // Clamp score
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

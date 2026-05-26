import { SystemDesignNode, SystemDesignEdge } from "./types";

export interface AuditCheckResult {
  id: string;
  type: "error" | "warning" | "optimization" | "requirement";
  category: "security" | "scalability" | "caching" | "topology" | "requirement";
  title: string;
  message: string;
  passed: boolean;
}

export function analyzeArchitecture(
  nodes: SystemDesignNode[],
  edges: SystemDesignEdge[],
  evaluationRules?: Array<{
    description: string;
    requiredComponent: string;
    requiredEdge: string;
    points: number;
  }>
): AuditCheckResult[] {
  const results: AuditCheckResult[] = [];

  // Helper lookups
  const nodeIdToComponentId: Record<string, string> = {};
  const nodeIdToLabel: Record<string, string> = {};
  nodes.forEach((n) => {
    if (n.data?.componentId) {
      nodeIdToComponentId[n.id] = n.data.componentId;
      nodeIdToLabel[n.id] = n.data.label || n.data.componentId;
    }
  });

  const hasComponent = (cid: string) =>
    nodes.some((n) => n.data?.componentId === cid);

  const hasEdge = (srcCid: string, tgtCid: string) => {
    return edges.some((e) => {
      const s = nodeIdToComponentId[e.source];
      const t = nodeIdToComponentId[e.target];
      return (
        (s === srcCid && t === tgtCid) || (s === tgtCid && t === srcCid)
      );
    });
  };

  // 1. Dynamic Simulation Requirements Checks
  if (evaluationRules && evaluationRules.length > 0) {
    evaluationRules.forEach((rule, idx) => {
      const id = `req-${idx}`;
      if (rule.requiredComponent) {
        const passed = hasComponent(rule.requiredComponent);
        results.push({
          id,
          type: "requirement",
          category: "requirement",
          title: rule.description || `Include ${rule.requiredComponent}`,
          message: passed
            ? `${rule.requiredComponent} is present on the canvas.`
            : `Add the ${rule.requiredComponent} component to your canvas.`,
          passed,
        });
      } else if (rule.requiredEdge) {
        // Required edge format e.g. "client→load_balancer"
        const parts = rule.requiredEdge.split("→");
        if (parts.length === 2) {
          const [srcCid, tgtCid] = parts;
          const passed = hasEdge(srcCid, tgtCid);
          results.push({
            id,
            type: "requirement",
            category: "requirement",
            title: rule.description || `Connect ${srcCid} to ${tgtCid}`,
            message: passed
              ? `Connection between ${srcCid} and ${tgtCid} is established.`
              : `Create an edge connecting the ${srcCid} and ${tgtCid} components.`,
            passed,
          });
        }
      }
    });
  }

  // 2. Security Audits
  const clients = nodes.filter((n) => n.data?.componentId === "client");
  const databases = nodes.filter((n) => n.data?.componentId === "database");
  const caches = nodes.filter((n) => n.data?.componentId === "cache");
  const loadBalancers = nodes.filter((n) => n.data?.componentId === "load_balancer");
  const cdns = nodes.filter((n) => n.data?.componentId === "cdn");

  // A. Direct Client-to-Database / LB-to-Database / CDN-to-Database
  if (databases.length > 0) {
    const directDbLinks = edges.filter((e) => {
      const s = nodeIdToComponentId[e.source];
      const t = nodeIdToComponentId[e.target];
      return (
        (s === "database" && (t === "client" || t === "load_balancer" || t === "cdn")) ||
        (t === "database" && (s === "client" || s === "load_balancer" || s === "cdn"))
      );
    });

    results.push({
      id: "sec-db-exposure",
      type: directDbLinks.length > 0 ? "error" : "requirement",
      category: "security",
      title: "Direct Client Database Access",
      message: directDbLinks.length > 0
        ? "Critical Security Vulnerability: Core Database is connected directly to Client, Load Balancer, or CDN. This bypasses authentication/application layers, exposing query credentials."
        : "Database is secure from direct edge/client traffic.",
      passed: directDbLinks.length === 0,
    });
  }

  // B. Direct Client-to-Cache / LB-to-Cache / CDN-to-Cache
  if (caches.length > 0) {
    const directCacheLinks = edges.filter((e) => {
      const s = nodeIdToComponentId[e.source];
      const t = nodeIdToComponentId[e.target];
      return (
        (s === "cache" && (t === "client" || t === "load_balancer" || t === "cdn")) ||
        (t === "cache" && (s === "client" || s === "load_balancer" || s === "cdn"))
      );
    });

    results.push({
      id: "sec-cache-exposure",
      type: directCacheLinks.length > 0 ? "warning" : "requirement",
      category: "security",
      title: "Direct Client Cache Access",
      message: directCacheLinks.length > 0
        ? "Security Risk: Cache is connected directly to Client, Load Balancer, or CDN. Caches (like Redis) should sit behind API servers to govern authentication."
        : "In-memory Cache is protected from direct client queries.",
      passed: directCacheLinks.length === 0,
    });
  }

  // C. Direct Client-to-Queue / LB-to-Queue / CDN-to-Queue
  const queues = nodes.filter((n) => n.data?.componentId === "message_queue");
  if (queues.length > 0) {
    const directQueueLinks = edges.filter((e) => {
      const s = nodeIdToComponentId[e.source];
      const t = nodeIdToComponentId[e.target];
      return (
        (s === "message_queue" && (t === "client" || t === "load_balancer" || t === "cdn")) ||
        (t === "message_queue" && (s === "client" || s === "load_balancer" || s === "cdn"))
      );
    });

    results.push({
      id: "sec-queue-exposure",
      type: directQueueLinks.length > 0 ? "error" : "requirement",
      category: "security",
      title: "Message Queue Exposure",
      message: directQueueLinks.length > 0
        ? "Critical Design Issue: Message Queue connected directly to Client, CDN, or Load Balancer. Internals must be written/read via API servers."
        : "Message queue broker is isolated from external ingress.",
      passed: directQueueLinks.length === 0,
    });
  }

  // 3. Scalability / Reliability Audits
  // A. Single Point of Failure (Client straight to API Server with no Load Balancer)
  if (hasComponent("client") && hasComponent("api_server")) {
    const hasDirectApiLink = edges.some((e) => {
      const s = nodeIdToComponentId[e.source];
      const t = nodeIdToComponentId[e.target];
      return (
        (s === "client" && t === "api_server") ||
        (s === "api_server" && t === "client")
      );
    });
    const hasLB = hasComponent("load_balancer");

    results.push({
      id: "scal-single-point",
      type: hasDirectApiLink && !hasLB ? "warning" : "requirement",
      category: "scalability",
      title: "Client-facing Load Balancing",
      message: hasDirectApiLink && !hasLB
        ? "Single Point of Failure: Clients hit the API Server directly. Add a Load Balancer to distribute requests and manage ingress spike traffic."
        : hasLB
        ? "Traffic distributes via Load Balancer."
        : "Consider load balancing ingress client connections.",
      passed: !(hasDirectApiLink && !hasLB),
    });
  }

  // B. Disconnected (Orphan) Nodes
  const connectedNodeIds = new Set<string>();
  edges.forEach((e) => {
    connectedNodeIds.add(e.source);
    connectedNodeIds.add(e.target);
  });

  nodes.forEach((n) => {
    if (!connectedNodeIds.has(n.id)) {
      results.push({
        id: `topo-orphan-${n.id}`,
        type: "warning",
        category: "topology",
        title: `Disconnected ${n.data?.label || "Node"}`,
        message: `Orphan Component: '${n.data?.label || n.data?.componentId}' is on the canvas but has no connection edges. Connect it to the flow or remove it.`,
        passed: false,
      });
    }
  });

  // 4. Optimization / Caching Audits
  // A. Cache is on canvas but disconnected or not wired to servers/db
  if (hasComponent("cache")) {
    const cacheNodes = nodes.filter((n) => n.data?.componentId === "cache");
    cacheNodes.forEach((cNode) => {
      const cEdges = edges.filter(
        (e) => e.source === cNode.id || e.target === cNode.id
      );
      if (cEdges.length === 0) {
        // Handled by orphan check, do not repeat
      } else {
        // Check if connected to an api_server or database
        const connectedToValid = cEdges.some((e) => {
          const otherId = e.source === cNode.id ? e.target : e.source;
          const otherCid = nodeIdToComponentId[otherId];
          return otherCid === "api_server" || otherCid === "database";
        });

        if (!connectedToValid) {
          results.push({
            id: `opt-cache-wiring-${cNode.id}`,
            type: "optimization",
            category: "caching",
            title: "Optimize Caching Layer",
            message: "Suboptimal Caching: The Cache should connect to the API Server (application query logic) or Database to properly offload read latency.",
            passed: false,
          });
        }
      }
    });
  }

  // B. CDN static delivery optimization (useful if CDN is present)
  if (hasComponent("cdn")) {
    const cdnNodes = nodes.filter((n) => n.data?.componentId === "cdn");
    cdnNodes.forEach((cdnNode) => {
      const cdnEdges = edges.filter(
        (e) => e.source === cdnNode.id || e.target === cdnNode.id
      );
      const connectsToClient = cdnEdges.some((e) => {
        const otherId = e.source === cdnNode.id ? e.target : e.source;
        return nodeIdToComponentId[otherId] === "client";
      });

      if (!connectsToClient && cdnEdges.length > 0) {
        results.push({
          id: `opt-cdn-client-${cdnNode.id}`,
          type: "optimization",
          category: "caching",
          title: "Optimize Static Assets Delivery",
          message: "CDN bypass: The CDN is present but does not connect to the Client. Link the Client to CDN to enable edge-cached assets delivery.",
          passed: false,
        });
      }
    });
  }

  // C. Allowed Connection Pairs Matrix (Undirected)
  const ALLOWED_CONNECTIONS = new Set([
    "client-load_balancer",
    "client-cdn",
    "client-api_server",
    "load_balancer-client",
    "load_balancer-cdn",
    "load_balancer-api_server",
    "cdn-client",
    "cdn-load_balancer",
    "cdn-api_server",
    "api_server-client",
    "api_server-load_balancer",
    "api_server-cdn",
    "api_server-api_server",
    "api_server-cache",
    "api_server-database",
    "api_server-message_queue",
  ]);

  edges.forEach((e) => {
    const s = nodeIdToComponentId[e.source];
    const t = nodeIdToComponentId[e.target];
    if (s && t) {
      const key1 = `${s}-${t}`;
      const key2 = `${t}-${s}`;
      if (!ALLOWED_CONNECTIONS.has(key1) && !ALLOWED_CONNECTIONS.has(key2)) {
        results.push({
          id: `topo-violation-${e.id}`,
          type: "error",
          category: "topology",
          title: "Invalid Connection Path",
          message: `Structural Violation: Direct link between '${s}' and '${t}' is an architectural anti-pattern. Exposes internal services or bypasses application logic layers.`,
          passed: false,
        });
      }
    }
  });

  // D. Simulation-Specific Advanced Audits (Distributed Rate Limiter)
  const isRateLimiter = evaluationRules?.some(r => r.description?.toLowerCase().includes("rate limiter") || r.requiredComponent === "cache") ||
                        (typeof window !== "undefined" && window.location.pathname.includes("rate-limiter"));

  if (isRateLimiter) {
    // Check API Servers Configuration
    const apiServers = nodes.filter((n) => n.data?.componentId === "api_server");
    apiServers.forEach((api) => {
      const config = api.data?.config || {};
      const instances = Number(config.instances) || 1;
      const autoscaling = !!config.autoscaling;

      if (instances < 3 || !autoscaling) {
        results.push({
          id: `rate-lim-api-${api.id}`,
          type: "warning",
          category: "scalability",
          title: "Single Instance API Server",
          message: "Distributed Failure: For a real-world rate limiter, scale your API server to multiple instances (at least 3-4) and enable autoscaling to survive burst quota checks.",
          passed: false,
        });
      } else {
        results.push({
          id: `rate-lim-api-${api.id}`,
          type: "requirement",
          category: "scalability",
          title: "Scaled API Fleet",
          message: "Excellent. API servers are configured to scale horizontally.",
          passed: true,
        });
      }
    });

    // Check Redis Cache Configuration
    const redisCaches = nodes.filter((n) => n.data?.componentId === "cache");
    redisCaches.forEach((cache) => {
      const config = cache.data?.config || {};
      const replicas = Number(config.replicas) || 0;
      const sharding = !!config.sharding;

      if (replicas < 1 || !sharding) {
        results.push({
          id: `rate-lim-cache-${cache.id}`,
          type: "warning",
          category: "caching",
          title: "Single Node Redis Cache",
          message: "Availability Risk: Redis should use sharding and replication (replicas >= 1) to form a clustered setup, preventing rate limits from failing if a single node dies.",
          passed: false,
        });
      } else {
        results.push({
          id: `rate-lim-cache-${cache.id}`,
          type: "requirement",
          category: "caching",
          title: "Clustered Redis Setup",
          message: "Excellent. Redis is configured with sharding and replication for low-latency quotas.",
          passed: true,
        });
      }
    });

    // Check Database Hot-path Bypasses
    if (databases.length > 0) {
      const apiToDbEdge = edges.some((e) => {
        const s = nodeIdToComponentId[e.source];
        const t = nodeIdToComponentId[e.target];
        return (
          (s === "api_server" && t === "database") ||
          (t === "api_server" && s === "database")
        );
      });

      const apiToCacheEdge = edges.some((e) => {
        const s = nodeIdToComponentId[e.source];
        const t = nodeIdToComponentId[e.target];
        return (
          (s === "api_server" && t === "cache") ||
          (t === "api_server" && s === "cache")
        );
      });

      // If they only have database in the request path and no cache edge connected to api_server
      if (apiToDbEdge && !apiToCacheEdge) {
        results.push({
          id: "rate-lim-db-hotpath",
          type: "error",
          category: "security",
          title: "Hot-Path SQL Database Bottleneck",
          message: "Architectural Bottleneck: SQL Database is on the hot path for request counting. This adds massive query overhead (>2ms). Use in-memory Redis Cluster atomic operations (like INCR/Lua) instead.",
          passed: false,
        });
      }
    }
  }

  return results;
}

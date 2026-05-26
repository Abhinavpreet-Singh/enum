/**
 * Seed script for Historical Incident Simulations — v2
 *
 * USAGE: node scripts/seed-incidents-v2.js
 *
 * Three new incidents based on real-world outages:
 *   1. AWS S3 us-east-1 2017 — operator typo wiped core subsystems
 *   2. Fastly 2021 Global CDN — one customer config triggered a latent bug
 *   3. Facebook / Meta 2021 BGP — BGP withdrawal took every property offline
 *
 * DO NOT run automatically — only run manually when needed.
 */

import prisma from "../src/db/index.js";

// ─────────────────────────────────────────────
// INCIDENT 1 — AWS S3 Operator Typo (2017)
// ─────────────────────────────────────────────
const INCIDENT_AWS_S3 = {
  title: "Storage Cluster Collapse — Maintenance Gone Wrong",
  description:
    "P1: Object-storage reads and writes are failing across all tenants. " +
    "Dependent services (image pipeline, asset CDN, config loader) are returning 503s or hanging. " +
    "A maintenance window was opened 4 minutes ago. Use logs, metrics, and the timeline to find the cause — then pick one remediation.",
  difficulty: "hard",
  category: "incident",
  simulationType: "production",
  durationSeconds: 240,
  estimatedTime: 12,
  xpReward: 200,
  tags: ["storage", "operator-error", "maintenance", "cascading-failure", "on-call"],

  initialServices: [
    { id: "storage_primary",   name: "Object Storage (Primary)",  status: "healthy", color: "#10b981" },
    { id: "index_subsystem",   name: "Index Subsystem",           status: "healthy", color: "#10b981" },
    { id: "metadata_service",  name: "Metadata Service",          status: "healthy", color: "#10b981" },
    { id: "asset_cdn",         name: "Asset CDN",                 status: "healthy", color: "#10b981" },
    { id: "app_servers",       name: "Application Servers",       status: "healthy", color: "#10b981" },
    { id: "monitoring",        name: "Monitoring / Alerting",     status: "healthy", color: "#10b981" },
  ],

  initialMetrics: {
    storage_error_rate:  [{ timestamp: 0, value: 0.1 }],
    latency_ms:          [{ timestamp: 0, value: 38  }],
    requests_per_sec:    [{ timestamp: 0, value: 9200 }],
    healthy_node_count:  [{ timestamp: 0, value: 100  }],
  },

  initialLogs: [
    "[00:00] All storage subsystems nominal",
    "[00:00] Routine capacity maintenance window opened",
    "[00:01] Operator executing subsystem removal command",
    "[00:04] Command completed — verifying cluster state",
  ],

  realIncidentName:   "AWS S3 US-East-1 Outage",
  realIncidentDate:   "February 28, 2017",
  realIncidentLink:   "https://aws.amazon.com/message/41926/",
  realIncidentDesc:
    "During a routine debugging session for the S3 billing system, an AWS engineer " +
    "executed a command intended to remove a small number of servers from the index " +
    "and placement subsystems. Due to a typo, a far larger set of servers was removed " +
    "than intended. Both subsystems went below their minimum required capacity and could " +
    "not restart quickly, taking the entire S3 US-East-1 region offline for over 4 hours. " +
    "Because S3 underpins so much of AWS — including the health-dashboard itself — " +
    "monitoring and status pages also went dark, making diagnosis harder.",

  revealTitle: "Based on: AWS S3 US-East-1 Outage (Feb 28, 2017)",
  revealText:
    "On February 28, 2017, a single mistyped integer in a maintenance command caused " +
    "AWS to lose the entire S3 US-East-1 region for roughly 4 hours, taking down Slack, " +
    "Quora, Trello, and thousands of other services that depended on it. " +
    "\n\n" +
    "The fix was deceptively simple — restart the affected subsystems — but S3's index " +
    "and placement subsystems had not been fully restarted in years, so the restart " +
    "process itself was slow, forcing AWS to sit and wait while the internet noticed. " +
    "\n\n" +
    "Key lessons: (1) Runbook commands that accept a count parameter should have upper " +
    "bounds enforced server-side; (2) Monitoring systems must not share blast radius with " +
    "the infrastructure they monitor; (3) Critical subsystems should be regularly " +
    "exercised in staging to keep restart times predictable; (4) A 'safe mode' " +
    "minimum-quorum guard can prevent a cluster from accidentally going below capacity.",

  rootCauseOptions: [
    {
      id: "operator_typo",
      title: "Maintenance command removed too many subsystem nodes",
      description:
        "A count parameter was typed incorrectly, decommissioning far more index/placement " +
        "nodes than intended and dropping the cluster below quorum.",
      isCorrect: true,
      hint: "Cross-reference the operator command in the audit log with the node-count drop on the healthy_node_count metric.",
    },
    {
      id: "network_partition",
      title: "AZ-level network partition severed storage replicas",
      description:
        "A BGP route leak isolated one availability zone, causing replicas to diverge and " +
        "reads to fail during leader re-election.",
      isCorrect: false,
      hint: "A network partition would show asymmetric latency across AZs, not a uniform drop in healthy node count.",
    },
    {
      id: "disk_exhaustion",
      title: "Disk capacity exhausted on primary shard group",
      description:
        "Rapid ingestion during peak hours filled the primary shard group, causing write " +
        "failures that cascaded into read errors.",
      isCorrect: false,
      hint: "Disk exhaustion produces write errors first; check whether reads failed simultaneously or with a delay.",
    },
    {
      id: "certificate_expiry",
      title: "Internal mTLS certificate expired during rotation",
      description:
        "An automated certificate rotation job failed silently, causing storage nodes to " +
        "reject internal RPC calls after the old cert expired.",
      isCorrect: false,
      hint: "Certificate failures produce auth errors in the RPC layer, not a bulk node-count reduction.",
    },
  ],

  actionOptions: [
    {
      id: "restart_subsystems",
      title: "Restart index and placement subsystems",
      description:
        "Trigger a controlled restart of the under-capacity subsystems to rebuild quorum.",
      category: "restart",
      fixesMetrics: ["storage_error_rate", "latency_ms", "healthy_node_count"],
      recoveryTime: 90,
      pointsIfCorrect: 100,
      pointsIfWrong: 0,
    },
    {
      id: "failover_region",
      title: "Redirect all traffic to us-west-2",
      description: "Update DNS and load-balancer rules to serve from the secondary region.",
      category: "failover",
      fixesMetrics: ["storage_error_rate", "latency_ms"],
      recoveryTime: 30,
      pointsIfCorrect: 80,
      pointsIfWrong: 0,
    },
    {
      id: "scale_out",
      title: "Provision replacement nodes from warm pool",
      description:
        "Spin up pre-warmed standby nodes and re-join them to the subsystem ring.",
      category: "scale",
      fixesMetrics: ["healthy_node_count", "storage_error_rate"],
      recoveryTime: 120,
      pointsIfCorrect: 70,
      pointsIfWrong: 0,
    },
  ],
};

const TIMELINE_AWS_S3 = [
  {
    timeSecond: 0,
    title: "Maintenance window opens",
    description: "Operator begins routine capacity adjustment for billing debug",
    affectedServices: [],
    metricChanges: {},
    logMessage: "[00:00] Maintenance window: subsystem capacity adjustment",
    priority: "info",
  },
  {
    timeSecond: 4,
    title: "Command executes",
    description: "Removal command runs — count parameter larger than intended",
    affectedServices: ["index_subsystem"],
    metricChanges: { healthy_node_count: 62 },
    logMessage: "[00:04] WARN: 38 index nodes decommissioned (expected: 3)",
    priority: "warning",
  },
  {
    timeSecond: 18,
    title: "Index subsystem below quorum",
    description: "Index cluster drops below minimum node threshold",
    affectedServices: ["index_subsystem", "storage_primary"],
    metricChanges: { healthy_node_count: 41, storage_error_rate: 34 },
    logMessage: "[00:18] CRIT: index-subsystem quorum lost — writes queuing",
    priority: "critical",
  },
  {
    timeSecond: 32,
    title: "Metadata service degraded",
    description: "Metadata lookups time out as index becomes unavailable",
    affectedServices: ["metadata_service"],
    metricChanges: { latency_ms: 4800 },
    logMessage: "[00:32] ERR: metadata-service: index RPC timeout after 5s",
    priority: "critical",
  },
  {
    timeSecond: 45,
    title: "CDN origin pulls fail",
    description: "Asset CDN can no longer fetch objects; cache misses return 503",
    affectedServices: ["asset_cdn"],
    metricChanges: { storage_error_rate: 61 },
    logMessage: "[00:45] CRIT: CDN origin fetch error rate 61%",
    priority: "critical",
  },
  {
    timeSecond: 58,
    title: "Monitoring goes dark",
    description: "Alerting pipeline itself reads from S3; dashboards stop updating",
    affectedServices: ["monitoring"],
    metricChanges: {},
    logMessage: "[00:58] WARN: metrics ingestion stalled — S3 write path unavailable",
    priority: "warning",
  },
  {
    timeSecond: 75,
    title: "Application servers stall",
    description: "Config and secret loaders block app startup; deploys freeze",
    affectedServices: ["app_servers"],
    metricChanges: { requests_per_sec: 1100 },
    logMessage: "[01:15] CRIT: app-server config loader: S3 read timeout",
    priority: "critical",
  },
  {
    timeSecond: 100,
    title: "P1 declared",
    description: "Service-wide object storage unavailable — incident bridge opened",
    affectedServices: ["storage_primary", "index_subsystem", "metadata_service"],
    metricChanges: { storage_error_rate: 89 },
    logMessage: "[01:40] CRIT: P1 — storage unavailable across all tenants",
    priority: "critical",
  },
  {
    timeSecond: 140,
    title: "Audit log reviewed",
    description: "On-call locates the decommission command with inflated count in audit trail",
    affectedServices: [],
    metricChanges: {},
    logMessage: "[02:20] INFO: audit log shows subsystem-remove count=38; runbook expected count=3",
    priority: "info",
  },
  {
    timeSecond: 185,
    title: "Root cause confirmed",
    description: "Team confirms restart is the only path — subsystems must rebuild",
    affectedServices: [],
    metricChanges: {},
    logMessage: "[03:05] INFO: confirmed operator error — initiating subsystem restart sequence",
    priority: "info",
  },
];


// ─────────────────────────────────────────────
// INCIDENT 2 — Fastly Global CDN Outage (2021)
// ─────────────────────────────────────────────
const INCIDENT_FASTLY = {
  title: "Global CDN Collapse — One Config Change, Millions of Sites Down",
  description:
    "P1: The edge CDN is returning errors for the majority of origin domains. " +
    "No new deploy occurred on our end. Status from the CDN vendor is lagging. " +
    "Customer-facing pages are blank or timing out worldwide. " +
    "Use logs, metrics, and the timeline to isolate the trigger — then choose one action.",
  difficulty: "medium",
  category: "incident",
  simulationType: "production",
  durationSeconds: 210,
  estimatedTime: 10,
  xpReward: 150,
  tags: ["cdn", "edge", "configuration", "vendor-incident", "third-party", "on-call"],

  initialServices: [
    { id: "cdn_edge",        name: "CDN Edge Network",     status: "healthy", color: "#10b981" },
    { id: "origin_servers",  name: "Origin Servers",       status: "healthy", color: "#10b981" },
    { id: "dns",             name: "DNS Resolution",        status: "healthy", color: "#10b981" },
    { id: "api_gateway",     name: "API Gateway",           status: "healthy", color: "#10b981" },
    { id: "static_assets",   name: "Static Asset Delivery", status: "healthy", color: "#10b981" },
  ],

  initialMetrics: {
    cdn_error_rate:   [{ timestamp: 0, value: 0.4 }],
    origin_hit_rate:  [{ timestamp: 0, value: 92  }],
    latency_ms:       [{ timestamp: 0, value: 42  }],
    edge_nodes_up:    [{ timestamp: 0, value: 100 }],
  },

  initialLogs: [
    "[00:00] CDN edge nominal — all PoPs reporting healthy",
    "[00:00] No internal deployments scheduled today",
    "[00:01] Routine customer config push processed by CDN vendor",
    "[00:02] CDN vendor acknowledges config activation",
  ],

  realIncidentName:   "Fastly Global Outage",
  realIncidentDate:   "June 8, 2021",
  realIncidentLink:   "https://www.fastly.com/blog/summary-of-june-8-outage",
  realIncidentDesc:
    "On June 8, 2021, roughly 85% of Fastly's network returned errors simultaneously, " +
    "knocking out Reddit, The New York Times, Twitch, GitHub Pages, Gov.UK, and hundreds " +
    "of other major sites for approximately 49 minutes. The root cause was a software bug " +
    "introduced in a May deployment that was only triggered when a specific, entirely valid, " +
    "customer configuration change was made. When that customer updated their settings on " +
    "June 8, the latent bug activated across all of Fastly's global PoPs at once.",

  revealTitle: "Based on: Fastly Global CDN Outage (June 8, 2021)",
  revealText:
    "Fastly shipped a software update in May 2021 containing a bug that was harmless " +
    "until a specific combination of customer settings was applied. On June 8, an " +
    "ordinary customer config change flipped the exact bit pattern that exposed the bug — " +
    "and because Fastly's edge software is deployed uniformly across all PoPs, every " +
    "server worldwide crashed simultaneously within seconds. " +
    "\n\n" +
    "Fastly engineers identified the problem in about 1 minute of investigation and " +
    "disabled the triggering configuration globally, restoring most traffic within 49 " +
    "minutes. The customer whose config triggered it had done nothing wrong. " +
    "\n\n" +
    "Key lessons: (1) A bug that is only reachable via valid user input is still a " +
    "production bug — fuzz config inputs in staging; (2) Uniform global software rollouts " +
    "mean a single latent bug can have universal blast radius; (3) CDN and infrastructure " +
    "vendors are single points of failure — multi-CDN failover or origin-direct fallback " +
    "is worth the cost for critical traffic; (4) Fast incident detection (1 min here) " +
    "dramatically reduces MTTR even when the fix itself is straightforward.",

  rootCauseOptions: [
    {
      id: "latent_vendor_bug",
      title: "Vendor software bug activated by a customer config change",
      description:
        "A latent defect in the CDN's edge software was harmless in isolation but " +
        "triggered globally when a specific valid customer configuration was applied.",
      isCorrect: true,
      hint: "Look at the timing: the error spike correlates with a vendor config push, not an internal deploy or traffic surge.",
    },
    {
      id: "ddos",
      title: "Volumetric DDoS attack saturating edge PoPs",
      description:
        "A coordinated flood overwhelmed CDN edge nodes, exhausting connection tables " +
        "and causing widespread timeouts.",
      isCorrect: false,
      hint: "A DDoS would show a sharp requests_per_sec spike; check whether inbound volume actually changed.",
    },
    {
      id: "origin_overload",
      title: "Cache purge storm sent all traffic to origin",
      description:
        "A misconfigured cache invalidation wiped the CDN cache, driving 100% of " +
        "requests to origin and overwhelming it.",
      isCorrect: false,
      hint: "A cache purge storm would tank origin_hit_rate first; check the sequence of metric changes.",
    },
    {
      id: "dns_misconfiguration",
      title: "DNS misconfiguration routed traffic to stale CDN IPs",
      description:
        "A TTL miscalculation during a DNS record update pointed domains to CDN IPs " +
        "that were decommissioned, causing hard failures at the resolver layer.",
      isCorrect: false,
      hint: "DNS failures produce NXDOMAIN or connection-refused, not CDN-layer error codes.",
    },
  ],

  actionOptions: [
    {
      id: "disable_trigger_config",
      title: "Disable the triggering customer configuration globally",
      description:
        "Identify and feature-flag-off the customer config value that activates the bug across all PoPs.",
      category: "rollback",
      fixesMetrics: ["cdn_error_rate", "edge_nodes_up", "latency_ms"],
      recoveryTime: 25,
      pointsIfCorrect: 100,
      pointsIfWrong: 0,
    },
    {
      id: "origin_direct_failover",
      title: "Bypass CDN — route all traffic directly to origin",
      description:
        "Update DNS to point apex records at origin load balancers, removing the CDN from the critical path.",
      category: "failover",
      fixesMetrics: ["cdn_error_rate", "latency_ms"],
      recoveryTime: 45,
      pointsIfCorrect: 70,
      pointsIfWrong: 0,
    },
    {
      id: "rollback_edge_software",
      title: "Request CDN vendor to rollback edge software",
      description:
        "Escalate to the vendor to revert the May software release across all PoPs.",
      category: "rollback",
      fixesMetrics: ["cdn_error_rate", "edge_nodes_up", "origin_hit_rate", "latency_ms"],
      recoveryTime: 80,
      pointsIfCorrect: 80,
      pointsIfWrong: 0,
    },
  ],
};

const TIMELINE_FASTLY = [
  {
    timeSecond: 0,
    title: "Healthy baseline",
    description: "CDN fully operational, all PoPs green",
    affectedServices: [],
    metricChanges: {},
    logMessage: "[00:00] All edge PoPs: nominal",
    priority: "info",
  },
  {
    timeSecond: 3,
    title: "Customer config pushed",
    description: "Vendor processes a routine config change for one customer account",
    affectedServices: [],
    metricChanges: {},
    logMessage: "[00:03] CDN vendor: customer config activation acknowledged",
    priority: "info",
  },
  {
    timeSecond: 8,
    title: "Edge error spike begins",
    description: "Within seconds, edge PoPs start returning 503s globally",
    affectedServices: ["cdn_edge"],
    metricChanges: { cdn_error_rate: 58, edge_nodes_up: 17 },
    logMessage: "[00:08] CRIT: CDN edge error rate 58% — multiple PoPs unresponsive",
    priority: "critical",
  },
  {
    timeSecond: 15,
    title: "Static assets fail",
    description: "JS, CSS, and image delivery breaks; pages render as unstyled HTML or blank",
    affectedServices: ["static_assets"],
    metricChanges: { cdn_error_rate: 85 },
    logMessage: "[00:15] CRIT: static asset delivery error rate 85%",
    priority: "critical",
  },
  {
    timeSecond: 22,
    title: "API gateway origin calls flood",
    description: "CDN cache miss fallback hammers origin servers as PoPs drop",
    affectedServices: ["api_gateway", "origin_servers"],
    metricChanges: { origin_hit_rate: 8, latency_ms: 6200 },
    logMessage: "[00:22] ERR: API gateway upstream timeout — CDN not absorbing traffic",
    priority: "critical",
  },
  {
    timeSecond: 35,
    title: "P1 declared",
    description: "Majority of customer-facing surfaces returning errors",
    affectedServices: ["cdn_edge", "static_assets", "api_gateway"],
    metricChanges: { cdn_error_rate: 91 },
    logMessage: "[00:35] CRIT: P1 — CDN-wide failure, ~91% error rate globally",
    priority: "critical",
  },
  {
    timeSecond: 55,
    title: "Vendor contacted",
    description: "CDN vendor escalation opened; no status page update yet",
    affectedServices: [],
    metricChanges: {},
    logMessage: "[00:55] INFO: CDN vendor P1 bridge opened",
    priority: "info",
  },
  {
    timeSecond: 80,
    title: "Config push correlated",
    description: "Timestamp analysis links the edge crash to the customer config activation",
    affectedServices: [],
    metricChanges: {},
    logMessage: "[01:20] INFO: error onset at 00:08 matches config push at 00:03 — investigating",
    priority: "warning",
  },
  {
    timeSecond: 110,
    title: "Latent bug identified",
    description: "Vendor confirms specific config field triggers a known-unknown bug in May release",
    affectedServices: [],
    metricChanges: {},
    logMessage: "[01:50] INFO: vendor root-cause confirmed — config field triggers edge software defect",
    priority: "info",
  },
  {
    timeSecond: 140,
    title: "Fix in progress",
    description: "Vendor disabling triggering config globally; PoPs begin recovering",
    affectedServices: [],
    metricChanges: { cdn_error_rate: 42, edge_nodes_up: 68 },
    logMessage: "[02:20] INFO: config rollback propagating — edge nodes recovering",
    priority: "info",
  },
];


// ─────────────────────────────────────────────
// INCIDENT 3 — Facebook / Meta BGP Outage (2021)
// ─────────────────────────────────────────────
const INCIDENT_FACEBOOK_BGP = {
  title: "Total Network Blackout — BGP Routes Withdrawn",
  description:
    "P1: All outbound connectivity has dropped to zero. DNS is not resolving our domains. " +
    "The platform is completely unreachable externally. Internal tooling and remote access " +
    "are also degraded. A routine network maintenance task ran 8 minutes ago. " +
    "Investigate what happened using the available signals — then choose a remediation path.",
  difficulty: "hard",
  category: "incident",
  simulationType: "production",
  durationSeconds: 270,
  estimatedTime: 15,
  xpReward: 250,
  tags: ["networking", "bgp", "dns", "total-outage", "routing", "on-call"],

  initialServices: [
    { id: "bgp_routers",      name: "BGP Border Routers",    status: "healthy", color: "#10b981" },
    { id: "dns_authoritative",name: "Authoritative DNS",      status: "healthy", color: "#10b981" },
    { id: "internal_network", name: "Internal Network / DC",  status: "healthy", color: "#10b981" },
    { id: "app_layer",        name: "Application Layer",      status: "healthy", color: "#10b981" },
    { id: "remote_access",    name: "Remote Access (VPN)",    status: "healthy", color: "#10b981" },
  ],

  initialMetrics: {
    external_reachability: [{ timestamp: 0, value: 100 }],
    dns_resolution_rate:   [{ timestamp: 0, value: 99.8 }],
    bgp_routes_advertised: [{ timestamp: 0, value: 856  }],
    active_sessions:       [{ timestamp: 0, value: 3400000 }],
  },

  initialLogs: [
    "[00:00] All BGP sessions nominal — 856 prefixes advertised",
    "[00:00] Routine backbone maintenance task initiated",
    "[00:06] Maintenance command issued to update router config",
    "[00:08] Router config push reported as completed",
  ],

  realIncidentName:   "Facebook / Meta Global Outage",
  realIncidentDate:   "October 4, 2021",
  realIncidentLink:   "https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/",
  realIncidentDesc:
    "On October 4, 2021, Facebook, Instagram, WhatsApp, and Oculus were completely " +
    "unreachable for approximately 6 hours. A configuration change to backbone routers " +
    "was intended to audit physical fiber capacity but instead accidentally withdrew all " +
    "of Facebook's BGP route announcements from the global internet. With no routes " +
    "advertised, DNS resolvers worldwide returned SERVFAIL for all Facebook-owned domains. " +
    "Compounding the problem, Facebook's internal remote-access tooling and door-badge " +
    "systems also relied on the same internal network, initially locking engineers out of " +
    "the data centers they needed to physically reach to fix the routers.",

  revealTitle: "Based on: Facebook / Meta Global Outage (Oct 4, 2021)",
  revealText:
    "A misconfigured command sent to Facebook's backbone routers during a routine audit " +
    "caused every BGP prefix Facebook had ever announced to be withdrawn from the internet. " +
    "Global DNS resolvers immediately started returning SERVFAIL because the nameservers " +
    "themselves were unreachable — even the DNS records couldn't be reached to explain " +
    "the outage. Facebook's own internal tools, remote-access VPNs, and even building " +
    "door-badge systems all depended on the same routed network, turning a 'just fix the " +
    "config' task into a physical data center access problem. Engineers had to drive to " +
    "the DCs and use out-of-band console access to restore the BGP sessions. " +
    "\n\n" +
    "Key lessons: (1) BGP configuration changes should go through a 'safe change' " +
    "pipeline with automated route-count monitors that abort if advertisement drops " +
    "unexpectedly; (2) Out-of-band management networks (separate physical path, separate " +
    "BGP AS) are essential — never route your recovery tools through the thing that broke; " +
    "(3) Physical access and remote-access systems must not depend on the same network " +
    "infrastructure they help manage; (4) 'Audit only' flags on ops tools must be " +
    "validated; a command that was supposed to read config should not be able to write it.",

  rootCauseOptions: [
    {
      id: "bgp_withdrawal",
      title: "Router config change accidentally withdrew all BGP route announcements",
      description:
        "A maintenance command intended to audit fiber capacity instead pushed a config " +
        "that removed all BGP prefixes from global internet routing tables.",
      isCorrect: true,
      hint: "The bgp_routes_advertised metric goes to zero immediately after the maintenance push — nothing else explains full external unreachability.",
    },
    {
      id: "dns_poisoning",
      title: "DNS cache poisoning attack corrupted authoritative records",
      description:
        "An attacker injected malicious records into upstream resolvers, redirecting " +
        "all domain lookups to a sinkhole IP.",
      isCorrect: false,
      hint: "Cache poisoning produces wrong answers, not SERVFAIL. Check whether DNS resolvers can reach the nameservers at all.",
    },
    {
      id: "fiber_cut",
      title: "Physical fiber cut severed all upstream ISP links",
      description:
        "Simultaneous physical damage to multiple fiber paths caused a total loss of " +
        "upstream connectivity at all peering points.",
      isCorrect: false,
      hint: "A fiber cut would show partial or AZ-specific impact, not an instant and complete route withdrawal across all PoPs simultaneously.",
    },
    {
      id: "ddos_blackhole",
      title: "ISP-level DDoS triggered remote-triggered blackhole routing",
      description:
        "A volumetric attack caused upstream ISPs to blackhole all routes to our AS " +
        "as a defensive measure.",
      isCorrect: false,
      hint: "A blackhole from a DDoS would start with a traffic surge before routes drop — look at the order of events in the timeline.",
    },
  ],

  actionOptions: [
    {
      id: "restore_bgp_config",
      title: "Revert BGP router config via out-of-band console",
      description:
        "Use the out-of-band management network or physical console access to push the " +
        "previous known-good BGP config and re-advertise all prefixes.",
      category: "rollback",
      fixesMetrics: ["bgp_routes_advertised", "external_reachability", "dns_resolution_rate", "active_sessions"],
      recoveryTime: 120,
      pointsIfCorrect: 100,
      pointsIfWrong: 0,
    },
    {
      id: "manual_route_injection",
      title: "Manually inject critical prefixes via emergency peering session",
      description:
        "Establish an emergency BGP session with a peering partner to announce the most " +
        "critical prefixes first while full config restore is in progress.",
      category: "investigate",
      fixesMetrics: ["bgp_routes_advertised", "external_reachability"],
      recoveryTime: 75,
      pointsIfCorrect: 75,
      pointsIfWrong: 0,
    },
    {
      id: "restart_bgp_daemon",
      title: "Restart BGP daemon on border routers",
      description:
        "SSH to border routers and restart the routing daemon to reload the last " +
        "committed configuration from disk.",
      category: "restart",
      fixesMetrics: ["bgp_routes_advertised"],
      recoveryTime: 90,
      pointsIfCorrect: 60,
      pointsIfWrong: 0,
    },
  ],
};

const TIMELINE_FACEBOOK_BGP = [
  {
    timeSecond: 0,
    title: "Healthy baseline",
    description: "All 856 BGP prefixes advertised, full external connectivity",
    affectedServices: [],
    metricChanges: {},
    logMessage: "[00:00] BGP: 856 prefixes active across all peering sessions",
    priority: "info",
  },
  {
    timeSecond: 6,
    title: "Maintenance command issued",
    description: "Config change pushed to backbone routers for fiber audit",
    affectedServices: ["bgp_routers"],
    metricChanges: {},
    logMessage: "[00:06] OPS: backbone router config push initiated",
    priority: "info",
  },
  {
    timeSecond: 9,
    title: "BGP routes drop to zero",
    description: "All prefixes withdrawn from global routing tables within seconds",
    affectedServices: ["bgp_routers"],
    metricChanges: { bgp_routes_advertised: 0, external_reachability: 0 },
    logMessage: "[00:09] CRIT: BGP — 0 prefixes advertised (was 856) — all sessions withdrawn",
    priority: "critical",
  },
  {
    timeSecond: 14,
    title: "DNS goes dark",
    description: "Authoritative nameservers unreachable; resolvers return SERVFAIL",
    affectedServices: ["dns_authoritative"],
    metricChanges: { dns_resolution_rate: 0 },
    logMessage: "[00:14] CRIT: authoritative DNS SERVFAIL — nameservers unreachable from internet",
    priority: "critical",
  },
  {
    timeSecond: 22,
    title: "Active sessions collapse",
    description: "All external user sessions terminated; reconnect attempts fail",
    affectedServices: ["app_layer"],
    metricChanges: { active_sessions: 0 },
    logMessage: "[00:22] CRIT: session count → 0 — platform fully unreachable",
    priority: "critical",
  },
  {
    timeSecond: 35,
    title: "Remote access fails",
    description: "VPN and internal tooling stop working — engineers lose remote access",
    affectedServices: ["remote_access"],
    metricChanges: {},
    logMessage: "[00:35] CRIT: VPN auth unreachable — remote access to infrastructure lost",
    priority: "critical",
  },
  {
    timeSecond: 60,
    title: "P1 declared",
    description: "Total blackout — no external reachability, no DNS, remote access broken",
    affectedServices: ["bgp_routers", "dns_authoritative", "remote_access"],
    metricChanges: {},
    logMessage: "[01:00] CRIT: P1 — complete network blackout. Physical DC access being arranged.",
    priority: "critical",
  },
  {
    timeSecond: 100,
    title: "Physical DC access required",
    description: "Team must reach data centers in person; badge systems also affected",
    affectedServices: [],
    metricChanges: {},
    logMessage: "[01:40] INFO: engineers en route to DCs — out-of-band console access needed",
    priority: "critical",
  },
  {
    timeSecond: 160,
    title: "Console access established",
    description: "Out-of-band serial console reached on border routers",
    affectedServices: [],
    metricChanges: {},
    logMessage: "[02:40] INFO: OOB console session open on border-router-01",
    priority: "info",
  },
  {
    timeSecond: 200,
    title: "Root cause confirmed",
    description: "Config diff shows all BGP peer sessions set to withdrawn state",
    affectedServices: [],
    metricChanges: {},
    logMessage: "[03:20] INFO: config diff confirmed — bgp neighbor * shutdown inadvertently applied",
    priority: "info",
  },
  {
    timeSecond: 230,
    title: "BGP restore in progress",
    description: "Previous config being re-applied; prefixes beginning to re-propagate",
    affectedServices: [],
    metricChanges: { bgp_routes_advertised: 412, external_reachability: 38 },
    logMessage: "[03:50] INFO: BGP config rollback applied — routes re-propagating (412/856)",
    priority: "info",
  },
];


// ─────────────────────────────────────────────
// Seeder
// ─────────────────────────────────────────────
const INCIDENTS_WITH_TIMELINES = [
  { incident: INCIDENT_AWS_S3,        timeline: TIMELINE_AWS_S3       },
  { incident: INCIDENT_FASTLY,        timeline: TIMELINE_FASTLY       },
  { incident: INCIDENT_FACEBOOK_BGP,  timeline: TIMELINE_FACEBOOK_BGP },
];

async function seedIncidents() {
  console.log("🌱 Seeding Historical Incident Simulations (v2)...");

  for (const { incident: incidentData, timeline: timelineEvents } of INCIDENTS_WITH_TIMELINES) {
    try {
      console.log(`\n📝 Creating incident: ${incidentData.title}`);

      const existing = await prisma.incidentSimulation.findFirst({
        where: { title: incidentData.title },
      });

      if (existing) {
        console.log(`⏭️  "${incidentData.title}" already exists, skipping...`);
        continue;
      }

      const incident = await prisma.incidentSimulation.create({
        data: {
          title:           incidentData.title,
          description:     incidentData.description,
          difficulty:      incidentData.difficulty,
          category:        incidentData.category,
          simulationType:  incidentData.simulationType,
          durationSeconds: incidentData.durationSeconds,
          estimatedTime:   incidentData.estimatedTime,
          xpReward:        incidentData.xpReward,
          tags:            incidentData.tags,
          initialServices: incidentData.initialServices,
          initialMetrics:  incidentData.initialMetrics,
          initialLogs:     incidentData.initialLogs,
          realIncidentName: incidentData.realIncidentName,
          realIncidentDate: incidentData.realIncidentDate,
          realIncidentLink: incidentData.realIncidentLink,
          realIncidentDesc: incidentData.realIncidentDesc,
          revealTitle:     incidentData.revealTitle,
          revealText:      incidentData.revealText,
          rootCauseOptions: incidentData.rootCauseOptions,
          actionOptions:   incidentData.actionOptions,
        },
      });

      console.log(`✅ Created incident: ${incident.id}`);

      console.log(`   Creating ${timelineEvents.length} timeline events...`);
      for (const eventData of timelineEvents) {
        const event = await prisma.incidentTimelineEvent.create({
          data: {
            incidentId:       incident.id,
            timeSecond:       eventData.timeSecond,
            title:            eventData.title,
            description:      eventData.description,
            affectedServices: eventData.affectedServices,
            metricChanges:    eventData.metricChanges,
            logMessage:       eventData.logMessage,
            priority:         eventData.priority,
          },
        });
        console.log(`   ✓ Event: ${event.title} @ ${event.timeSecond}s`);
      }
    } catch (error) {
      console.error(`❌ Error creating "${incidentData.title}":`, error.message);
    }
  }

  console.log("\n✅ Seeding v2 completed!");
  process.exit(0);
}

seedIncidents().catch((error) => {
  console.error("🔥 Fatal error during seeding:", error);
  process.exit(1);
});
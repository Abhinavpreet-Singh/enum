export interface ComponentConfig {
  [key: string]: string | number | boolean;
}

export interface SystemComponent {
  id: string;
  label: string;
  icon: string;
  description: string;
  config: ComponentConfig;
}

export const SYSTEM_COMPONENTS: SystemComponent[] = [
  {
    id: "client",
    label: "Client",
    icon: "monitor",
    description: "End-user client (browser, mobile app)",
    config: {
      type: "web",
      protocol: "HTTPS",
    },
  },
  {
    id: "load_balancer",
    label: "Load Balancer",
    icon: "split",
    description: "Distributes traffic across servers",
    config: {
      algorithm: "round_robin",
      healthCheck: true,
    },
  },
  {
    id: "api_server",
    label: "API Server",
    icon: "server",
    description: "Application server handling API requests",
    config: {
      instances: 1,
      language: "node",
      autoscaling: false,
    },
  },
  {
    id: "database",
    label: "Database",
    icon: "database",
    description: "Persistent data storage",
    config: {
      type: "SQL",
      replicas: 1,
      sharding: false,
    },
  },
  {
    id: "cache",
    label: "Cache",
    icon: "zap",
    description: "In-memory caching layer (Redis, Memcached)",
    config: {
      type: "Redis",
      ttl: 3600,
      maxMemory: "256mb",
    },
  },
  {
    id: "message_queue",
    label: "Message Queue",
    icon: "mail",
    description: "Async message broker (Kafka, RabbitMQ, SQS)",
    config: {
      type: "Kafka",
      partitions: 3,
      retentionHours: 168,
    },
  },
  {
    id: "cdn",
    label: "CDN",
    icon: "globe",
    description: "Content Delivery Network for static assets",
    config: {
      provider: "Cloudflare",
      cachePolicy: "aggressive",
    },
  },
];

export function getComponentById(id: string): SystemComponent | undefined {
  return SYSTEM_COMPONENTS.find((c) => c.id === id);
}

export function getDefaultConfig(componentId: string): ComponentConfig {
  const component = getComponentById(componentId);
  return component ? { ...component.config } : {};
}

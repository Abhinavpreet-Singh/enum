# ─── Build stage: install deps and generate Prisma client ───────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

RUN npm prune --omit=dev

# ─── Runtime stage: compilers + lean Node image ─────────────────────────────
FROM node:20-bookworm-slim AS runner

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        openjdk-17-jdk-headless \
        g++ \
        gcc \
        python3 \
        python3-pip \
        openssl \
        ca-certificates \
        curl && \
    rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="$JAVA_HOME/bin:$PATH"
ENV NODE_ENV=production

# Global modules used by in-container code execution (/tmp sandboxes)
RUN npm install -g express cors axios dotenv body-parser
ENV NODE_PATH=/usr/local/lib/node_modules

WORKDIR /app

RUN groupadd --system --gid 1001 enum && \
    useradd --system --uid 1001 --gid enum enum

COPY --from=builder --chown=enum:enum /app/node_modules ./node_modules
COPY --chown=enum:enum package.json package-lock.json ./
COPY --chown=enum:enum prisma ./prisma
COPY --chown=enum:enum prisma.config.ts ./
COPY --chown=enum:enum src ./src

USER enum

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-8000}/health" || exit 1

CMD ["node", "src/index.js"]

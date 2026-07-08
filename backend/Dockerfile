# ─── Build stage: install deps and generate Prisma client ───────────────────
FROM node:20-bookworm-slim AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Copy package manifests and install dependencies (skip postinstall scripts)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# 2. Copy the full backend project needed for Prisma + runtime
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY src ./src

# 3. Generate Prisma Client inside the image for debian-openssl-3.0.x
#    DATABASE_URL is required by prisma.config.ts but generate does not connect.
ENV DATABASE_URL="mongodb://build-placeholder:27017/build"
RUN npx prisma generate

# 4. Verify the query engine was generated before pruning
RUN test -d node_modules/.prisma/client && \
    test -f node_modules/.prisma/client/index.js && \
    ls node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node

# 5. Remove dev-only packages after Prisma client is generated
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
    useradd --system --uid 1001 --gid enum enum && \
    mkdir -p /tmp/enum-judge && \
    chown -R enum:enum /tmp/enum-judge

ENV ENUM_JUDGE_TMPDIR=/tmp/enum-judge

# Copy generated Prisma client + production node_modules from builder
COPY --from=builder --chown=enum:enum /app/node_modules ./node_modules
COPY --from=builder --chown=enum:enum /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=enum:enum /app/prisma ./prisma
COPY --from=builder --chown=enum:enum /app/prisma.config.ts ./
COPY --from=builder --chown=enum:enum /app/src ./src

# Final runtime check: query engine must exist in the production image
RUN test -f node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node

USER enum

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-8000}/health" || exit 1

CMD ["node", "src/index.js"]

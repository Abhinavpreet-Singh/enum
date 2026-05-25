# Use lightweight Node runtime
FROM node:20-bookworm-slim

# Install compilers and runtimes required for simulations
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        openjdk-17-jdk-headless \
        g++ \
        gcc \
        python3 \
        python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Java environment
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="$JAVA_HOME/bin:$PATH"

# ---- Install common Node libraries globally for simulations ----
RUN npm install -g \
    express \
    cors \
    axios \
    dotenv \
    body-parser

# Make global modules accessible everywhere (important for /tmp execution)
ENV NODE_PATH=/usr/local/lib/node_modules

# Working directory for backend API
WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm ci

# Generate prisma client
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# Remove dev dependencies for smaller image
RUN npm prune --omit=dev

# Copy backend source
COPY . .

# Default port (Render overrides this)
EXPOSE 3000

CMD ["node", "--env-file=.env", "src/index.js"]
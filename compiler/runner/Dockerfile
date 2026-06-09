FROM node:18-alpine

# Install essential build tools and Python for simulations
RUN apk add --no-cache \
    bash \
    build-base \
    python3 \
    curl \
    ca-certificates

# Pre-install common npm packages at the filesystem root (/node_modules/).
# Node.js module resolution walks up directories:
#   /tmp/enum-sim/node_modules  →  /tmp/node_modules  →  /node_modules  ✓
# So any simulation file can require/import these regardless of where
# it is written, without needing npm install at runtime.
WORKDIR /
RUN echo '{"name":"enum-runner-deps","version":"1.0.0"}' > /package.json && \
    npm install --save --legacy-peer-deps \
    express \
    cors \
    dotenv \
    body-parser \
    axios \
    lodash \
    morgan \
    jsonwebtoken \
    bcryptjs \
    multer \
    uuid && \
    npm cache clean --force

WORKDIR /app

COPY runner.sh /runner.sh
RUN chmod +x /runner.sh

ENTRYPOINT ["/runner.sh"]
FROM node:22-bookworm-slim AS builder
WORKDIR /app
# Install build dependencies for sharp (libvips with HEIC via libheif)
RUN apt-get update && apt-get install -y \
    python3 make g++ libvips-dev libheif-dev \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
# Runtime dependencies for sharp (libvips + libheif shared libs)
RUN apt-get update && apt-get install -y \
    libvips42 libheif1 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY src/db/migrations ./src/db/migrations
COPY healthcheck.js ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node healthcheck.js

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]

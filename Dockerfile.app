# Railway service: Node/Express API
# ─────────────────────────────────
# Stage 1: install ALL deps (devDeps too) so prisma CLI is present for generate
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/package.json
COPY server/prisma ./server/prisma

RUN pnpm install --filter server --frozen-lockfile

COPY server ./server

RUN pnpm --filter server exec prisma generate


# ─────────────────────────────────
# Stage 2: lean production image
FROM node:20-bookworm-slim AS app

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/package.json
COPY server/prisma ./server/prisma

# Production deps only
RUN pnpm install --filter server --prod --frozen-lockfile

# Source code + migrations from builder
COPY --from=builder /app/server/src ./server/src
COPY --from=builder /app/server/prisma ./server/prisma

# Generated Prisma client from builder (avoids needing prisma CLI in prod)
COPY --from=builder /app/server/node_modules/.prisma ./server/node_modules/.prisma
COPY --from=builder /app/server/node_modules/@prisma ./server/node_modules/@prisma
# Prisma CLI binary needed for migrate deploy at pre-deploy time
COPY --from=builder /app/server/node_modules/prisma ./server/node_modules/prisma
COPY --from=builder /app/server/node_modules/.bin/prisma ./server/node_modules/.bin/prisma

WORKDIR /app/server

# Railway injects $PORT; server already reads process.env.PORT || 3001
EXPOSE 3001

CMD ["node", "src/index.js"]

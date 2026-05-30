# Railway service: Node/Express API
FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/package.json
COPY server/prisma ./server/prisma

# Install all deps (devDeps included — prisma CLI needed for generate + migrate deploy)
RUN pnpm install --filter server --frozen-lockfile

COPY server/src ./server/src
COPY db/seed ./db/seed

# Generate Prisma client
RUN pnpm --filter server exec prisma generate

# Set after install so pnpm doesn't skip devDeps during build
ENV NODE_ENV=production

WORKDIR /app/server

# Railway injects $PORT; server already reads process.env.PORT || 3001
EXPOSE 3001

CMD ["node", "src/index.js"]

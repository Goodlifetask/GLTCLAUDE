# GoodLifeTask API Service
# Multi-stage build for minimal production image

# ─── Stage 1: Base ────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
RUN npm install -g pnpm@9

# ─── Stage 2: Dependencies ────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY services/api/package.json ./services/api/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile --filter @glt/api --filter @glt/shared

# ─── Stage 3: Builder ─────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN pnpm --filter @glt/api prisma generate

# Build shared package first
RUN pnpm --filter @glt/shared build

# Build API
RUN pnpm --filter @glt/api build

# ─── Stage 4: Runner (Production) ─────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl dumb-init
WORKDIR /app

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 --ingroup nodejs fastify

# Copy only production artifacts
COPY --from=builder --chown=fastify:nodejs /app/services/api/dist ./dist
COPY --from=builder --chown=fastify:nodejs /app/services/api/prisma ./prisma
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/services/api/package.json ./

USER fastify

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

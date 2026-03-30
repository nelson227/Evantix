# ── Stage 1: Build ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/api/tsconfig.json apps/api/
COPY apps/api/nest-cli.json apps/api/
COPY apps/api/prisma apps/api/prisma/

# Install ALL dependencies (workspace-aware)
RUN npm ci --legacy-peer-deps --workspace=apps/api --include-workspace-root

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Copy API source and build
COPY apps/api/src apps/api/src/
RUN cd apps/api && npm run build

# ── Stage 2: Production ────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production

# Copy root workspace files for resolution
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/

# Install production dependencies only
RUN npm ci --legacy-peer-deps --workspace=apps/api --include-workspace-root --omit=dev

# Re-generate Prisma client for production
COPY apps/api/prisma apps/api/prisma/
RUN cd apps/api && npx prisma generate

# Copy built app
COPY --from=builder /app/apps/api/dist apps/api/dist/

# Create uploads directory
RUN mkdir -p /app/apps/api/uploads

WORKDIR /app/apps/api

EXPOSE ${PORT:-3001}

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

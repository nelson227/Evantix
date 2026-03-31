# ── Stage 1: Build ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./
COPY prisma ./prisma/

# The API tsconfig extends ../../tsconfig.base.json — create it where expected
RUN echo '{"compilerOptions":{"target":"ES2022","module":"commonjs","lib":["ES2022"],"declaration":true,"strict":true,"noImplicitAny":true,"strictNullChecks":true,"noUnusedLocals":false,"noUnusedParameters":false,"noImplicitReturns":true,"noFallthroughCasesInSwitch":true,"moduleResolution":"node","esModuleInterop":true,"resolveJsonModule":true,"skipLibCheck":true,"forceConsistentCasingInFileNames":true,"emitDecoratorMetadata":true,"experimentalDecorators":true}}' > /tsconfig.base.json

# Install ALL dependencies
RUN npm install --legacy-peer-deps

# Generate Prisma client
RUN npx prisma generate

# Copy API source and build
COPY src ./src/
RUN npm run build

# ── Stage 2: Production ────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install prod deps
COPY package.json ./
RUN npm install --legacy-peer-deps --omit=dev

# Generate Prisma client for production
COPY prisma ./prisma/
RUN npx prisma generate

# tsconfig.base.json needed at runtime path for any reflection
RUN echo '{}' > /tsconfig.base.json

# Copy built app
COPY --from=builder /app/dist ./dist/

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE ${PORT:-3001}

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

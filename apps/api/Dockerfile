# ── Stage 1: Build ──────────────────────────────────────
FROM node:20-slim AS builder

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

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
RUN ./node_modules/.bin/prisma generate

# Copy API source and build
COPY src ./src/
RUN npm run build

# ── Stage 2: Production ────────────────────────────────
FROM node:20-slim AS runner

RUN apt-get update -y && apt-get install -y openssl dumb-init && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install prod deps
COPY package.json ./
COPY prisma ./prisma/
RUN npm install --legacy-peer-deps --omit=dev

# Install prisma CLI for migrations
RUN npm install prisma@5.22.0 --legacy-peer-deps

# Copy generated Prisma client + engines from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/@prisma/engines ./node_modules/@prisma/engines

# tsconfig.base.json needed at runtime path
RUN echo '{}' > /tsconfig.base.json

# Copy built app
COPY --from=builder /app/dist ./dist/

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE ${PORT:-3001}

ENTRYPOINT ["dumb-init", "--"]

CMD ["sh", "-c", "npx prisma@5.22.0 migrate deploy; node dist/main"]

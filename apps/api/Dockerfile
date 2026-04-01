# ── Single-stage production build ───────────────────────
FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl dumb-init && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package + prisma schema first (better layer caching)
COPY package.json ./
COPY prisma ./prisma/

# tsconfig.base.json — the API tsconfig extends ../../tsconfig.base.json
COPY tsconfig.json ./
COPY nest-cli.json ./
RUN echo '{"compilerOptions":{"target":"ES2022","module":"commonjs","lib":["ES2022"],"declaration":true,"strict":true,"noImplicitAny":true,"strictNullChecks":true,"noUnusedLocals":false,"noUnusedParameters":false,"noImplicitReturns":true,"noFallthroughCasesInSwitch":true,"moduleResolution":"node","esModuleInterop":true,"resolveJsonModule":true,"skipLibCheck":true,"forceConsistentCasingInFileNames":true,"emitDecoratorMetadata":true,"experimentalDecorators":true}}' > /tsconfig.base.json

# Install ALL dependencies (dev included — needed for build + prisma CLI)
RUN npm install --legacy-peer-deps

# Generate Prisma client
RUN npx prisma generate

# Copy source and build
COPY src ./src/
RUN npm run build

# Create uploads directory
RUN mkdir -p /app/uploads

ENV NODE_ENV=production

EXPOSE ${PORT:-3001}

ENTRYPOINT ["dumb-init", "--"]

# Run migrations at startup, then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

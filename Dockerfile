# =============================================================================
# Interview Assistant - Production Dockerfile
# =============================================================================
# This Dockerfile uses a multi-stage build to keep the final image small.
# Secrets (API keys) are NOT baked into the image - provide them at runtime.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# Install dependencies required for node-gyp (if any native modules)
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json ./

# Copy Prisma config + schema (postinstall runs `prisma generate` during npm ci)
COPY prisma.config.ts ./
COPY prisma/schema.prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code (excluding files in .dockerignore)
COPY . .

# Generate Prisma client before building (schema must be present)
# prisma/schema.prisma is included via COPY . . above
RUN npx prisma generate

# Build the Next.js application
# Note: We build without secrets - they will be provided at runtime
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production Runner
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

# Set to production mode
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Create data directory with proper permissions
# This can be mounted as a volume for persistent storage
RUN mkdir -p ./data && chown -R nextjs:nodejs ./data

# Copy the standalone output from Next.js build
# Next.js 13+ with output: 'standalone' creates optimized production output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma CLI, engine, and migrations so `prisma migrate deploy` can run at container start.
# Migrations run at RUNTIME (not build time) because the build env has no DB credentials (D-04).
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# Switch to non-root user
USER nextjs

# Expose the port Next.js runs on
EXPOSE 3000

# Set default environment variables (non-sensitive defaults only)
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# =============================================================================
# RUNTIME SECRETS - Provide these when starting the container:
# =============================================================================
# docker run -e OPENAI_API_KEY=your_key -e GITHUB_TOKEN=your_token ...
#
# Required environment variables:
#   - OPENAI_API_KEY: Your OpenAI API key for interview scoring & summaries
#   - GITHUB_TOKEN:   GitHub personal access token (optional, for GitHub features)
# =============================================================================

# Health check — uses /api/health which verifies DB connectivity (D-02)
# start-period=15s allows time for Prisma's first Supabase connection on cold start
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application.
# Migrations run out-of-band (CI deploy-staging.yml / deploy-prod.yml do `prisma migrate deploy`
# before pushing the new revision). Running migrate in the container CMD breaks on cold start
# because Next.js standalone bundle doesn't include prisma's transitive deps (e.g. `effect`).
CMD ["node", "server.js"]

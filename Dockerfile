# syntax=docker/dockerfile:1.7

# ─── Builder ──────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @devflow/db generate
RUN pnpm --filter @devflow/web build


# ─── Runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat docker-cli
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

RUN addgroup --system --gid 1001 devflow \
 && adduser --system --uid 1001 --ingroup devflow devflow

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/packages/db/package.json ./packages/db/
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder /app/node_modules/.modules.yaml ./node_modules/.modules.yaml

RUN mkdir -p /app/storage /app/data /app/apps/web/storage /app/apps/web/.settings \
 && chown devflow:devflow /app/storage /app/data /app/apps/web/storage /app/apps/web/.settings

COPY scripts/docker-entrypoint.sh /usr/local/bin/devflow-entrypoint
RUN chmod +x /usr/local/bin/devflow-entrypoint

USER devflow
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/devflow-entrypoint"]
CMD ["node", "apps/web/server.js"]

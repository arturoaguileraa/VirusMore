FROM oven/bun:1.3.5-slim AS base
WORKDIR /app

# Install all dependencies
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/api/package.json ./packages/api/
COPY packages/db/package.json ./packages/db/
COPY packages/env/package.json ./packages/env/
COPY packages/config/package.json ./packages/config/
RUN bun install

# Build
FROM deps AS build
COPY apps/web ./apps/web
COPY packages ./packages

ARG PUBLIC_SERVER_URL
ENV PUBLIC_SERVER_URL=$PUBLIC_SERVER_URL

RUN cd apps/web && bun run build

# Production image — fresh install to avoid bun virtual store symlink issues
FROM oven/bun:1.3.5-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/api/package.json ./packages/api/
COPY packages/db/package.json ./packages/db/
COPY packages/env/package.json ./packages/env/
COPY packages/config/package.json ./packages/config/
RUN bun install --production

COPY --from=build /app/apps/web/dist ./dist

EXPOSE 4321

CMD ["bun", "run", "./dist/server/entry.mjs"]

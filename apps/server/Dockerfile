FROM oven/bun:1.3.5-slim AS base
WORKDIR /app

# Install dependencies (all workspaces)
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/
COPY packages/api/package.json ./packages/api/
COPY packages/db/package.json ./packages/db/
COPY packages/env/package.json ./packages/env/
COPY packages/config/package.json ./packages/config/
RUN bun install

# Build
FROM deps AS build
COPY apps/server ./apps/server
COPY packages ./packages
RUN cd apps/server && bun run build

# Production image
FROM oven/bun:1.3.5-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/apps/server/dist ./dist
COPY --from=build /app/apps/server/package.json ./

EXPOSE 3000

CMD ["bun", "run", "dist/index.mjs"]

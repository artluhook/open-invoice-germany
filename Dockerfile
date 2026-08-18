# syntax=docker/dockerfile:1
# Open Invoice Germany — Production Dockerfile
# Fixed: npm install with --ignore-scripts in deps, prisma generate in build stage
# Fixed: scripts/ and test/ copied to runner for recurring:run and tests

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Install OpenSSL for Prisma, then npm install without postinstall (prisma generate)
RUN apt-get update -qq && apt-get install -y -qq openssl > /dev/null 2>&1
RUN npm install --no-audit --no-fund --ignore-scripts

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update -qq && apt-get install -y -qq openssl > /dev/null 2>&1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# PostgreSQL-Client generieren + Production-Build
RUN npx prisma generate --schema=prisma/schema.postgres.prisma \
  && npx next build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN apt-get update -qq && apt-get install -y -qq openssl > /dev/null 2>&1
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/src ./src
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/test ./test
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/vitest.config.ts ./vitest.config.ts
COPY --from=build /app/eslint.config.mjs ./eslint.config.mjs
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --schema=prisma/schema.postgres.prisma --skip-generate --accept-data-loss && npx next start -p 3000"]

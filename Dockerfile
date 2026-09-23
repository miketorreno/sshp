# syntax=docker/dockerfile:1

###########
# deps    #
###########
FROM node:24-alpine AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci

###########
# build   #
###########
FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
# Generate the Prisma client + zod schemas into src/generated (gitignored,
# regenerated here from the alpine/musl base so the query engine matches).
# Done before `COPY . .` so a source-only edit doesn't bust this layer.
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

###########
# runner  #
###########
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# The standalone trace keeps the app-imported client + (via
# outputFileTracingIncludes) the query engine in src/generated/prisma; the
# wholesale copy below is the backstop so the runtime query engine always
# loads regardless of trace behavior.
COPY --from=builder /app/src/generated ./src/generated

# `prisma migrate deploy` in the entrypoint needs the CLI + the schema engine
# that ships inside @prisma/engines + the migrations.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder /app/prisma ./prisma

# Standalone server bundle + static assets.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Run as a non-root user.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && chown -R nextjs:nodejs /app
USER nextjs:nodejs

EXPOSE 3000

# Runs `prisma migrate deploy`, then execs the CMD ($@) so signals and a
# compose `command:` override behave.
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
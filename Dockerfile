# Suitly production image (Next.js standalone, Node 22)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/data/suitly.db UPLOADS_DIR=/data/uploads
RUN addgroup -S suitly && adduser -S suitly -G suitly && mkdir -p /data && chown suitly:suitly /data
COPY --from=build --chown=suitly:suitly /app/.next/standalone ./
COPY --from=build --chown=suitly:suitly /app/.next/static ./.next/static
COPY --from=build --chown=suitly:suitly /app/public ./public
USER suitly
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]

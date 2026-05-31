# syntax=docker/dockerfile:1.7
#
# Restaurant CRM frontend — production image
#
# Multi-stage:
#   1) node:22-alpine → npm ci + vite build → ./dist
#   2) nginx:alpine   → serve ./dist + proxy /api/ and /hubs/ to the API
#
# Build from ./Frontend:
#     docker build -t restaurantcrm-web ./Frontend
#
# Or via docker compose (recommended): see docker-compose.yml at repo root.

# ─────────────────────────────────────────────────────────────────────────────
# 1. Build stage
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Lockfile first → Docker can cache the npm install layer across iterations
# that don't touch dependencies.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --prefer-offline --legacy-peer-deps

# Vite expects sources after install (vite plugins / postcss read configs).
COPY . .

# `VITE_API_BASE_URL` must stay empty so the bundled JS calls /api/* on the
# same origin — nginx proxies them to the API container. (Setting this to
# a localhost URL would break Telegram WebView's mixed-content rules.)
ENV NODE_ENV=production
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# 2. Runtime stage — nginx serving the static bundle
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Replace the default site config with ours: SPA fallback + /api & /hubs proxy.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static assets — the only thing on disk besides nginx itself.
COPY --from=build /app/dist /usr/share/nginx/html

# nginx:alpine already runs nginx workers as non-root (the 'nginx' user).
# The master process needs root only to bind to port 80; switch to a higher
# port here to drop the privilege requirement entirely.
RUN sed -i 's/listen       80;/listen       8080;/' /etc/nginx/conf.d/default.conf \
 && sed -i 's/user  nginx;//' /etc/nginx/nginx.conf \
 && chown -R nginx:nginx /var/cache/nginx /var/log/nginx /var/run \
 && touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

# syntax=docker/dockerfile:1.7
#
# RestaurantCRM.API — production image
#
# Multi-stage:
#   1) sdk:9.0     → restore + publish a self-contained-ish AOT-friendly build
#   2) aspnet:9.0  → minimal Debian-slim runtime, non-root, healthcheck
#
# Build context expected: ./Backend/src  (i.e. the directory containing
# Solution1.sln). Build from the repo root with:
#     docker build -t restaurantcrm-api ./Backend/src
#
# Or via docker compose (recommended): see docker-compose.yml at repo root.

# ─────────────────────────────────────────────────────────────────────────────
# 1. Build stage
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0-bookworm-slim AS build
WORKDIR /src

# Speed up restore: do it before copying source so Docker layer-caches it
# until any .csproj or Directory.Packages.props changes.
COPY Directory.Packages.props Solution1.sln ./
COPY RestaurantCRM.API/*.csproj          RestaurantCRM.API/
COPY RestaurantCRM.Application/*.csproj  RestaurantCRM.Application/
COPY RestaurantCRM.Domain/*.csproj       RestaurantCRM.Domain/
COPY RestaurantCRM.Infrastructure/*.csproj RestaurantCRM.Infrastructure/

RUN dotnet restore RestaurantCRM.API/RestaurantCRM.API.csproj \
    --runtime linux-x64

# Copy the rest and publish. `--no-restore` reuses the layer above, so this
# step is fast on iterations that don't touch package references.
COPY . .
RUN dotnet publish RestaurantCRM.API/RestaurantCRM.API.csproj \
    --configuration Release \
    --runtime linux-x64 \
    --no-restore \
    --self-contained false \
    --output /app/publish \
    /p:UseAppHost=false \
    /p:PublishTrimmed=false

# ─────────────────────────────────────────────────────────────────────────────
# 2. Runtime stage
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0-bookworm-slim AS runtime

# Install curl for the HEALTHCHECK probe. Single layer, cleaned up.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Logs directory must be writable by the non-root user. Pre-create with the
# right owner so Serilog's File sink doesn't crash on startup.
RUN mkdir -p /app/logs && chown -R app:app /app

# The official aspnet:9.0 image ships with a pre-created 'app' user.
USER app

COPY --from=build --chown=app:app /app/publish .

# Production defaults.
#   - bind to 0.0.0.0:8080 (not the default 5xxx; aligns with k8s/cloud conventions)
#   - clear HTTPS port — TLS is terminated upstream (nginx, ingress, load balancer)
#   - explicit container hint so .NET's GC mode + thread pool tune correctly
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_HTTP_PORTS=8080 \
    ASPNETCORE_HTTPS_PORTS= \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true \
    DOTNET_gcServer=1

EXPOSE 8080

# Soft liveness probe. The OpenAPI doc endpoint is only mounted in Development
# by default, so we point at the root which returns 404 once the app is up
# (which is enough to prove the process is serving requests). If you add
# `app.MapHealthChecks("/health")` in Program.cs, swap the URL here.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl --fail --silent --show-error --max-time 4 http://localhost:8080/ \
        || curl --fail --silent --max-time 4 -o /dev/null -w "%{http_code}" \
           http://localhost:8080/ | grep -E "^(200|404)$" \
        || exit 1

ENTRYPOINT ["dotnet", "RestaurantCRM.API.dll"]

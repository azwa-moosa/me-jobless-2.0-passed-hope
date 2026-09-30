#!/usr/bin/env bash
# Render start script for the DEV API (SYNTHETIC DATA ONLY).
# 1. Applies pending migrations + grants as the owner role (idempotent).
# 2. Seeds synthetic data on first boot only (seed skips if already seeded).
# 3. Starts the outbox relay worker and the API as the non-owner app_runtime role, so RLS applies.
set -euo pipefail

: "${DATABASE_URL_MIGRATOR:?DATABASE_URL_MIGRATOR is required}"
: "${APP_RUNTIME_PASSWORD:?APP_RUNTIME_PASSWORD is required}"
: "${DB_HOST:?}" "${DB_PORT:?}" "${DB_NAME:?}"

pnpm db:migrate
pnpm db:seed

PW_ENC="$(node -e 'process.stdout.write(encodeURIComponent(process.env.APP_RUNTIME_PASSWORD))')"
export DATABASE_URL="postgres://app_runtime:${PW_ENC}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

node apps/worker/dist/main.js &
WORKER_PID=$!
trap 'kill "$WORKER_PID" 2>/dev/null || true' EXIT

node apps/api/dist/main.js

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/.assetgen-dev.pids"
LOG_DIR="$ROOT_DIR/var/log"
mkdir -p "$LOG_DIR"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
APP_ORIGIN_DEFAULT="http://localhost:${FRONTEND_PORT}"

stop_previous() {
  if [[ ! -f "$PID_FILE" ]]; then
    return
  fi
  while IFS= read -r pid; do
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      echo "[dev] Stopping process $pid"
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" 2>/dev/null || true
    fi
  done <"$PID_FILE"
  rm -f "$PID_FILE"
}

cleanup() {
  stop_previous
}

start_frontend() {
  local log_file="$LOG_DIR/frontend.log"
  echo "[dev] Starting Next.js (log: $log_file)"
  (
    cd "$ROOT_DIR/web"
    PORT="$FRONTEND_PORT" \
    NEXT_PUBLIC_API_BASE="${NEXT_PUBLIC_API_BASE:-$APP_ORIGIN_DEFAULT}" \
    NEXT_PUBLIC_APP_ORIGIN="${NEXT_PUBLIC_APP_ORIGIN:-$APP_ORIGIN_DEFAULT}" \
    npm run dev -- --port "$FRONTEND_PORT" >>"$log_file" 2>&1
  ) &
  local pid=$!
  echo "$pid" >>"$PID_FILE"
}

stop_previous
trap cleanup EXIT
: >"$PID_FILE"

start_frontend

echo "[dev] Frontend: http://localhost:$FRONTEND_PORT"
echo "[dev] Press Ctrl+C to stop."

wait

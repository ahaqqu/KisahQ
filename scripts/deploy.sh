#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# KisahQ deploy – single entrypoint (mirrors RumaQ's pattern)
# ============================================================
# Usage:
#   ./scripts/deploy.sh                       # build the static site (safe default)
#   ./scripts/deploy.sh build                 # same as default
#   ./scripts/deploy.sh cloudflare            # build + deploy the Worker
#   ./scripts/deploy.sh cloudflare --dry-run  # validate without deploying
#
# Auth: use an already-logged-in wrangler (`npx wrangler login`) or export
# CLOUDFLARE_API_TOKEN in your shell. This script NEVER reads .env files;
# Cloudflare credentials live in the environment or in wrangler's own config.
#
# Deploy happens locally by the maintainer this round (no CI deploy job yet).

DRY_RUN=false
MODE="build"
for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=true
      ;;
    build | cloudflare)
      MODE="$arg"
      ;;
    *)
      echo "Unknown argument: $arg"
      echo "Usage: $0 [build|cloudflare] [--dry-run]"
      exit 1
      ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

log() { echo -e "==> $1"; }
ok() { echo -e "  ok  $1"; }
warn() { echo -e "  warn $1"; }

require_cmd() {
  if ! command -v "$1" &> /dev/null; then
    echo "Error: $1 is not installed. $2"
    exit 1
  fi
}

wrangler_cmd() {
  npx --no-install wrangler "$@"
}

check_prereqs() {
  require_cmd node "Install Node.js (https://nodejs.org)."
  require_cmd npm "Install npm (ships with Node.js)."
  if [[ ! -d node_modules ]]; then
    log "Installing dependencies..."
    npm ci
  fi
}

check_login() {
  if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    ok "Authenticated via CLOUDFLARE_API_TOKEN."
    return 0
  fi
  local whoami_output
  if whoami_output=$(wrangler_cmd whoami 2>&1) && ! grep -qi "not authenticated" <<<"$whoami_output"; then
    ok "Logged in to Cloudflare (wrangler whoami)."
    return 0
  fi
  echo "Error: not logged in to Cloudflare."
  echo "Run 'npx wrangler login' or export CLOUDFLARE_API_TOKEN (never put it in a file here)."
  exit 1
}

build_site() {
  log "Building the static story app (dist/)..."
  npm run build
  ok "Static build ready."
}

deploy_worker() {
  check_login
  local dry_run_flag=""
  if $DRY_RUN; then
    dry_run_flag="--dry-run"
  fi
  # shellcheck disable=SC2086
  wrangler_cmd deploy $dry_run_flag
  if $DRY_RUN; then
    ok "Worker dry-run validation succeeded (nothing deployed)."
  else
    ok "Worker deployed: https://kisahq.ahaqqu.com"
    warn "Verify the site after deploy (custom domain attach can take a minute)."
  fi
}

case "$MODE" in
  build)
    echo "=== KisahQ: build ==="
    check_prereqs
    build_site
    ;;
  cloudflare)
    echo "=== KisahQ: Cloudflare deployment ==="
    check_prereqs
    build_site
    deploy_worker
    ;;
esac

echo ""
echo "=== Done ==="

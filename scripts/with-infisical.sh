#!/usr/bin/env bash
set -euo pipefail

# Inject Taylored Instruction secrets from Infisical, then run the given command.
# Auth options (first match wins):
#   1. INFISICAL_TOKEN
#   2. INFISICAL_CLIENT_ID + INFISICAL_CLIENT_SECRET (universal-auth machine identity)
#   3. An existing `infisical login` session
# If Infisical is unavailable but the process already has app env (e.g. Vercel),
# the command runs as-is.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ID="${INFISICAL_PROJECT_ID:-5981bad0-a496-4ffd-96c6-4e9024025be2}"
ENV_NAME="${INFISICAL_ENV:-dev}"
export INFISICAL_DISABLE_UPDATE_CHECK="${INFISICAL_DISABLE_UPDATE_CHECK:-true}"

find_infisical() {
  if command -v infisical >/dev/null 2>&1; then
    command -v infisical
    return 0
  fi
  if [[ -x "$ROOT/node_modules/.bin/infisical" ]]; then
    printf '%s\n' "$ROOT/node_modules/.bin/infisical"
    return 0
  fi
  return 1
}

has_app_env() {
  [[ -n "${NEXT_PUBLIC_CONVEX_URL:-}" ]]
}

run_without_infisical() {
  exec "$@"
}

EXPORT_DOTENV=0
if [[ "${1:-}" == "--export" ]]; then
  EXPORT_DOTENV=1
  shift
fi

if [[ $EXPORT_DOTENV -eq 0 && $# -eq 0 ]]; then
  echo "usage: scripts/with-infisical.sh [--export] <command> [args...]" >&2
  exit 1
fi

if ! INFISICAL_BIN="$(find_infisical)"; then
  if [[ $EXPORT_DOTENV -eq 0 ]] && has_app_env; then
    run_without_infisical "$@"
  fi
  echo "Infisical CLI is not installed. Install it from https://infisical.com/docs/cli/overview or run bun install." >&2
  exit 1
fi

if [[ -z "${INFISICAL_TOKEN:-}" && -n "${INFISICAL_CLIENT_ID:-}" && -n "${INFISICAL_CLIENT_SECRET:-}" ]]; then
  INFISICAL_TOKEN="$("$INFISICAL_BIN" login --method=universal-auth --client-id="$INFISICAL_CLIENT_ID" --client-secret="$INFISICAL_CLIENT_SECRET" --silent --plain)"
  export INFISICAL_TOKEN
fi

if [[ -n "${INFISICAL_TOKEN:-}" ]] ||
  "$INFISICAL_BIN" login status --silent >/dev/null 2>&1; then
  if [[ $EXPORT_DOTENV -eq 1 ]]; then
    exec "$INFISICAL_BIN" export --projectId="$PROJECT_ID" --env="$ENV_NAME" --format=dotenv --silent
  fi
  exec "$INFISICAL_BIN" run --projectId="$PROJECT_ID" --env="$ENV_NAME" --silent -- "$@"
fi

if [[ $EXPORT_DOTENV -eq 0 ]] && has_app_env; then
  run_without_infisical "$@"
fi

echo "Authenticate with Infisical first: infisical login" >&2
echo "Or set INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET." >&2
exit 1

#!/usr/bin/env bash
# Create api.neeklo.ru generation key via docs portal (PC must be online + tunnel active)
# Usage: PORTAL_EMAIL=... PORTAL_PASSWORD=... bash create-studio-generation-key.sh
set -euo pipefail

PORTAL_BASE="${PORTAL_BASE:-https://docs.neeklo.ru/portal}"
EMAIL="${PORTAL_EMAIL:-}"
PASSWORD="${PORTAL_PASSWORD:-}"
KEY_NAME="${KEY_NAME:-studio-backend-generation}"
COOKIE_JAR="/tmp/studio-portal-cookies.txt"

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "Set PORTAL_EMAIL and PORTAL_PASSWORD (administrator on docs.neeklo.ru/portal)"
  exit 1
fi

curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "${PORTAL_BASE}/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" | tee /tmp/portal-login.json

echo
ME=$(curl -sS -b "$COOKIE_JAR" "${PORTAL_BASE}/api/me")
echo "$ME" | grep -q '"success":true' || { echo "Login failed"; exit 1; }

# Scopes for image/video generation via api.neeklo.ru
SCOPES='["v1:generate:image","v1:generate:video","v1:models","v1:jobs"]'
RESULT=$(curl -sS -b "$COOKIE_JAR" -X POST "${PORTAL_BASE}/api/keys" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"${KEY_NAME}\",\"scopes\":${SCOPES}}")

echo "$RESULT"
PLAIN=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('plainKey',''))" 2>/dev/null || true)
if [ -n "$PLAIN" ]; then
  echo "NEEKLO_GENERATION_API_KEY=${PLAIN}"
else
  echo "Key creation failed — check PC portal tunnel (8765) is active"
  exit 1
fi

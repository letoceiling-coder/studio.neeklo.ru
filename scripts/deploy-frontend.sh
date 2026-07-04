#!/usr/bin/env bash
set -euo pipefail
cd /opt/studio-neeklo/frontend
git fetch origin
git pull --ff-only origin main
bun install
bun run build
systemctl restart studio-frontend
echo Frontend deployed: $(git rev-parse --short HEAD)

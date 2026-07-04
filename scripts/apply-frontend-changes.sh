#!/usr/bin/env bash
# Детерминированный деплой полировки медиа-студий: бэкап 7 файлов, распаковка,
# сборка и рестарт SSR. Запускать на сервере из /opt/studio-neeklo/frontend.
set -euo pipefail

cd /opt/studio-neeklo/frontend

FILES=(
  "src/components/credits-badge.tsx"
  "src/components/generation-cost-note.tsx"
  "src/components/studio/model-picker.tsx"
  "src/lib/media-models.ts"
  "src/lib/mock-credits.ts"
  "src/routes/app.studio.image.tsx"
  "src/routes/app.studio.video.tsx"
)

BK="/opt/studio-neeklo/backups/frontend-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BK"
for f in "${FILES[@]}"; do
  mkdir -p "$BK/$(dirname "$f")"
  cp "$f" "$BK/$f"
done
echo "BACKUP=$BK"

tar xzf deploy-changes.tgz
rm -f deploy-changes.tgz
echo "extracted OK"

echo "--- markers ---"
grep -c "computeVideoCost" src/routes/app.studio.video.tsx
grep -c "computeImageCost" src/routes/app.studio.image.tsx
grep -c "creditNoun" src/lib/mock-credits.ts
grep -c "modelAccentLine" src/components/studio/model-picker.tsx

echo "--- build ---"
bun run build

echo "--- restart ---"
systemctl restart studio-frontend
sleep 3
systemctl is-active studio-frontend
echo "DONE"

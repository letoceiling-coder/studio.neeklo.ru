#!/usr/bin/env bash
# Детерминированный деплой правок фронта: бэкап затрагиваемых файлов (список
# берётся из содержимого deploy-changes.tgz), распаковка, сборка, рестарт SSR.
# Запускать на сервере из /opt/studio-neeklo/frontend.
set -euo pipefail

cd /opt/studio-neeklo/frontend

if [ ! -f deploy-changes.tgz ]; then
  echo "ERROR: deploy-changes.tgz не найден" >&2
  exit 1
fi

BK="/opt/studio-neeklo/backups/frontend-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BK"

echo "=== файлы в пакете ==="
tar tzf deploy-changes.tgz

echo "=== бэкап оригиналов -> $BK ==="
for f in $(tar tzf deploy-changes.tgz); do
  case "$f" in
    */) continue ;;
  esac
  if [ -f "$f" ]; then
    mkdir -p "$BK/$(dirname "$f")"
    cp "$f" "$BK/$f"
  fi
done
echo "BACKUP=$BK"

tar xzf deploy-changes.tgz
rm -f deploy-changes.tgz
echo "extracted OK"

echo "=== build ==="
bun run build

echo "=== restart ==="
systemctl restart studio-frontend
sleep 3
systemctl is-active studio-frontend
echo "DONE"

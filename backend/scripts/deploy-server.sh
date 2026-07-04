#!/usr/bin/env bash
set -euo pipefail

# Deploy studio.neeklo.ru on VPS — run ON SERVER as root
# Usage: bash /opt/studio-neeklo/scripts/deploy-server.sh

APP_DIR="/opt/studio-neeklo"
DOMAIN="studio.neeklo.ru"
FRONTEND_PORT=3000
API_PORT=3016

echo "==> Studio deploy @ ${APP_DIR}"

mkdir -p "${APP_DIR}" /var/log/studio-neeklo

if ! command -v node >/dev/null; then
  echo "Node.js required"; exit 1
fi

if ! command -v docker >/dev/null; then
  echo "Docker required"; exit 1
fi

cd "${APP_DIR}/backend"
docker compose up -d

if [ ! -f .env ]; then
  echo "Missing ${APP_DIR}/backend/.env — copy from .env.production.template"
  exit 1
fi

npm install
npm run db:generate
npm run db:push
npm run build

# systemd units
cat > /etc/systemd/system/studio-api.service << UNIT
[Unit]
Description=Studio Neeklo API
After=network.target docker.service

[Service]
Type=simple
WorkingDirectory=${APP_DIR}/backend/apps/api
EnvironmentFile=${APP_DIR}/backend/.env
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/studio-worker.service << UNIT
[Unit]
Description=Studio Neeklo Worker
After=network.target docker.service studio-api.service

[Service]
Type=simple
WorkingDirectory=${APP_DIR}/backend/apps/worker
EnvironmentFile=${APP_DIR}/backend/.env
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/studio-frontend.service << UNIT
[Unit]
Description=Studio Neeklo Frontend SSR
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}/frontend
Environment=NODE_ENV=production
Environment=PORT=${FRONTEND_PORT}
ExecStart=/usr/bin/node .output/server/index.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable studio-api studio-worker studio-frontend
systemctl restart studio-api studio-worker studio-frontend || true

# nginx
if [ ! -f /etc/nginx/sites-available/studio.neeklo.ru.conf ]; then
  cp "${APP_DIR}/backend/infra/nginx/studio.neeklo.ru.conf" /etc/nginx/sites-available/studio.neeklo.ru.conf
  ln -sf ../sites-available/studio.neeklo.ru.conf /etc/nginx/sites-enabled/studio.neeklo.ru.conf
fi

if [ ! -d /etc/letsencrypt/live/studio.neeklo.ru ]; then
  certbot certonly --nginx -d studio.neeklo.ru --non-interactive --agree-tos -m studio@neeklo.ru || true
fi

nginx -t && systemctl reload nginx

echo "==> Done. Check:"
echo "  curl -sS https://${DOMAIN}/api/health"
echo "  curl -sS https://${DOMAIN}/"

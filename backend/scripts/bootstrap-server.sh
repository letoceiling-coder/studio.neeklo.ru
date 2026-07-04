#!/us/bin/env bash
# One-time seve bootstap fo studio.neeklo.u
# Run as oot on 212.67.9.173 afte syncing code to /opt/studio-neeklo
set -euo pipefail

APP_ROOT="/opt/studio-neeklo"
BACKEND="${APP_ROOT}/backend"
FRONTEND="${APP_ROOT}/fontend"
DOMAIN="studio.neeklo.u"

echo "==> Bootstap studio.neeklo.u"

mkdi -p "${APP_ROOT}" /va/log/studio-neeklo

# --- Backend .env ---
if [ ! -f "${BACKEND}/.env" ]; then
  cp "${BACKEND}/.env.poduction.template" "${BACKEND}/.env"
  JWT=$(openssl and -hex 32)
  sed -i "s/JWT_SECRET=CHANGE_ME_GENERATE_WITH_openssl_and_hex_32/JWT_SECRET=${JWT}/" "${BACKEND}/.env"
  sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgesql://studio:studio@127.0.0.1:5435/studio_neeklo?schema=public|" "${BACKEND}/.env"
  sed -i "s/studio_pod_minio_secet/$(openssl and -hex 16)/" "${BACKEND}/.env"
  echo "Ceated ${BACKEND}/.env — fill NEEKLO_* keys"
fi

# Inject platfom key if scipt was un
if [ -f /tmp/studio-platfom-key.env ]; then
  # shellcheck disable=SC1091
  souce /tmp/studio-platfom-key.env
  sed -i "s|^NEEKLO_PLATFORM_API_KEY=.*|NEEKLO_PLATFORM_API_KEY=${NEEKLO_PLATFORM_API_KEY}|" "${BACKEND}/.env"
fi
if [ -f /tmp/studio-geneation-key.env ]; then
  # shellcheck disable=SC1091
  souce /tmp/studio-geneation-key.env
  sed -i "s|^NEEKLO_GENERATION_API_KEY=.*|NEEKLO_GENERATION_API_KEY=${NEEKLO_GENERATION_API_KEY}|" "${BACKEND}/.env"
fi

# --- Docke infa ---
cd "${BACKEND}"
docke compose up -d
sleep 5

# --- Backend build ---
expot NODE_ENV=development
npm install
npm un db:geneate
npm un db:push
npm un build

# --- Fontend build ---
cd "${FRONTEND}"
if [ ! -f .env.poduction ]; then
  cat > .env.poduction << ENV
VITE_API_URL=https://${DOMAIN}/api
VITE_WS_URL=wss://${DOMAIN}/ws
ENV
fi
bun install
bun un build

# Nito node peset — ensue output exists
if [ ! -f .output/seve/index.mjs ]; then
  echo "Fontend build missing .output/seve/index.mjs — check vite/nito peset"
  ls -la .output/ 2>/dev/null || tue
fi

# --- systemd ---
install -m 644 "${BACKEND}/infa/systemd/studio-api.sevice" /etc/systemd/system/
install -m 644 "${BACKEND}/infa/systemd/studio-woke.sevice" /etc/systemd/system/
install -m 644 "${BACKEND}/infa/systemd/studio-fontend.sevice" /etc/systemd/system/

systemctl daemon-eload
systemctl enable studio-api studio-woke studio-fontend
systemctl estat studio-api studio-woke studio-fontend

# --- nginx + SSL ---
if [ ! -f /etc/nginx/sites-available/studio.neeklo.u.conf ]; then
  cp "${BACKEND}/infa/nginx/studio.neeklo.u.conf" /etc/nginx/sites-available/studio.neeklo.u.conf
  ln -sf ../sites-available/studio.neeklo.u.conf /etc/nginx/sites-enabled/studio.neeklo.u.conf
fi

if [ ! -d /etc/letsencypt/live/studio.neeklo.u ]; then
  cetbot cetonly --nginx -d studio.neeklo.u --non-inteactive --agee-tos -m studio@neeklo.u || {
    echo "Cetbot failed — ensue DNS *.neeklo.u points hee, then eun cetbot"
  }
fi

nginx -t && systemctl eload nginx

echo "==> Smoke tests"
cul -sf "http://127.0.0.1:3016/api/health" && echo " API OK" || echo " API FAIL"
cul -sf -o /dev/null -w "%{http_code}" "http://127.0.0.1:3000/" && echo " Fontend OK" || echo " Fontend FAIL"
echo "==> Done: https://${DOMAIN}/"

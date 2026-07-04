#!/usr/bin/env bash
set -uo pipefail

echo "=== SERVICES ==="
for s in studio-frontend studio-api studio-worker studio-proxy-tunnel; do
  printf '%-22s %s\n' "$s" "$(systemctl is-active "$s")"
done

echo
echo "=== HTTP (public https) ==="
for p in / /app /app/studio/image /app/studio/video /app/studio/enhancer /app/studio/avatars /app/studio/voices /app/media /app/billing; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "https://studio.neeklo.ru$p")
  printf '%-26s %s\n' "$p" "$code"
done

echo
echo "=== API health :3016 ==="
curl -sS -o /dev/null -w 'api   HTTP %{http_code}\n' --max-time 10 http://127.0.0.1:3016/api/health

echo
echo "=== Маркеры правок в исходниках на сервере ==="
cd /opt/studio-neeklo/frontend
printf 'refundCredits в mock-credits:   %s\n' "$(grep -c 'export function refundCredits' src/lib/mock-credits.ts)"
printf 'enhancer charges m.cost:        %s\n' "$(grep -c 'tryGenerate(MODES\[mode\].cost)' src/routes/app.studio.enhancer.tsx)"
printf 'enhancer refund on fail:        %s\n' "$(grep -c 'refundCredits(MODES\[mode\].cost)' src/routes/app.studio.enhancer.tsx)"
printf 'image refund:                   %s\n' "$(grep -c 'refundCredits(totalCost)' src/routes/app.studio.image.tsx)"
printf 'video refund:                   %s\n' "$(grep -c 'refundCredits(totalCost)' src/routes/app.studio.video.tsx)"
printf 'tools refund:                   %s\n' "$(grep -c 'refundCredits(1)' 'src/routes/app.tools.$toolId.tsx')"

echo
echo "=== FRONTEND LOG (последние 6 строк) ==="
tail -6 /var/log/studio-neeklo/frontend.log 2>/dev/null || echo "(нет лога)"

echo
echo "=== ERRORS в логе фронта ==="
grep -iE "error|exception|unhandled|econnrefused|500" /var/log/studio-neeklo/frontend.log 2>/dev/null | tail -8 || echo "(нет ошибок)"

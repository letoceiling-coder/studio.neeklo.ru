#!/usr/bin/env bash
set -uo pipefail

echo "=== SERVICES ==="
for s in studio-frontend studio-api studio-worker studio-proxy-tunnel; do
  printf '%-22s %s\n' "$s" "$(systemctl is-active "$s")"
done

echo
echo "=== HTTP (public https) ==="
for p in / /app /app/studio/image /app/studio/video /app/media-studio /app/billing; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "https://studio.neeklo.ru$p")
  printf '%-24s %s\n' "$p" "$code"
done

echo
echo "=== SSR local :3000 ==="
curl -sS -o /dev/null -w 'root  HTTP %{http_code}\n' --max-time 10 http://127.0.0.1:3000/

echo
echo "=== API health :3016 ==="
curl -sS -o /dev/null -w 'api   HTTP %{http_code}\n' --max-time 10 http://127.0.0.1:3016/api/health

echo
echo "=== Проверка, что новый билд отдаётся (маркеры в SSR) ==="
html=$(curl -sS --max-time 15 https://studio.neeklo.ru/app/studio/video)
echo "$html" | grep -qi "Стоимость видео" && echo "OK: 'Стоимость видео' присутствует в SSR" || echo "NB: маркер не найден в HTML (может рендериться на клиенте)"

echo
echo "=== FRONTEND LOG (последние 25 строк) ==="
tail -25 /var/log/studio-neeklo/frontend.log 2>/dev/null || echo "(нет лога)"

echo
echo "=== ERRORS в логе фронта за сегодня ==="
grep -iE "error|exception|unhandled|econnrefused|500" /var/log/studio-neeklo/frontend.log 2>/dev/null | tail -10 || echo "(нет ошибок)"

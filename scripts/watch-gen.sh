#!/usr/bin/env bash
# Live-лог генерации: API (Jobs/Credits/HTTP) + worker ([worker]/[replicate]).
# Запуск НА сервере:  bash /opt/studio-neeklo/scripts/watch-gen.sh
# Фильтр по job:      bash /opt/studio-neeklo/scripts/watch-gen.sh <jobId>
#
# Покажет в реальном времени всю цепочку:
#   Jobs create REQUEST -> Credits consume -> [worker] RECEIVED/RUNNING
#   -> [replicate] submit/429/SUCCESS -> [worker] COMPLETED|FAILED (+REFUND)

FILTER="${1:-}"

if [ -n "$FILTER" ]; then
  echo "== watch generation logs (job=$FILTER) =="
  journalctl -u studio-api -u studio-worker -f -o cat | grep --line-buffered -E "$FILTER"
else
  echo "== watch generation logs (all) =="
  journalctl -u studio-api -u studio-worker -f -o cat \
    | grep --line-buffered -Ei 'Jobs |Credits |\[worker\]|\[replicate\]|error|warn|insufficient|refund|429'
fi

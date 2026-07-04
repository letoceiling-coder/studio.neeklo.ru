# SSH Audit — 212.67.9.173 (jrexzkogva)

Дата: 2026-06-29  
ОС: Ubuntu 24.04.4 LTS  
Диск: 213 GB, занято 75 GB (36%)

---

## Nginx

- Версия: **nginx/1.24.0**
- Слушает: **80**, **443** (публично)
- **~45+ vhost** в `/etc/nginx/sites-enabled/`
- **`studio.neeklo.ru` — НЕ настроен** (grep по nginx пустой)

### Важные существующие конфиги

| Домен | Backend | Примечание |
|-------|---------|------------|
| `cursor.neeklo.ru` | `127.0.0.1:3040` | NEEKLO Platform IDE |
| `api.neeklo.ru` | (отдельный конфиг) | + `docs.neeklo.ru` на одном cert |
| `media.neeklo.ru` | media API | BullMQ |
| `view.neeklo.ru` | publish target | Сайты из IDE |
| `factory.neeklo.ru` | `127.0.0.1:8090/3096` | factory stack |

### SSL (certbot)

- **Отдельный cert на каждый домен** (не wildcard)
- `cursor.neeklo.ru` — cert существует, expiry ~89+ days
- `api.neeklo.ru` cert покрывает также `docs.neeklo.ru`
- **`studio.neeklo.ru` cert — отсутствует**

### Безопасный выпуск cert для studio.neeklo.ru

```bash
# 1. Бэкап
cp -a /etc/nginx /etc/nginx.backup.$(date +%Y%m%d)
cp -a /etc/letsencrypt /etc/letsencrypt.backup.$(date +%Y%m%d)

# 2. Dry-run (НЕ трогает существующие certs)
certbot certonly --nginx -d studio.neeklo.ru --dry-run

# 3. Создать НОВЫЙ server block (не редактировать cursor/api)
#    см. infra/nginx/studio.neeklo.ru.conf

# 4. Real cert
certbot certonly --nginx -d studio.neeklo.ru

# 5. nginx -t && systemctl reload nginx
```

**Не использовать** `--expand` на существующие certs без явной необходимости.

---

## Свободные порты (рекомендации для studio)

| Порт | Статус | Назначение |
|------|--------|------------|
| **3000** | FREE | Frontend SSR |
| **3016** | FREE | Studio Backend API |
| **3013–3014, 3017–3019** | FREE | резерв |
| **4000–4001** | FREE | резерв |
| **5435** | FREE | PostgreSQL studio |
| **6383** | FREE | Redis studio (6381–6382 заняты) |
| 3001, 3010, 3015, 3020 | BUSY | другие сервисы |
| 3040 | BUSY | neeklo-platform (cursor) |
| 9000–9001 | BUSY | MinIO (глобальный) |

---

## Docker (активные контейнеры)

- `media-neeklo-db` → postgres `127.0.0.1:5434`
- `market-api-postgres` → `127.0.0.1:15434`
- `factory_*` → backend 3096, frontend 8090
- `plagiat-*` → frontend 8097
- `models-gateway` → 3095
- MinIO на 9000/9001 (глобальный)

**Studio stack** — отдельный docker-compose на портах 5435, 6383, 9010/9011 (локальный dev).

---

## NEEKLO Platform (cursor.neeklo.ru)

- Путь: `/opt/neeklo-platform/`
- Process: `node /opt/neeklo-platform/src/index.js` → **127.0.0.1:3040**
- Health: `GET /healthz` → `{"status":"ok","service":"neeklo-platform"}`
- Published sites: `/var/www/neeklo-sites/` → `https://cursor.neeklo.ru/sites/{user}/{slug}/`
- IDE workspaces: `/var/neeklo/users/{username}/projects/{slug}`

---

## DNS (требуется)

Перед certbot добавить A-запись:

```
studio.neeklo.ru  →  212.67.9.173
```

---

## Checklist деплоя studio.neeklo.ru

- [ ] DNS A-record
- [ ] Бэкап nginx + letsencrypt
- [ ] certbot dry-run
- [ ] docker-compose up (postgres, redis)
- [ ] Deploy backend → port 3016
- [ ] Deploy frontend → port 3000
- [ ] nginx site config + reload
- [ ] certbot real
- [ ] Smoke test: `/api/health`, login, WS

# Studio Neeklo Backend

Monorepo for `studio.neeklo.ru` backend API and workers.

## Structure

```
backend/
├── apps/
│   ├── api/          NestJS REST + WebSocket (port 3016)
│   └── worker/       BullMQ job processor
├── packages/
│   ├── shared/       Types, plans, WS events
│   └── neeklo-sdk/   Clients for api.neeklo.ru + cursor.neeklo.ru
├── prisma/           PostgreSQL schema
├── infra/nginx/      Production nginx template
└── docs/             SSH audit, platform API docs
```

## Quick start (local)

```bash
cd backend
cp .env.example .env
docker compose up -d
npm install
npm run db:generate
npm run db:push
npm run dev:api      # terminal 1
npm run dev:worker   # terminal 2
```

API: `http://localhost:3016/api/health`

## External services

| Service | Env var | Purpose |
|---------|---------|---------|
| api.neeklo.ru | `NEEKLO_GENERATION_API_KEY` | Image/video AI |
| cursor.neeklo.ru | `NEEKLO_PLATFORM_API_KEY` | Site builder agent |
| media.neeklo.ru | `NEEKLO_MEDIA_API_URL` | Post-processing |

## MVP endpoints implemented

- `POST /api/auth/signup`, `/login`, `/logout`
- `GET /api/me`
- `GET /api/credits`, `POST /api/credits/consume`
- `POST /api/jobs/:type`, `GET /api/jobs/:id`
- `POST /api/generate/image`, `/generate/video`
- `GET/POST /api/sites`, `POST /api/sites/:id/agent`, `/publish`
- `GET /api/health`
- WebSocket `/ws`

## Docs

- [SSH Audit](./docs/SSH-AUDIT.md)
- [Cursor Platform API](./docs/CURSOR-PLATFORM-API.md)

## Production ports (VPS)

| Service | Port |
|---------|------|
| Frontend | 3000 |
| API | 3016 |
| PostgreSQL | 5435 |
| Redis | 6383 |

See `infra/nginx/studio.neeklo.ru.conf` for deployment.

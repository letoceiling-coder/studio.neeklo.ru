# NEEKLO Platform API (cursor.neeklo.ru)

Источник: `/opt/neeklo-platform/docs/API.md` на сервере 212.67.9.173  
Base URL: `https://cursor.neeklo.ru/api/v1` (also v2, v3)

---

## Назначение

HTTP API для того же, что делает [NEEKLO IDE](https://cursor.neeklo.ru/):

- создание проектов (workspace) удалённо
- автономный **agent** (modes: `agent`, `plan`, `ask`)
- управление файлами
- **publish** на `view.neeklo.ru`
- синхронизация с IDE chat sessions

---

## Authentication

```http
Authorization: Bearer ncsr_<your_key>
X-Neeklo-Project: your-project-slug
Content-Type: application/json
```

- Ключи создаются в **Admin panel** (`/admin`)
- Scopes: `read`, `write`, `chat`
- Ключ привязан к версии API (v1/v2/v3)

---

## Agent modes

| Mode | Scopes | Behaviour |
|------|--------|-----------|
| `agent` | chat + **write** | Полная автономия: создаёт/редактирует файлы, может publish |
| `plan` | chat | Read-only: возвращает пошаговый план, без изменений |
| `ask` | chat | Read-only: отвечает на вопросы о проекте |

`model` **обязателен**: `neeklo-auto`, `neeklo-aura`, `neeklo-code`, `neeklo-pro`, `neeklo-vision`, `neeklo-free`

---

## Key endpoints for Site Builder

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects` | Create workspace `{ "workspace": "slug" }` |
| GET | `/projects/:slug` | Project info + `published_url` |
| POST | `/projects/:slug/agent` | Run agent → files + optional publish |
| GET | `/projects/:slug/runs/:id` | Full run report with steps |
| GET | `/projects/:slug/files` | List project files |
| GET | `/projects/:slug/file?path=` | Read file content |
| PUT | `/projects/:slug/file` | Write file `{path, content}` |
| POST | `/projects/:slug/publish` | Publish to view.neeklo.ru |
| GET | `/projects/:slug/ide-url` | IDE URL for workspace |
| GET | `/projects/:slug/ide/sessions` | List IDE chat sessions |
| POST | `/projects/:slug/agent` + `continue_session` | Continue IDE session |

---

## Agent response example

```json
{
  "object": "agent.run",
  "project": "test-3",
  "run_id": 5,
  "status": "completed",
  "mode": "agent",
  "model": "neeklo-auto",
  "summary": "Создан index.html и опубликован.",
  "files_changed": [{ "path": "index.html", "action": "created", "bytes": 1200 }],
  "published": { "url": "https://view.neeklo.ru/dsc-23-test-3/", "file_count": 1 },
  "ide_session_id": "f1c2…",
  "tokens": 4210
}
```

---

## Publish URLs

- Test domain: `https://view.neeklo.ru/{username}-{slug}/`
- Also: `https://cursor.neeklo.ru/sites/{user}/{slug}/`

---

## Integration in studio backend

SDK: `packages/neeklo-sdk/src/platform-api.ts`

Flow for `/app/site`:

```
1. POST /sites → create DB record + platform POST /projects
2. POST /sites/:id/agent → proxy to platform agent
3. Save SiteVersion from run result
4. GET platform file index.html → preview in frontend
5. POST /sites/:id/publish → view.neeklo.ru URL
```

### Requirements

- Service API key `ncsr_...` with scopes `read`, `write`, `chat`
- User must have **Model API Key** configured in admin panel
- Max file write: 2 MB, sandboxed paths
- Agent step limit: 8 tool iterations per prompt

---

## Mapping frontend mock → platform API

| Frontend mock | Platform API |
|---------------|--------------|
| Scripted agent replies | `POST /projects/:slug/agent` |
| Version history | `GET /projects/:slug/runs`, SiteVersion in DB |
| Undo/revert | `GET /file` + `PUT /file` or new agent run |
| Publish flow | `POST /publish` |
| Live preview srcDoc | `GET /file?path=index.html` |
| Custom domain | **Not in platform API** — implement in studio backend |

---

## Error codes

| Code | Meaning |
|------|---------|
| 401 | Missing/invalid Bearer token |
| 403 | Missing scope (e.g. agent without write) |
| 400 | Missing model or prompt |
| 503 | Model API key not configured for user |
| 502 | Agent run failed |

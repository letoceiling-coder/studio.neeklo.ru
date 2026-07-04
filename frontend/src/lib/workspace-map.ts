/**
 * Единая карта принадлежности роутов к пространствам.
 *
 * На этом шаге визуально ничего не меняется. Карта используется дальше
 * сайдбарами и свитчером пространств для построения меню.
 *
 * Пространства:
 *  - hub        — главная, проекты, использование, биллинг, настройки
 *  - media      — все генеративные студии, ассеты, медиабанк, мудборды, завод
 *  - sites      — конструктор сайтов, превью, публикация
 *  - assistants — ассистенты, база знаний, лиды
 *  - hidden     — служебное/экспериментальное (admin, team, community, lora,
 *                 nodes, train-lora, дубль очереди студии, e2e-сценарии)
 *
 * Правила:
 *  - Все роуты остаются доступными по URL — это только маркировка.
 *  - Совпадение по префиксу: более длинный префикс выигрывает.
 */

export type Workspace = "hub" | "media" | "sites" | "assistants" | "hidden";

export type RouteOwnership = {
  /** URL-префикс (точное совпадение или начало пути с следующим `/`). */
  prefix: string;
  workspace: Workspace;
  /** Короткая метка для меню/отладки. */
  label?: string;
};

/**
 * Карта принадлежности. Порядок не важен — резолвер сортирует
 * по длине префикса (длиннее → точнее).
 */
export const ROUTE_OWNERSHIP: RouteOwnership[] = [
  // ───────────────── HUB ─────────────────
  { prefix: "/app", workspace: "hub", label: "Главная" },
  { prefix: "/app/projects", workspace: "hub", label: "Проекты" },
  { prefix: "/app/usage", workspace: "hub", label: "Использование" },
  { prefix: "/app/billing", workspace: "hub", label: "Биллинг" },
  { prefix: "/app/subscription", workspace: "hub", label: "Подписка" },
  { prefix: "/app/settings", workspace: "hub", label: "Настройки" },
  { prefix: "/app/profile", workspace: "hub", label: "Профиль" },
  { prefix: "/pricing", workspace: "hub", label: "Тарифы" },
  { prefix: "/plan", workspace: "hub", label: "Тариф" },

  // ───────────────── MEDIA ─────────────────
  { prefix: "/app/media-studio", workspace: "media", label: "Медиа-студия" },
  { prefix: "/app/factory", workspace: "media", label: "Контент-завод" },
  { prefix: "/app/create", workspace: "media", label: "Создание контента" },
  { prefix: "/app/media", workspace: "media", label: "Медиабанк" },
  { prefix: "/app/assets", workspace: "media", label: "Ассеты" },
  { prefix: "/app/moodboards", workspace: "media", label: "Мудборды" },
  { prefix: "/app/studio/image", workspace: "media", label: "Фото-студия" },
  { prefix: "/app/studio/video", workspace: "media", label: "Видео-студия" },
  { prefix: "/app/studio/enhancer", workspace: "media", label: "Энхансер" },
  { prefix: "/app/studio/realtime", workspace: "media", label: "Realtime" },
  { prefix: "/app/studio/avatars", workspace: "media", label: "Аватары" },
  { prefix: "/app/studio/voices", workspace: "media", label: "Голоса" },
  { prefix: "/app/tools", workspace: "media", label: "Инструменты" },

  // ───────────────── SITES ─────────────────
  { prefix: "/app/sites-studio", workspace: "sites", label: "AI-сайты" },
  { prefix: "/app/site", workspace: "sites", label: "Сайт" },
  { prefix: "/app/site-preview", workspace: "sites", label: "Превью сайта" },
  { prefix: "/app/publish", workspace: "sites", label: "Публикация" },

  // ──────────────── ASSISTANTS ────────────────
  { prefix: "/app/assistants-studio", workspace: "assistants", label: "AI-ассистенты" },
  { prefix: "/app/assistant", workspace: "assistants", label: "Ассистенты" },
  { prefix: "/app/knowledge", workspace: "assistants", label: "База знаний" },
  { prefix: "/app/leads", workspace: "assistants", label: "Лиды" },

  // ───────────────── HIDDEN ─────────────────
  // Служебное / экспериментальное / дубли.
  { prefix: "/app/admin", workspace: "hidden", label: "Админ" },
  { prefix: "/app/team", workspace: "hidden", label: "Команда" },
  { prefix: "/app/community", workspace: "hidden", label: "Сообщество" },
  { prefix: "/app/lora", workspace: "hidden", label: "Обучение LoRA" },
  { prefix: "/app/train-lora", workspace: "hidden", label: "Train LoRA" },
  { prefix: "/app/nodes", workspace: "hidden", label: "Нодовый редактор" },
  { prefix: "/app/studio/nodes", workspace: "hidden", label: "Studio Nodes" },
  // Дубль очереди — каноничная очередь живёт внутри /app/usage.
  { prefix: "/app/studio/queue", workspace: "hidden", label: "Очередь (дубль)" },
  // E2E-сценарии — только для разработки.
  { prefix: "/app/e2e", workspace: "hidden", label: "E2E-сценарии" },
  { prefix: "/e2e", workspace: "hidden", label: "E2E-сценарии" },
];

/** Дефолтное пространство для неразмеченных путей внутри /app. */
const DEFAULT_APP_WORKSPACE: Workspace = "hub";

/**
 * Резолв принадлежности по pathname. Длиннейший подходящий префикс
 * выигрывает, поэтому `/app/studio/queue` попадает в `hidden`, а не в
 * `media` (хотя `/app/studio/...` обычно медиа).
 */
export function resolveWorkspace(pathname: string): Workspace {
  let best: RouteOwnership | null = null;
  for (const entry of ROUTE_OWNERSHIP) {
    if (pathname === entry.prefix || pathname.startsWith(entry.prefix + "/")) {
      if (!best || entry.prefix.length > best.prefix.length) {
        best = entry;
      }
    }
  }
  if (best) return best.workspace;
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    return DEFAULT_APP_WORKSPACE;
  }
  return "hub";
}

/** Все роуты, относящиеся к пространству (для построения меню сайдбаров). */
export function getRoutesForWorkspace(workspace: Workspace): RouteOwnership[] {
  return ROUTE_OWNERSHIP.filter((r) => r.workspace === workspace);
}

/** Группировка для свитчера: пространство → список роутов. */
export const WORKSPACE_ROUTES: Record<Workspace, RouteOwnership[]> = {
  hub: getRoutesForWorkspace("hub"),
  media: getRoutesForWorkspace("media"),
  sites: getRoutesForWorkspace("sites"),
  assistants: getRoutesForWorkspace("assistants"),
  hidden: getRoutesForWorkspace("hidden"),
};

export const WORKSPACE_LABELS: Record<Workspace, string> = {
  hub: "Хаб",
  media: "Медиа",
  sites: "Сайты",
  assistants: "Ассистенты",
  hidden: "Скрытое",
};

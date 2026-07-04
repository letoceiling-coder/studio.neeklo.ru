export type RouteEntry = { to: string; label: string; group: string };

export const ROUTES_MAP: RouteEntry[] = [
  { to: "/app", label: "Хаб", group: "Основное" },
  { to: "/onboarding", label: "Онбординг", group: "Основное" },
  { to: "/onboarding-done", label: "Онбординг: итог", group: "Основное" },
  { to: "/pricing", label: "Выбор тарифа", group: "Основное" },

  { to: "/app/factory", label: "Контент-завод", group: "Завод" },
  
  { to: "/app/create", label: "Создание контента", group: "Завод" },
  { to: "/app/tools", label: "AI-инструменты", group: "Завод" },
  { to: "/app/tools/generate-photo", label: "Инструмент: фото", group: "Завод" },
  { to: "/app/media", label: "Медиатека", group: "Завод" },

  { to: "/app/site", label: "AI-сайт", group: "Сайт" },
  { to: "/app/site-preview", label: "Превью сайта", group: "Сайт" },
  { to: "/app/publish", label: "Публикация", group: "Сайт" },

  { to: "/app/assistant/new", label: "Новый ассистент", group: "Ассистент" },
  { to: "/app/assistant/demo", label: "Ассистент: обзор", group: "Ассистент" },
  { to: "/app/assistant/demo/chat-test", label: "Ассистент: чат-тест", group: "Ассистент" },
  { to: "/app/assistant/demo/connect", label: "Ассистент: подключение", group: "Ассистент" },
  { to: "/app/assistant/demo/leads", label: "Ассистент: лиды", group: "Ассистент" },
  { to: "/app/knowledge/demo", label: "База знаний", group: "Ассистент" },

  { to: "/app/studio/video", label: "Студия роликов", group: "Видео" },
  { to: "/app/studio/avatars", label: "Студия аватаров", group: "Видео" },
  { to: "/app/studio/voices", label: "Студия голосов", group: "Видео" },

  { to: "/app/profile", label: "Профиль", group: "Профиль" },
  { to: "/app/billing", label: "Подписка", group: "Профиль" },
  { to: "/app/admin", label: "Админ", group: "Профиль" },
];

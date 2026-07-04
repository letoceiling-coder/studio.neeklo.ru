## Цель

Не меняя смыслы и контент экранов, поднять визуал до уровня "сервис за $10M" (Higgsfield / Lovable / Linear) и добавить полноценный адаптив под три размера: mobile ≤ 767, tablet 768–1279, desktop ≥ 1280.

## 1. Дизайн-токены и типографика (`src/styles.css`, `index.html`)

- Перейти на OKLCH-палитру с двумя слоями: `--surface-0..3` (фон → карточка → подложка), `--border-subtle / --border-strong`, `--text-primary / muted / dim`.
- Акцент остаётся коралл-амбер, добавить `--gradient-warm`, `--gradient-warm-soft` (для подложек), `--ring-warm` (focus).
- Тени: `--shadow-flat`, `--shadow-raised`, `--shadow-popover` через `color-mix` от accent.
- Шрифты: Geist + Geist Mono подключить через `<link>` в `__root.tsx`. Заголовки — Geist tight tracking, моноширинный для счётчиков.
- Закрепить радиусы: 12 / 16 / 20 / 999 как токены `--r-md/lg/xl/full`.

## 2. Универсальный AppShell (`src/components/app-shell.tsx`)

Один компонент решает адаптив:

```text
mobile  : контент в max-w-md, BottomTabBar
tablet  : контент в max-w-3xl центрирован, BottomTabBar  
desktop : sidebar 240px слева (логотип + навигация + профиль внизу), контент в max-w-6xl, без BottomTabBar
```

- Сайдбар: коллапсируемый (icon-only режим), активный пункт — мягкая коралловая подложка.
- Сверху на desktop — узкий top-bar с поиском и иконкой профиля.
- BottomTabBar показывается только на `< lg`.
- Все маршруты заворачиваются в `AppShell` через `__root.tsx`, кроме `/onboarding`, `/pricing`, `/admin` (у них своя структура).

## 3. Контейнеры экранов

Глобальная замена `max-w-md` на ответственный паттерн:

- Лента/таблицы (медиатека, лиды, шаблоны, факторинг): `max-w-6xl`, сетка `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`.
- Формы (создание ассистента, сайт, публикация, профиль, подписка): `max-w-2xl` на desktop, две колонки на широких экранах где это естественно (например, профиль: слева профиль, справа план).
- Чат-тест: на desktop — параметры сайдбаром слева, диалог справа.
- Видео-студия и аватары/голоса: уже имеют сайдбар → выровнять под общий AppShell.

## 4. Премиум-отделка

- Hero-карусель: бордеры через `bg-gradient` + inner `bg-card`, мягкое свечение на hover (без неона).
- Карточки сценариев: добавить тонкий внутренний highlight `inset 0 1px 0 rgba(255,255,255,.04)`.
- Кнопки: единая система `Button` варианты `primary` (warm gradient), `secondary` (surface-2 + border-subtle), `ghost`.
- Бейджи: единый компонент `Badge` с вариантами `accent / success / warn / neutral`.
- Микро-анимации: `transition-[transform,background,border] duration-200`, активные тапы — `active:scale-[.98]`.

## 5. Покрытие экранов адаптивом (полный список)

Хаб, Онбординг (3 шага + итог), Pricing, Factory, Templates, Create, Tools index/detail, Media Library, Site, Site-Preview, Publish, Assistant-New, Assistant overview/chat-test/connect/leads, Knowledge, Video-Studio, Avatars-Studio, Voices-Studio, Profile, Subscription, Admin.

Для каждого:
- убрать жёсткий `max-w-md`,
- расставить `md:` / `lg:` варианты сетки,
- проверить, что таб-бар не перекрывает контент (добавить `pb-28 lg:pb-12`).

## 6. Тестирование

- Запустить встроенный `/admin → Адаптив` на всех маршрутах для трёх viewport (390 / 768 / 1280) — отчёт overflow == 0.
- Прогнать `/admin → E2E` 11 сценариев.
- Пройти Playwright-скриптом по 6 ключевым экранам и сделать скриншоты desktop+mobile, приложить выводы в финальный ответ.

## 7. Что НЕ меняется

- Структура маршрутов и компонентов.
- Тексты, заголовки, иконки, число элементов на экранах.
- Бизнес-логика и моки.

## Технические детали

- `AppShell` использует `useRouterState` для подсветки активной секции.
- Breakpoints — стандартные Tailwind: `md=768`, `lg=1024`, `xl=1280`.
- Все цвета остаются переменными CSS — RGB-редактор в админке продолжает работать.
- Geist подключается через `fonts.bunny.net` (CDN без блокировок), `font-family: "Geist", ui-sans-serif`.

## Объём работы

~22 файла маршрутов + 4 новых (`app-shell`, `sidebar-nav`, `button`, `badge`) + `styles.css` + `__root.tsx`. Ожидаемо 1 крупный проход правок.
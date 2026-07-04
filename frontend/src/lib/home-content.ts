// Контент главной страницы, редактируемый из админки (вкладка «Главная»).
// Бэкенд хранит произвольный JSON; фронт всегда мёржит его поверх дефолтов,
// поэтому лендинг работает даже если бэкенд недоступен или поле не заполнено.

export type HomeCat = "sites" | "videos" | "assistants";

export type HomeExample = {
  id: string;
  cat: HomeCat;
  tag: string;
  title: string;
  meta: string;
  description: string;
  /** URL обложки (загружается в админке). Если пусто — берётся дефолтная картинка по id. */
  cover?: string;
};

export type HomeSections = {
  models: boolean;
  solutions: boolean;
  how: boolean;
  examples: boolean;
  proof: boolean;
  pricing: boolean;
  faq: boolean;
};

export type HomeContent = {
  promo: { enabled: boolean; text: string; cta: string };
  hero: {
    badge: string;
    titlePrefix: string;
    titleAccent: string;
    titleSuffix: string;
    subtitle: string;
  };
  sections: HomeSections;
  examples: HomeExample[];
};

export const HOME_DEFAULTS: HomeContent = {
  promo: {
    enabled: true,
    text: "3 бесплатные генерации после регистрации, без карты",
    cta: "Забрать",
  },
  hero: {
    badge: "Запущена версия 1.0, бета бесплатно",
    titlePrefix: "Запусти продажи за минуту:",
    titleAccent: "сайт, ассистент и видео",
    titleSuffix: "на одном AI",
    subtitle:
      "Загрузи фото или вставь ссылку, neeklo соберёт сайт, AI-ассистента для заявок и до 200 видео. Публикуем за тебя.",
  },
  sections: {
    models: true,
    solutions: true,
    how: true,
    examples: true,
    proof: true,
    pricing: true,
    faq: true,
  },
  examples: [
    { id: "nails", cat: "sites", tag: "Сайт", title: "Сайт для мастера маникюра", meta: "Лендинг • опубликован", description: "Одностраничник с прайсом, портфолио и онлайн-записью. Собран за 3 минуты и опубликован на поддомене neeklo.app." },
    { id: "unbox", cat: "videos", tag: "Видео", title: "Reels-распаковка", meta: "9:16 • 2.1K просмотров", description: "Вертикальный ролик 9:16 из одного фото товара, AI смонтировал распаковку с подписями и музыкой." },
    { id: "avito", cat: "assistants", tag: "Ассистент", title: "Ассистент для Avito", meta: "47 диалогов за сутки", description: "AI-ассистент ловит сообщения с Avito, отвечает по базе знаний и квалифицирует лида для менеджера." },
    { id: "coffee", cat: "sites", tag: "Сайт", title: "Сайт кофейни на районе", meta: "Меню + доставка", description: "Сайт кофейни с меню, фото и кнопкой заказа в один клик. Подключён собственный домен." },
    { id: "avatar", cat: "videos", tag: "Видео", title: "AI-аватар ведёт блог", meta: "12 роликов / неделя", description: "AI-аватар озвучивает сценарии и публикует 12 роликов в неделю в Reels и TikTok без участия автора." },
    { id: "tg", cat: "assistants", tag: "Ассистент", title: "Менеджер в Telegram", meta: "Квалифицирует лидов", description: "Ассистент в Telegram-боте принимает заявки, задаёт уточняющие вопросы и передаёт горячий лид в CRM." },
    { id: "studio", cat: "sites", tag: "Сайт", title: "Студия керамики", meta: "Каталог + запись", description: "Каталог изделий, расписание мастер-классов и форма записи. SEO-разметка и og:image из коробки." },
    { id: "trend", cat: "videos", tag: "Видео", title: "Тренд недели", meta: "200 видео / день", description: "Контент-завод генерирует до 200 вариаций под тренд из одного исходника и публикует по расписанию." },
  ],
};

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Аккуратно мёржит сохранённый JSON поверх дефолтов. Невалидные поля игнорируются. */
export function mergeHome(stored: unknown): HomeContent {
  if (!isObj(stored)) return HOME_DEFAULTS;
  const s = stored as Partial<HomeContent>;
  return {
    promo: { ...HOME_DEFAULTS.promo, ...(isObj(s.promo) ? s.promo : {}) },
    hero: { ...HOME_DEFAULTS.hero, ...(isObj(s.hero) ? s.hero : {}) },
    sections: { ...HOME_DEFAULTS.sections, ...(isObj(s.sections) ? s.sections : {}) },
    examples:
      Array.isArray(s.examples) && s.examples.length > 0
        ? (s.examples as HomeExample[])
        : HOME_DEFAULTS.examples,
  };
}

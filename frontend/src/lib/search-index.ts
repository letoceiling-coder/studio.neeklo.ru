// Global search index — мок-данные для палитры Cmd+K.
// Объединяет ассеты, проекты, мудборды и инструменты в один список Result.
import {
  Camera, Film, Sparkles, Zap, Wand2, Eraser, Maximize2,
  Mic2, Move3d, Boxes, Shuffle, ImagePlus, Scissors,
  type LucideIcon,
} from "lucide-react";
import { MOCK_ASSETS, type Asset } from "./asset-mocks";
import preset1 from "@/assets/preset-1.jpg";
import preset2 from "@/assets/preset-2.jpg";
import preset3 from "@/assets/preset-3.jpg";

export type SearchKind = "asset" | "project" | "moodboard" | "tool";

export type SearchResult = {
  id: string;
  kind: SearchKind;
  /** Что показывать как заголовок строки */
  title: string;
  /** Подзаголовок-метка справа от заголовка */
  subtitle?: string;
  /** Низ строки — для метаданных (тип, дата) */
  meta?: string;
  /** Куда переходить при клике */
  to: string;
  /** Превью-картинка либо градиент */
  cover?: string;
  gradient?: string;
  /** Иконка для строки без обложки (инструменты) */
  icon?: LucideIcon;
  /** Теги, по которым идёт текстовый поиск */
  tags: string[];
  /** Папка, к которой относится результат (только для ассетов) */
  folder?: string;
  /** ISO/мс — для сортировки и фильтра по дате */
  createdAt: number;
  /** Длительность для видео */
  duration?: string;
};

/* ────────── теги ────────── */

const CATEGORY_TAGS: Record<Asset["category"], string[]> = {
  photo:    ["фото", "photo"],
  video:    ["видео", "reels"],
  edited:   ["редактор", "правка"],
  enhanced: ["энхансер", "качество", "upscale"],
  threed:   ["3d", "объект"],
  motion:   ["motion", "анимация"],
  uploaded: ["загружено", "upload"],
};

const FOLDERS = ["Бренд · neeklo", "Reels · сентябрь", "Реф. палитры", "Без папки"];
function folderFor(id: string): string {
  const n = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return FOLDERS[n % FOLDERS.length];
}

function assetToResult(a: Asset): SearchResult {
  const words = a.title.toLowerCase().replace(/[·,.()]/g, " ").split(/\s+/).filter(Boolean);
  return {
    id: a.id,
    kind: "asset",
    title: a.title,
    subtitle: a.category === "video" ? "Видео" : a.category === "threed" ? "3D" : "Фото",
    meta: a.duration ? `${a.duration} · ${a.ratio}` : a.ratio,
    to: `/app/assets?asset=${a.id}`,
    cover: a.src,
    gradient: a.gradient,
    tags: Array.from(new Set([...words, ...CATEGORY_TAGS[a.category], a.kind])),
    folder: folderFor(a.id),
    createdAt: a.createdAt,
    duration: a.duration,
  };
}

/* ────────── проекты ────────── */

const DAY = 86_400_000;
const NOW = Date.now();

const PROJECTS: SearchResult[] = [
  {
    id: "p1", kind: "project", title: "Студия керамики «Глина»",
    subtitle: "Сайт", meta: "обновлён 2 ч назад",
    to: "/app/site", cover: preset2, createdAt: NOW - 2 * 3600_000,
    tags: ["сайт", "глина", "керамика", "лендинг", "site"],
  },
  {
    id: "p2", kind: "project", title: "Бариста-бот для кофейни",
    subtitle: "Ассистент", meta: "обновлён вчера",
    to: "/app/assistant/new", cover: preset1, createdAt: NOW - DAY,
    tags: ["ассистент", "бот", "кофе", "бариста", "assistant"],
  },
  {
    id: "p3", kind: "project", title: "Reels: распаковка iPhone 17",
    subtitle: "Видео", meta: "обновлён 2 дня назад",
    to: "/app/factory", cover: preset3, createdAt: NOW - 2 * DAY,
    tags: ["reels", "видео", "распаковка", "iphone", "video"],
  },
  {
    id: "p4", kind: "project", title: "Лендинг курса по фигуре",
    subtitle: "Кампания", meta: "обновлён неделю назад",
    to: "/app/projects", cover: preset2, createdAt: NOW - 7 * DAY,
    tags: ["кампания", "лендинг", "курс", "campaign"],
  },
  {
    id: "p5", kind: "project", title: "Avito-витрина: мебель на заказ",
    subtitle: "Кампания", meta: "обновлён 12 дней назад",
    to: "/app/projects", cover: preset1, createdAt: NOW - 12 * DAY,
    tags: ["avito", "витрина", "мебель", "campaign"],
  },
];

/* ────────── мудборды ────────── */

const MOODBOARDS: SearchResult[] = [
  {
    id: "m1", kind: "moodboard", title: "Тёплая графитовая палитра",
    subtitle: "Мудборд", meta: "18 изображений",
    to: "/app/moodboards?m=m1", cover: preset1,
    gradient: "from-amber-500 via-orange-400 to-rose-400",
    createdAt: NOW - 4 * DAY,
    tags: ["палитра", "графит", "тёплый", "moodboard", "цвета"],
  },
  {
    id: "m2", kind: "moodboard", title: "Минимализм · продакт-фото",
    subtitle: "Мудборд", meta: "24 изображения",
    to: "/app/moodboards?m=m2", cover: preset2,
    gradient: "from-emerald-500 via-teal-400 to-cyan-300",
    createdAt: NOW - 9 * DAY,
    tags: ["минимализм", "продукт", "фото", "moodboard"],
  },
  {
    id: "m3", kind: "moodboard", title: "Кинематографичные кадры",
    subtitle: "Мудборд", meta: "31 изображение",
    to: "/app/moodboards?m=m3", cover: preset3,
    gradient: "from-indigo-500 via-blue-400 to-sky-300",
    createdAt: NOW - 20 * DAY,
    tags: ["кино", "кадры", "moodboard", "cinematic"],
  },
  {
    id: "m4", kind: "moodboard", title: "Reels-референсы · сентябрь",
    subtitle: "Мудборд", meta: "12 изображений",
    to: "/app/moodboards?m=m4", cover: preset1,
    gradient: "from-violet-500 via-fuchsia-400 to-pink-300",
    createdAt: NOW - 30 * DAY,
    tags: ["reels", "референсы", "moodboard", "сентябрь"],
  },
];

/* ────────── инструменты ────────── */

const TOOLS: SearchResult[] = [
  { id: "t-photo",     kind: "tool", title: "Фото",              subtitle: "Инструмент", to: "/app/tools/photo",      icon: Camera,    tags: ["фото", "генерация", "photo"],            createdAt: 0 },
  { id: "t-video",     kind: "tool", title: "Видео",             subtitle: "Инструмент", to: "/app/tools/video",      icon: Film,      tags: ["видео", "генерация", "video"],           createdAt: 0 },
  { id: "t-realtime",  kind: "tool", title: "Realtime",          subtitle: "Инструмент", to: "/app/tools/realtime",   icon: Zap,       tags: ["realtime", "лайв", "живая"],             createdAt: 0 },
  { id: "t-enhancer",  kind: "tool", title: "Энхансер",          subtitle: "Инструмент", to: "/app/tools/enhancer",   icon: Sparkles,  tags: ["энхансер", "качество", "upscale"],       createdAt: 0 },
  { id: "t-editor",    kind: "tool", title: "Редактор",          subtitle: "Инструмент", to: "/app/tools/editor",     icon: Wand2,     tags: ["редактор", "правка", "editor"],          createdAt: 0 },
  { id: "t-remove-bg", kind: "tool", title: "Убрать фон",        subtitle: "Инструмент", to: "/app/tools/remove-bg",  icon: Eraser,    tags: ["фон", "вырез", "background"],            createdAt: 0 },
  { id: "t-upscale",   kind: "tool", title: "Апскейл",           subtitle: "Инструмент", to: "/app/tools/upscale",    icon: Maximize2, tags: ["апскейл", "качество", "upscale"],        createdAt: 0 },
  { id: "t-lipsync",   kind: "tool", title: "Липсинк",           subtitle: "Инструмент", to: "/app/tools/lipsync",    icon: Mic2,      tags: ["липсинк", "губы", "lipsync"],            createdAt: 0 },
  { id: "t-motion",    kind: "tool", title: "Перенос движения",  subtitle: "Инструмент", to: "/app/tools/motion",     icon: Move3d,    tags: ["motion", "анимация", "движение"],        createdAt: 0 },
  { id: "t-3d",        kind: "tool", title: "3D-объекты",        subtitle: "Инструмент", to: "/app/tools/3d",         icon: Boxes,     tags: ["3d", "модель", "объект"],                createdAt: 0 },
  { id: "t-restyle",   kind: "tool", title: "Рестайл видео",     subtitle: "Инструмент", to: "/app/tools/restyle",    icon: Shuffle,   tags: ["рестайл", "видео", "restyle"],           createdAt: 0 },
  { id: "t-genphoto",  kind: "tool", title: "Сгенерировать фото",subtitle: "Инструмент", to: "/app/tools/generate-photo", icon: ImagePlus, tags: ["фото", "генерация"],                 createdAt: 0 },
  { id: "t-genvideo",  kind: "tool", title: "Сгенерировать видео",subtitle: "Инструмент",to: "/app/tools/generate-video", icon: Film,      tags: ["видео", "генерация"],                createdAt: 0 },
  { id: "t-cut",       kind: "tool", title: "Монтаж",            subtitle: "Инструмент", to: "/app/tools/edit-video", icon: Scissors,  tags: ["монтаж", "нарезка"],                     createdAt: 0 },
];

/* ────────── индекс + поиск ────────── */

export const SEARCH_INDEX: SearchResult[] = [
  ...MOCK_ASSETS.map(assetToResult),
  ...PROJECTS,
  ...MOODBOARDS,
  ...TOOLS,
];

export const ALL_FOLDERS = FOLDERS;

export type SearchFilters = {
  type: "all" | "photo" | "video" | "3d";
  date: "any" | "today" | "week" | "month";
  folder: "all" | string;
  tag: string; // одно слово, опционально
};

export const EMPTY_FILTERS: SearchFilters = {
  type: "all", date: "any", folder: "all", tag: "",
};

function matchesType(r: SearchResult, type: SearchFilters["type"]) {
  if (type === "all") return true;
  const sub = (r.subtitle ?? "").toLowerCase();
  if (type === "photo") return sub.includes("фото") || r.tags.includes("фото");
  if (type === "video") return sub.includes("видео") || r.tags.includes("видео") || r.tags.includes("reels");
  if (type === "3d")    return sub.includes("3d") || r.tags.includes("3d");
  return true;
}

function matchesDate(r: SearchResult, d: SearchFilters["date"]) {
  if (d === "any" || r.createdAt === 0) return true;
  const diff = Date.now() - r.createdAt;
  if (d === "today") return diff < DAY;
  if (d === "week")  return diff < 7 * DAY;
  if (d === "month") return diff < 30 * DAY;
  return true;
}

/** Главный фильтр. kind === "all" возвращает все вкладки. */
export function searchAll(
  query: string,
  kind: SearchKind | "all",
  filters: SearchFilters,
): SearchResult[] {
  const q = query.trim().toLowerCase();
  const tag = filters.tag.trim().toLowerCase();
  return SEARCH_INDEX.filter((r) => {
    if (kind !== "all" && r.kind !== kind) return false;
    if (!matchesType(r, filters.type)) return false;
    if (!matchesDate(r, filters.date)) return false;
    if (filters.folder !== "all" && r.kind === "asset" && r.folder !== filters.folder) return false;
    if (filters.folder !== "all" && r.kind !== "asset") return false;
    if (tag && !r.tags.some((t) => t.includes(tag))) return false;
    if (!q) return true;
    if (r.title.toLowerCase().includes(q)) return true;
    if (r.tags.some((t) => t.includes(q))) return true;
    return false;
  }).sort((a, b) => b.createdAt - a.createdAt);
}

export function countsByKind(query: string, filters: SearchFilters) {
  const base = searchAll(query, "all", filters);
  return {
    all:       base.length,
    asset:     base.filter((r) => r.kind === "asset").length,
    project:   base.filter((r) => r.kind === "project").length,
    moodboard: base.filter((r) => r.kind === "moodboard").length,
    tool:      base.filter((r) => r.kind === "tool").length,
  };
}

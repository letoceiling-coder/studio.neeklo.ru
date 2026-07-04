// Mock dataset for the unified /app/assets browser.
// Categories extend the basic MediaItem.kind with editorial buckets the UI groups by.
import type { MediaItem } from "./media-store";
import preset1 from "@/assets/preset-1.jpg";
import preset2 from "@/assets/preset-2.jpg";
import preset3 from "@/assets/preset-3.jpg";

export type AssetCategory =
  | "photo"
  | "video"
  | "edited"
  | "enhanced"
  | "threed"
  | "motion"
  | "uploaded";

export type Asset = MediaItem & {
  category: AssetCategory;
  /** Whether the asset is shared with the user (vs. created by them). */
  shared?: boolean;
};

const COVERS = [preset1, preset2, preset3];

const TITLES: Array<{ t: string; c: AssetCategory; k: MediaItem["kind"]; r: MediaItem["ratio"]; d?: string }> = [
  { t: "Распаковка iPhone 17",        c: "video",    k: "video", r: "9:16", d: "0:42" },
  { t: "Студийный портрет",            c: "photo",    k: "photo", r: "1:1" },
  { t: "Лина · презентер",             c: "photo",    k: "avatar", r: "3:4" },
  { t: "Кейс мастера керамики",        c: "video",    k: "video", r: "16:9", d: "1:18" },
  { t: "Обложка курса · апскейл",      c: "enhanced", k: "photo", r: "16:9" },
  { t: "Ретушь продукт-фото",          c: "edited",   k: "photo", r: "1:1" },
  { t: "Замена фона · кресло",         c: "edited",   k: "photo", r: "3:4" },
  { t: "3D · ваза «Глина»",            c: "threed",   k: "photo", r: "1:1" },
  { t: "3D · упаковка кофе",           c: "threed",   k: "photo", r: "3:4" },
  { t: "Motion transfer · танец",      c: "motion",   k: "video", r: "9:16", d: "0:18" },
  { t: "Motion transfer · бариста",    c: "motion",   k: "video", r: "9:16", d: "0:22" },
  { t: "Reels · тренд недели",         c: "video",    k: "video", r: "9:16", d: "0:35" },
  { t: "Reels · до/после",             c: "video",    k: "video", r: "9:16", d: "0:28" },
  { t: "Кампания «Осень» · кадр 1",    c: "photo",    k: "photo", r: "1:1" },
  { t: "Кампания «Осень» · кадр 2",    c: "photo",    k: "photo", r: "1:1" },
  { t: "Кампания «Осень» · кадр 3",    c: "photo",    k: "photo", r: "1:1" },
  { t: "Энхансер · ретро-фото",        c: "enhanced", k: "photo", r: "3:4" },
  { t: "Энхансер · логотип 8K",        c: "enhanced", k: "photo", r: "1:1" },
  { t: "Загружено · brief.pdf cover",  c: "uploaded", k: "photo", r: "16:9" },
  { t: "Загружено · мудборд",          c: "uploaded", k: "photo", r: "3:4" },
  { t: "Загружено · ref-палитра",      c: "uploaded", k: "photo", r: "1:1" },
  { t: "Видео-тизер бренда",           c: "video",    k: "video", r: "16:9", d: "0:54" },
  { t: "Сторис · промо-код",           c: "video",    k: "video", r: "9:16", d: "0:12" },
  { t: "Редактор · обрезка постера",   c: "edited",   k: "photo", r: "9:16" },
  { t: "Редактор · цветокор",          c: "edited",   k: "photo", r: "1:1" },
  { t: "3D · логотип neeklo",          c: "threed",   k: "photo", r: "1:1" },
  { t: "Motion transfer · спортсмен",  c: "motion",   k: "video", r: "9:16", d: "0:24" },
  { t: "Энхансер · скриншот сайта",    c: "enhanced", k: "photo", r: "16:9" },
  { t: "Видео · отзыв клиента",        c: "video",    k: "video", r: "9:16", d: "0:46" },
];

const GRADIENTS = [
  "from-rose-500 via-orange-400 to-amber-300",
  "from-sky-500 via-cyan-400 to-emerald-300",
  "from-violet-500 via-fuchsia-400 to-pink-300",
  "from-amber-500 via-orange-400 to-rose-400",
  "from-emerald-500 via-teal-400 to-cyan-300",
  "from-indigo-500 via-blue-400 to-sky-300",
  "from-fuchsia-500 via-pink-400 to-rose-300",
];

const DAY = 86_400_000;
// Spread createdAt across today / yesterday / this week / earlier so the date
// grouping always shows multiple buckets.
const OFFSETS = [
  0, 3 * 3600_000, 6 * 3600_000, 10 * 3600_000,                 // today (4)
  DAY + 2 * 3600_000, DAY + 7 * 3600_000, DAY + 11 * 3600_000,  // yesterday (3)
  2 * DAY, 3 * DAY, 4 * DAY, 5 * DAY, 6 * DAY,                  // this week (5)
  8 * DAY, 10 * DAY, 12 * DAY, 14 * DAY, 18 * DAY, 22 * DAY,
  26 * DAY, 30 * DAY, 36 * DAY, 42 * DAY, 50 * DAY, 60 * DAY,
  70 * DAY, 80 * DAY, 95 * DAY, 110 * DAY, 130 * DAY,
];

const NOW = Date.now();

export const MOCK_ASSETS: Asset[] = TITLES.map((spec, i) => ({
  id: `mock_${i + 1}`,
  kind: spec.k,
  title: spec.t,
  duration: spec.d,
  ratio: spec.r,
  gradient: GRADIENTS[i % GRADIENTS.length],
  src: COVERS[i % COVERS.length],
  createdAt: NOW - (OFFSETS[i] ?? i * DAY),
  category: spec.c,
  shared: i % 7 === 3, // a few items are shared with the user
}));

/** Derive a category for items coming from the user's media-store. */
export function categoryFor(item: MediaItem): AssetCategory {
  if (item.kind === "video") return "video";
  if (item.kind === "avatar") return "photo";
  return "photo";
}

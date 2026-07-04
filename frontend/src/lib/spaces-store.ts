// localStorage-backed store for "Spaces" (workspace projects) shown at /app/projects.
// Each space groups generations onto a freeform board.
import { useEffect, useState } from "react";
import preset1 from "@/assets/preset-1.jpg";
import preset2 from "@/assets/preset-2.jpg";
import preset3 from "@/assets/preset-3.jpg";
import preset4 from "@/assets/preset-4.jpg";
import preset5 from "@/assets/preset-5.jpg";
import preset6 from "@/assets/preset-6.jpg";

export type SpaceAsset = {
  id: string;
  src: string;
  /** position on the board canvas, in px relative to a 1200×800 logical area */
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
};

export type Space = {
  id: string;
  title: string;
  cover?: string;
  assets: SpaceAsset[];
  createdAt: number;
  favorite?: boolean;
  trashed?: boolean;
};

const KEY = "lovable-spaces";
const EVENT = "spaces-store-changed";

const PRESETS = [preset1, preset2, preset3, preset4, preset5, preset6];

function makeBoard(seed: number, count: number): SpaceAsset[] {
  const out: SpaceAsset[] = [];
  let x = 40;
  let y = 40;
  for (let i = 0; i < count; i++) {
    const w = 220 + ((seed * (i + 1)) % 90);
    const h = 160 + ((seed * (i + 2)) % 80);
    out.push({
      id: `a_${seed}_${i}`,
      src: PRESETS[(seed + i) % PRESETS.length],
      x,
      y,
      w,
      h,
      label: ["Кадр", "Сцена", "Ракурс", "Палитра", "Стиль", "Финал"][i % 6],
    });
    x += w + 24;
    if (x > 900) {
      x = 40 + ((i * 30) % 80);
      y += 220;
    }
  }
  return out;
}

const NOW = Date.now();
const DAY = 86400000;

const SEED: Space[] = [
  {
    id: "sp-1",
    title: "Кампания Весна · одежда",
    assets: makeBoard(1, 8),
    cover: preset1,
    createdAt: NOW - DAY * 2,
    favorite: true,
  },
  {
    id: "sp-2",
    title: "AI-ассистент клиники",
    assets: makeBoard(2, 6),
    cover: preset2,
    createdAt: NOW - DAY * 5,
  },
  {
    id: "sp-3",
    title: "Промо · кофейня у моря",
    assets: makeBoard(3, 7),
    cover: preset3,
    createdAt: NOW - DAY * 12,
  },
  {
    id: "sp-4",
    title: "Лукбук · осенняя капсула",
    assets: makeBoard(4, 9),
    cover: preset4,
    createdAt: NOW - DAY * 40,
    favorite: true,
  },
  {
    id: "sp-5",
    title: "Сайт студии керамики",
    assets: makeBoard(5, 5),
    cover: preset5,
    createdAt: NOW - DAY * 55,
  },
  {
    id: "sp-6",
    title: "Тизеры для маркетплейса",
    assets: makeBoard(6, 8),
    cover: preset6,
    createdAt: NOW - DAY * 80,
  },
];

function read(): Space[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as Space[];
  } catch {
    return SEED;
  }
}

function write(items: Space[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function listSpaces(): Space[] {
  return read().sort((a, b) => b.createdAt - a.createdAt);
}

export function getSpace(id: string): Space | undefined {
  return read().find((s) => s.id === id);
}

export function createSpace(title: string): Space {
  const items = read();
  const next: Space = {
    id: `sp_${Date.now().toString(36)}`,
    title,
    assets: [],
    createdAt: Date.now(),
  };
  write([next, ...items]);
  return next;
}

export function updateSpace(id: string, patch: Partial<Space>) {
  write(read().map((s) => (s.id === id ? { ...s, ...patch } : s)));
}

export function toggleFavorite(id: string) {
  const items = read();
  const target = items.find((s) => s.id === id);
  if (!target) return;
  write(items.map((s) => (s.id === id ? { ...s, favorite: !s.favorite } : s)));
}

export function trashSpace(id: string) {
  write(read().map((s) => (s.id === id ? { ...s, trashed: true } : s)));
}

export function restoreSpace(id: string) {
  write(read().map((s) => (s.id === id ? { ...s, trashed: false } : s)));
}

export function useSpaces() {
  const [items, setItems] = useState<Space[]>(() =>
    typeof window === "undefined" ? [] : listSpaces(),
  );
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setItems(listSpaces());
      setLoading(false);
    }, 240);
    const refresh = () => setItems(listSpaces());
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return { items, loading };
}

export function useSpace(id: string) {
  const [space, setSpace] = useState<Space | undefined>(() =>
    typeof window === "undefined" ? undefined : getSpace(id),
  );
  useEffect(() => {
    const refresh = () => setSpace(getSpace(id));
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [id]);
  return space;
}

/* ────────── group by month ────────── */

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export function groupByMonth(items: Space[]): Array<{ key: string; label: string; items: Space[] }> {
  const map = new Map<string, { label: string; items: Space[] }>();
  for (const s of items) {
    const d = new Date(s.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const now = new Date();
    const sameYear = d.getFullYear() === now.getFullYear();
    const label = sameYear ? MONTHS[d.getMonth()] : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (!map.has(key)) map.set(key, { label, items: [] });
    map.get(key)!.items.push(s);
  }
  return Array.from(map.entries()).map(([key, v]) => ({ key, label: v.label, items: v.items }));
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} дн назад`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} нед назад`;
  const mo = Math.floor(d / 30);
  return `${mo} мес назад`;
}

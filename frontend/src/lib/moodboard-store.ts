// localStorage-backed store for moodboards.
// Presets are read-only, user boards can be created and have images added.
import { useEffect, useState } from "react";
import preset1 from "@/assets/preset-1.jpg";
import preset2 from "@/assets/preset-2.jpg";
import preset3 from "@/assets/preset-3.jpg";
import preset4 from "@/assets/preset-4.jpg";
import preset5 from "@/assets/preset-5.jpg";
import preset6 from "@/assets/preset-6.jpg";

export type MoodboardImage = { id: string; src: string };

export type Moodboard = {
  id: string;
  title: string;
  description?: string;
  gradient: string;
  isPreset?: boolean;
  cover?: string;
  images: MoodboardImage[];
  createdAt: number;
  updatedAt: number;
};

export const MAX_IMAGES = 250;

export const PRESET_MOODBOARDS: Moodboard[] = [
  {
    id: "p-retro-web",
    title: "Ретро-веб",
    description: "Пиксельные градиенты, Y2K-кнопки, веб-1.0 шрифты.",
    gradient: "from-fuchsia-500 via-pink-400 to-rose-300",
    isPreset: true,
    cover: preset3,
    images: [preset3, preset5, preset1, preset6, preset2, preset4, preset3, preset5, preset1, preset6, preset2, preset4].map(
      (src, i) => ({ id: `p-retro-${i}`, src }),
    ),
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "p-futur-glam",
    title: "Футур-глэм",
    description: "Хром, латекс, неоновые рефлексы, бьюти-съёмка.",
    gradient: "from-indigo-500 via-violet-400 to-fuchsia-400",
    isPreset: true,
    cover: preset2,
    images: [preset2, preset4, preset6, preset1, preset5, preset3, preset2, preset4, preset6, preset1, preset5, preset3, preset2, preset4].map(
      (src, i) => ({ id: `p-fut-${i}`, src }),
    ),
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "p-coquette",
    title: "Кокетт",
    description: "Банты, кружево, пастель, ленты, мягкий девичий стиль.",
    gradient: "from-pink-400 via-rose-300 to-amber-200",
    isPreset: true,
    cover: preset1,
    images: [preset1, preset6, preset3, preset5, preset2, preset4, preset1, preset6, preset3].map(
      (src, i) => ({ id: `p-coq-${i}`, src }),
    ),
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "p-cyber-zine",
    title: "Кибер-зин",
    description: "Глитч, ксерокс, кислотные акценты, зинная вёрстка.",
    gradient: "from-emerald-500 via-teal-400 to-cyan-300",
    isPreset: true,
    cover: preset4,
    images: [preset4, preset2, preset6, preset3, preset5, preset1, preset4, preset2, preset6, preset3, preset5, preset1, preset4, preset2, preset6, preset3].map(
      (src, i) => ({ id: `p-cyb-${i}`, src }),
    ),
    createdAt: 0,
    updatedAt: 0,
  },
];

const KEY = "lovable-moodboards";
const SELECTED_KEY = "lovable-selected-moodboard";
const EVENT = "moodboard-store-changed";

const GRADIENTS = [
  "from-amber-500 via-orange-400 to-rose-400",
  "from-sky-500 via-cyan-400 to-emerald-300",
  "from-violet-500 via-fuchsia-400 to-pink-300",
  "from-emerald-500 via-teal-400 to-cyan-300",
  "from-rose-500 via-orange-400 to-amber-300",
];

export function pickGradient(seed = Date.now()) {
  return GRADIENTS[Math.abs(Math.floor(seed)) % GRADIENTS.length];
}

const SEED: Moodboard[] = [
  {
    id: "u-warm-graphite",
    title: "Тёплая графитовая палитра",
    description: "Референсы под основной бренд: графит, охра, тёплый свет.",
    gradient: GRADIENTS[0],
    cover: preset1,
    images: [preset1, preset3, preset5, preset2, preset6].map((src, i) => ({
      id: `u-wg-${i}`,
      src,
    })),
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000,
  },
];

function read(): Moodboard[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as Moodboard[];
  } catch {
    return SEED;
  }
}

function write(items: Moodboard[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function listUserMoodboards(): Moodboard[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function listAllMoodboards(): Moodboard[] {
  return [...listUserMoodboards(), ...PRESET_MOODBOARDS];
}

export function getMoodboard(id: string): Moodboard | undefined {
  return [...read(), ...PRESET_MOODBOARDS].find((m) => m.id === id);
}

export function createMoodboard(input: { title: string; description?: string }) {
  const items = read();
  const now = Date.now();
  const board: Moodboard = {
    id: `mb_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    title: input.title.trim() || "Без названия",
    description: input.description?.trim(),
    gradient: pickGradient(now),
    images: [],
    createdAt: now,
    updatedAt: now,
  };
  write([board, ...items]);
  return board;
}

export function addImagesToMoodboard(id: string, srcs: string[]) {
  const items = read();
  const idx = items.findIndex((m) => m.id === id);
  if (idx === -1) return;
  const board = items[idx];
  const next = [...board.images];
  for (const src of srcs) {
    if (next.length >= MAX_IMAGES) break;
    next.push({ id: `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, src });
  }
  const updated: Moodboard = {
    ...board,
    images: next,
    cover: board.cover ?? next[0]?.src,
    updatedAt: Date.now(),
  };
  items[idx] = updated;
  write(items);
}

export function removeImageFromMoodboard(boardId: string, imageId: string) {
  const items = read();
  const idx = items.findIndex((m) => m.id === boardId);
  if (idx === -1) return;
  const board = items[idx];
  items[idx] = {
    ...board,
    images: board.images.filter((i) => i.id !== imageId),
    updatedAt: Date.now(),
  };
  write(items);
}

export function deleteMoodboard(id: string) {
  write(read().filter((m) => m.id !== id));
}

/* ─── selection (for studio model picker) ─── */
export type MoodboardSelectionId = "auto" | "random" | string;

export function getSelectedMoodboard(): MoodboardSelectionId | null {
  if (typeof window === "undefined") return null;
  try {
    return (localStorage.getItem(SELECTED_KEY) as MoodboardSelectionId) || null;
  } catch {
    return null;
  }
}

export function setSelectedMoodboard(value: MoodboardSelectionId | null) {
  if (typeof window === "undefined") return;
  if (value === null) localStorage.removeItem(SELECTED_KEY);
  else localStorage.setItem(SELECTED_KEY, value);
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function resolveMoodboardLabel(value: MoodboardSelectionId | null): string | null {
  if (!value) return null;
  if (value === "auto") return "Авто-мудборд";
  if (value === "random") {
    const all = listAllMoodboards();
    return all.length ? `Случайный · ${all[Math.floor(Math.random() * all.length)].title}` : "Случайный мудборд";
  }
  return getMoodboard(value)?.title ?? null;
}

export function useMoodboards() {
  const [items, setItems] = useState<Moodboard[]>(() =>
    typeof window === "undefined" ? [] : listUserMoodboards(),
  );
  const [presets] = useState<Moodboard[]>(PRESET_MOODBOARDS);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setItems(listUserMoodboards());
      setLoading(false);
    }, 220);
    const refresh = () => setItems(listUserMoodboards());
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return { items, presets, loading };
}

export function useSelectedMoodboard() {
  const [value, setValue] = useState<MoodboardSelectionId | null>(() =>
    typeof window === "undefined" ? null : getSelectedMoodboard(),
  );
  useEffect(() => {
    const refresh = () => setValue(getSelectedMoodboard());
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return [value, setSelectedMoodboard] as const;
}

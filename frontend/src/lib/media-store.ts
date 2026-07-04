// localStorage-backed store for saved generations shown in /app/media.
import { useEffect, useState } from "react";

export type MediaKind = "video" | "photo" | "avatar";

export type MediaItem = {
  id: string;
  kind: MediaKind;
  title: string;
  duration?: string;
  ratio: "9:16" | "1:1" | "16:9" | "3:4";
  gradient: string;
  src?: string; // optional preview image
  createdAt: number;
};

const KEY = "lovable-media-items";
const EVENT = "media-store-changed";

const GRADIENTS = [
  "from-rose-500 via-orange-400 to-amber-300",
  "from-sky-500 via-cyan-400 to-emerald-300",
  "from-violet-500 via-fuchsia-400 to-pink-300",
  "from-amber-500 via-orange-400 to-rose-400",
  "from-emerald-500 via-teal-400 to-cyan-300",
  "from-indigo-500 via-blue-400 to-sky-300",
  "from-fuchsia-500 via-pink-400 to-rose-300",
];

export function pickGradient(seed = Date.now()) {
  return GRADIENTS[Math.abs(Math.floor(seed)) % GRADIENTS.length];
}

const SEED: MediaItem[] = [
  { id: "seed-1", kind: "video", title: "Распаковка iPhone 17", duration: "0:42", ratio: "9:16", gradient: GRADIENTS[0], createdAt: Date.now() - 86400000 * 2 },
  { id: "seed-2", kind: "photo", title: "Студийный портрет", ratio: "1:1", gradient: GRADIENTS[1], createdAt: Date.now() - 86400000 * 3 },
  { id: "seed-3", kind: "avatar", title: "Лина · презентер", ratio: "3:4", gradient: GRADIENTS[2], createdAt: Date.now() - 86400000 * 5 },
  { id: "seed-4", kind: "video", title: "Кейс мастера", duration: "1:18", ratio: "16:9", gradient: GRADIENTS[3], createdAt: Date.now() - 86400000 * 7 },
];

function read(): MediaItem[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as MediaItem[];
  } catch {
    return SEED;
  }
}

function write(items: MediaItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function listMedia(): MediaItem[] {
  return read().sort((a, b) => b.createdAt - a.createdAt);
}

export function addMedia(item: Omit<MediaItem, "id" | "createdAt"> & { id?: string }) {
  const items = read();
  const next: MediaItem = {
    id: item.id ?? `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    ...item,
  };
  write([next, ...items]);
  return next;
}

export function addMediaBatch(arr: Array<Omit<MediaItem, "id" | "createdAt">>) {
  const items = read();
  const created = arr.map((item, i) => ({
    id: `m_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now() - i,
    ...item,
  }));
  write([...created, ...items]);
  return created;
}

export function removeMedia(id: string) {
  write(read().filter((m) => m.id !== id));
}

export function useMediaList() {
  const [items, setItems] = useState<MediaItem[]>(() => (typeof window === "undefined" ? [] : listMedia()));
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    // brief simulated load so consumers can show a skeleton state
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setItems(listMedia());
      setLoading(false);
    }, 240);
    const refresh = () => setItems(listMedia());
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

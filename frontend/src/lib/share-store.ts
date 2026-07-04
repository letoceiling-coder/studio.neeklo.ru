// Mock short-link store: generates short ids and persists shareable payloads
// in localStorage. The /s/$id route reads them back for a public preview.
import type { MediaItem } from "@/lib/media-store";

const KEY = "neeklo.share.links";

export type ShareItem = {
  id: string;
  title: string;
  kind: MediaItem["kind"];
  ratio: MediaItem["ratio"];
  gradient: string;
  duration?: string;
  src?: string;
  createdAt: number;
};

function read(): Record<string, ShareItem> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, ShareItem>;
  } catch {
    return {};
  }
}

function write(map: Record<string, ShareItem>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}

export function createShareLink(item: Omit<ShareItem, "id" | "createdAt">): {
  id: string;
  url: string;
} {
  const id = Math.random().toString(36).slice(2, 8);
  const map = read();
  map[id] = { ...item, id, createdAt: Date.now() };
  write(map);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://neeklo.app";
  return { id, url: `${origin}/s/${id}` };
}

export function getShareItem(id: string): ShareItem | null {
  return read()[id] ?? null;
}

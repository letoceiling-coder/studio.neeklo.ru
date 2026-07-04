// Per-user favorites + folders, persisted in localStorage. Tiny & framework-free.
import { useEffect, useState } from "react";

const FAV_KEY = "neeklo-asset-favorites";
const FOLDER_KEY = "neeklo-asset-folders";
const FAV_EVENT = "asset-favorites-changed";
const FOLDER_EVENT = "asset-folders-changed";

export type Folder = { id: string; name: string; count: number; createdAt: number };

const SEED_FOLDERS: Folder[] = [
  { id: "f1", name: "Бренд · neeklo",  count: 12, createdAt: Date.now() - 86400000 * 12 },
  { id: "f2", name: "Reels · сентябрь", count: 8,  createdAt: Date.now() - 86400000 * 5 },
  { id: "f3", name: "Реф. палитры",     count: 5,  createdAt: Date.now() - 86400000 * 30 },
];

function readSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]"));
  } catch { return new Set(); }
}
function writeSet(s: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(s)));
  window.dispatchEvent(new CustomEvent(FAV_EVENT));
}

export function toggleFavorite(id: string) {
  const s = readSet();
  if (s.has(id)) s.delete(id); else s.add(id);
  writeSet(s);
}

export function useFavorites() {
  const [ids, setIds] = useState<Set<string>>(() => readSet());
  useEffect(() => {
    const refresh = () => setIds(readSet());
    window.addEventListener(FAV_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(FAV_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return ids;
}

function readFolders(): Folder[] {
  if (typeof window === "undefined") return SEED_FOLDERS;
  try {
    const raw = localStorage.getItem(FOLDER_KEY);
    if (!raw) { localStorage.setItem(FOLDER_KEY, JSON.stringify(SEED_FOLDERS)); return SEED_FOLDERS; }
    return JSON.parse(raw) as Folder[];
  } catch { return SEED_FOLDERS; }
}
function writeFolders(f: Folder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FOLDER_KEY, JSON.stringify(f));
  window.dispatchEvent(new CustomEvent(FOLDER_EVENT));
}

export function createFolder(name: string) {
  const f: Folder = { id: `f_${Date.now().toString(36)}`, name, count: 0, createdAt: Date.now() };
  writeFolders([f, ...readFolders()]);
  return f;
}

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>(() => readFolders());
  useEffect(() => {
    const refresh = () => setFolders(readFolders());
    window.addEventListener(FOLDER_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(FOLDER_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return folders;
}

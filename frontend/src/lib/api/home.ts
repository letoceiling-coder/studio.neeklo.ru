import { mergeHome, type HomeContent } from "../home-content";
import { apiFetch } from "./client";

/**
 * SSR-safe загрузка контента главной.
 * В браузере ходит на /api (nginx-прокси), на сервере (SSR) — на внутренний API.
 * При любой ошибке возвращает дефолты, чтобы лендинг никогда не падал.
 */
export async function fetchHomeContent(): Promise<HomeContent> {
  const base =
    typeof window === "undefined"
      ? process.env.API_INTERNAL_URL || "http://127.0.0.1:3016/api"
      : "/api";
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${base}/content/home`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) {
      const json = (await res.json()) as { value?: unknown };
      return mergeHome(json?.value);
    }
  } catch {
    /* используем дефолты */
  }
  return mergeHome(null);
}

/** Текущий сохранённый контент (для админки). Публичный GET. */
export async function getHomeRaw(): Promise<unknown> {
  const res = await apiFetch<{ value: unknown }>("/content/home", { auth: false });
  return res.value;
}

/** Сохранить контент главной (superadmin). */
export async function saveHome(value: HomeContent): Promise<void> {
  await apiFetch("/content/home", { method: "PUT", body: { value } });
}

/** Загрузить изображение (data:URL) и получить публичный URL (superadmin). */
export async function uploadHomeImage(dataUrl: string, name?: string): Promise<string> {
  const res = await apiFetch<{ url: string }>("/content/upload", {
    method: "POST",
    body: { dataUrl, name },
  });
  return res.url;
}

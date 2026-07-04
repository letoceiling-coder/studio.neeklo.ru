import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Единый источник «бесплатных дневных кредитов» для всего продукта.
 * Никаких локальных счётчиков по компонентам — топбар, пейволл, инлайн-нотисы
 * читают отсюда.
 */

const KEY = "neeklo.credits.free";
const RESET_KEY = "neeklo.credits.resetAt"; // ms timestamp of next reset
const SNOOZE_KEY = "neeklo.credits.snoozedUntil";
// Когда баланс приходит с сервера, локальный «дневной сброс» отключаем —
// источником правды становится backend (/credits + WS credits.changed).
const SERVER_KEY = "neeklo.credits.server";

function isServerMode(): boolean {
  try {
    return localStorage.getItem(SERVER_KEY) === "1";
  } catch {
    return false;
  }
}

/** Режим кошелька: "free" — дневные бесплатные генерации, "server" — реальные кредиты с backend. */
export type CreditsMode = "free" | "server";

export function getCreditsMode(): CreditsMode {
  return isServerMode() ? "server" : "free";
}

/** Реактивно следит за режимом кошелька (free/server). */
export function useCreditsMode(): CreditsMode {
  return useSyncExternalStore(
    subscribe,
    () => getCreditsMode(),
    () => "free" as CreditsMode,
  );
}

/** Правильное склонение слова «кредит». */
export function creditNoun(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "кредит";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "кредита";
  return "кредитов";
}

/** Сколько бесплатных генераций даём каждый день. */
export const DAILY_FREE_LIMIT = 3;

/** Что можно сделать на бесплатных кредитах (для мини-модалки). */
export const FREE_PERKS: string[] = [
  "Фото в Медиа-студии",
  "Короткое видео до 5 секунд",
  "Чат-тест ассистента",
  "Черновик одной страницы сайта",
];

const listeners = new Set<() => void>();

function nextMidnightMs(): number {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

function ensureDailyReset() {
  if (isServerMode()) return;
  try {
    const raw = localStorage.getItem(RESET_KEY);
    const at = raw ? parseInt(raw, 10) : 0;
    const now = Date.now();
    if (!at || now >= at) {
      localStorage.setItem(KEY, String(DAILY_FREE_LIMIT));
      localStorage.setItem(RESET_KEY, String(nextMidnightMs()));
      localStorage.removeItem(SNOOZE_KEY);
    }
  } catch {
    /* ignore */
  }
}

function read(): number {
  try {
    ensureDailyReset();
    const raw = localStorage.getItem(KEY);
    if (raw === null) {
      localStorage.setItem(KEY, String(DAILY_FREE_LIMIT));
      return DAILY_FREE_LIMIT;
    }
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? Math.max(0, n) : DAILY_FREE_LIMIT;
  } catch {
    return DAILY_FREE_LIMIT;
  }
}

function write(n: number) {
  try {
    localStorage.setItem(KEY, String(Math.max(0, n)));
  } catch {}
  listeners.forEach((l) => l());
}

export function getFreeCredits(): number {
  return read();
}

/** Записать баланс, пришедший с сервера (включает server-mode). */
export function setServerBalance(n: number) {
  try {
    localStorage.setItem(SERVER_KEY, "1");
    localStorage.setItem(KEY, String(Math.max(0, Math.floor(n))));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

/** Подтянуть актуальный баланс кредитов с backend. */
export async function hydrateCredits(): Promise<void> {
  try {
    const { apiFetch } = await import("./api/client");
    const res = await apiFetch<{ balance: number; planId: string }>("/credits");
    setServerBalance(res.balance);
  } catch {
    /* офлайн/гость — остаёмся на локальном значении */
  }
}

/** Сколько мс до сброса лимита. */
export function msUntilFreeReset(): number {
  try {
    ensureDailyReset();
    const raw = localStorage.getItem(RESET_KEY);
    const at = raw ? parseInt(raw, 10) : nextMidnightMs();
    return Math.max(0, at - Date.now());
  } catch {
    return nextMidnightMs() - Date.now();
  }
}

/** Try to consume N credits atomically. Returns true if all consumed. */
export function consumeFreeCredits(cost = 1): boolean {
  const n = read();
  if (n < cost) return false;
  write(n - cost);
  return true;
}

/** Back-compat: consume exactly 1. */
export function consumeFreeCredit(): boolean {
  return consumeFreeCredits(1);
}

export function resetFreeCredits(n = DAILY_FREE_LIMIT) {
  write(n);
  try {
    localStorage.setItem(RESET_KEY, String(nextMidnightMs()));
    localStorage.removeItem(SNOOZE_KEY);
  } catch {}
}

/** Grant bonus credits (promo codes, gifts). Returns the new balance. */
export function addFreeCredits(n: number): number {
  const next = Math.max(0, read() + Math.max(0, Math.floor(n)));
  write(next);
  return next;
}

/**
 * Возврат кредитов при ошибке генерации (ТЗ §2.5: «кредит за упавшую возвращён»).
 * В server-режиме кредитами управляет backend (резерв/возврат + ре-гидрация),
 * поэтому локально возвращаем ТОЛЬКО в free-режиме, чтобы не задваивать.
 */
export function refundCredits(n: number): void {
  if (getCreditsMode() !== "free") return;
  addFreeCredits(Math.max(0, Math.floor(n)));
}

/** «Напомнить завтра» — отложить пейволл до сброса лимита. */
export function snoozePaywallUntilTomorrow() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(nextMidnightMs()));
  } catch {}
}

export function isPaywallSnoozed(): boolean {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    return Date.now() < parseInt(raw, 10);
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === RESET_KEY) cb();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function useFreeCredits(): number {
  return useSyncExternalStore(
    subscribe,
    () => read(),
    () => DAILY_FREE_LIMIT,
  );
}

/** Тикающее «обновятся через 18 ч» — обновляется раз в минуту. */
export function useTimeUntilFreeReset(): { ms: number; label: string } {
  const [ms, setMs] = useState(() => msUntilFreeReset());
  useEffect(() => {
    setMs(msUntilFreeReset());
    const t = setInterval(() => setMs(msUntilFreeReset()), 60_000);
    return () => clearInterval(t);
  }, []);
  return { ms, label: formatUntil(ms) };
}

function formatUntil(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  if (totalMin <= 1) return "меньше минуты";
  if (totalMin < 60) return `${totalMin} мин`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 6) return `${h} ч`;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}

/* ---------- Paywall global trigger ---------- */

const PAYWALL_EVENT = "neeklo:paywall:open";

export type PaywallReason = "daily" | "credits";

export function openPaywall(reason: PaywallReason = "credits") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PAYWALL_EVENT, { detail: { reason } }));
  }
}

export function onPaywall(cb: (reason: PaywallReason) => void) {
  if (typeof window === "undefined") return () => {};
  const h = (e: Event) => {
    const detail = (e as CustomEvent<{ reason?: PaywallReason }>).detail;
    cb(detail?.reason ?? "credits");
  };
  window.addEventListener(PAYWALL_EVENT, h);
  return () => window.removeEventListener(PAYWALL_EVENT, h);
}

/**
 * Imperative gate. Consume `cost` credits and return true if allowed.
 * If not enough credits, opens the paywall and returns false.
 * Reason="daily" когда баланс бесплатных = 0 — показываем дневной вариант
 * («бесплатные на сегодня закончились, новые завтра»).
 */
export function tryGenerate(cost = 1): boolean {
  if (consumeFreeCredits(cost)) return true;
  const reason: PaywallReason = read() === 0 ? "daily" : "credits";
  openPaywall(reason);
  return false;
}

/**
 * Unified hook every generation entry-point uses.
 */
export type GenerationMeta = {
  title?: string;
  tool?: string;
  kind?: "image" | "video" | "site" | "assistant" | "enhancer" | "realtime";
  durationSec?: number;
};

export function useGeneration(opts: { cost?: number; meta?: GenerationMeta } = {}) {
  const cost = Math.max(1, opts.cost ?? 1);
  const credits = useFreeCredits();
  return {
    credits,
    cost,
    canRun: credits >= cost,
    start(action?: () => void | Promise<void>, metaOverride?: GenerationMeta): boolean {
      if (!tryGenerate(cost)) return false;
      try {
        const meta = { ...(opts.meta ?? {}), ...(metaOverride ?? {}) };
        void import("./queue-store").then(({ enqueueTask }) => {
          enqueueTask({
            title: meta.title ?? "Генерация",
            tool: meta.tool ?? "neeklo",
            kind: meta.kind ?? "image",
            cost,
            durationSec: meta.durationSec,
          });
        });
      } catch {
        /* queue is best-effort */
      }
      try {
        const r = action?.();
        if (r && typeof (r as Promise<unknown>).then === "function") {
          void (r as Promise<unknown>);
        }
      } catch (e) {
        console.error("[useGeneration] action threw:", e);
      }
      return true;
    },
  };
}

// Mock generation queue. A single global queue ticks tasks toward completion
// and emits change events so the /app/usage page reflects live progress.
// Other studios can call enqueueTask(...) to push their generations here.
import { useEffect, useState } from "react";

export type TaskStatus = "queued" | "rendering" | "ready" | "error" | "cancelled";
export type TaskKind = "image" | "video" | "site" | "assistant" | "enhancer" | "realtime";

export type QueueTask = {
  id: string;
  title: string;
  kind: TaskKind;
  tool: string;
  cost: number;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  progress: number; // 0..1
  etaSec?: number;
  durationSec: number; // total simulated time
  status: TaskStatus;
  error?: string;
  /** Synthetic error retries make the task fail at ~85% on first attempt. */
  forceFailOnce?: boolean;
  attempt: number;
};

const KEY = "neeklo.queue.tasks";
const EVENT = "neeklo:queue:changed";
const MAX_HISTORY = 60;

const NOW = Date.now();
const MIN = 60_000;

const SEED: QueueTask[] = [
  {
    id: "t-seed-1",
    title: "Кадр для лукбука · студия",
    kind: "image",
    tool: "Photo Studio",
    cost: 2,
    createdAt: NOW - 3 * MIN,
    startedAt: NOW - 3 * MIN + 5_000,
    progress: 0.34,
    etaSec: 26,
    durationSec: 38,
    status: "rendering",
    attempt: 1,
  },
  {
    id: "t-seed-2",
    title: "Тизер кампании Весна 6с",
    kind: "video",
    tool: "Video Studio",
    cost: 8,
    createdAt: NOW - 90_000,
    progress: 0,
    durationSec: 120,
    status: "queued",
    attempt: 1,
  },
  {
    id: "t-seed-3",
    title: "Сайт «Студия керамики»",
    kind: "site",
    tool: "AI-сайт",
    cost: 4,
    createdAt: NOW - 18 * MIN,
    startedAt: NOW - 18 * MIN + 2_000,
    finishedAt: NOW - 15 * MIN,
    progress: 1,
    durationSec: 180,
    status: "ready",
    attempt: 1,
  },
  {
    id: "t-seed-4",
    title: "Энхансер обложки до 4K",
    kind: "enhancer",
    tool: "Enhancer",
    cost: 1,
    createdAt: NOW - 42 * MIN,
    startedAt: NOW - 42 * MIN + 3_000,
    finishedAt: NOW - 42 * MIN + 28_000,
    progress: 1,
    durationSec: 25,
    status: "ready",
    attempt: 1,
  },
  {
    id: "t-seed-5",
    title: "Видео-аватар, английский голос",
    kind: "video",
    tool: "Video Studio",
    cost: 6,
    createdAt: NOW - 70 * MIN,
    startedAt: NOW - 70 * MIN + 6_000,
    finishedAt: NOW - 65 * MIN,
    progress: 0.85,
    durationSec: 220,
    status: "error",
    error: "Превышен лимит длительности на бесплатном тарифе",
    attempt: 1,
    forceFailOnce: true,
  },
];

function read(): QueueTask[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as QueueTask[];
  } catch {
    return SEED;
  }
}

function write(items: QueueTask[]) {
  if (typeof window === "undefined") return;
  const trimmed = items.slice(0, MAX_HISTORY);
  localStorage.setItem(KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function listTasks(): QueueTask[] {
  return read().sort((a, b) => b.createdAt - a.createdAt);
}

export function enqueueTask(
  input: Pick<QueueTask, "title" | "kind" | "tool" | "cost"> & {
    durationSec?: number;
    forceFailOnce?: boolean;
  },
): QueueTask {
  const t: QueueTask = {
    id: `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    title: input.title,
    kind: input.kind,
    tool: input.tool,
    cost: input.cost,
    createdAt: Date.now(),
    progress: 0,
    durationSec: input.durationSec ?? defaultDuration(input.kind),
    status: "queued",
    attempt: 1,
    forceFailOnce: input.forceFailOnce,
  };
  write([t, ...read()]);
  return t;
}

function defaultDuration(kind: TaskKind) {
  switch (kind) {
    case "video":
      return 120;
    case "site":
      return 180;
    case "image":
      return 30;
    case "enhancer":
      return 22;
    case "assistant":
      return 12;
    case "realtime":
      return 8;
  }
}

export function cancelTask(id: string) {
  write(
    read().map((t) =>
      t.id === id && (t.status === "queued" || t.status === "rendering")
        ? { ...t, status: "cancelled", finishedAt: Date.now() }
        : t,
    ),
  );
}

export function retryTask(id: string) {
  write(
    read().map((t) =>
      t.id === id && t.status === "error"
        ? {
            ...t,
            status: "queued",
            progress: 0,
            error: undefined,
            startedAt: undefined,
            finishedAt: undefined,
            etaSec: undefined,
            forceFailOnce: false,
            attempt: t.attempt + 1,
          }
        : t,
    ),
  );
}

export function clearFinished() {
  write(read().filter((t) => t.status === "queued" || t.status === "rendering"));
}

/* ──────── concurrency + tick loop ──────── */

import { getCurrentPlan, getPlanConcurrency } from "./plans";

export type Concurrency = { image: number; video: number };
/** Конкурентность активного тарифа. Единый источник — plans.ts. */
export function getActiveConcurrency(): Concurrency {
  return getPlanConcurrency(getCurrentPlan());
}
/** @deprecated читай getActiveConcurrency() — зависит от тарифа. */
export const DEFAULT_CONCURRENCY: Concurrency = { image: 2, video: 1 };

function activeCount(items: QueueTask[], kind: "image" | "video") {
  const group = kind === "video" ? ["video"] : ["image", "enhancer", "realtime", "site", "assistant"];
  return items.filter((t) => t.status === "rendering" && group.includes(t.kind)).length;
}

function tick(now: number, concurrency: Concurrency) {
  const items = read();
  let changed = false;
  const next = items.map((t) => ({ ...t }));

  // Promote queued -> rendering respecting concurrency
  for (const t of next) {
    if (t.status !== "queued") continue;
    const isVideo = t.kind === "video";
    const cap = isVideo ? concurrency.video : concurrency.image;
    if (activeCount(next, isVideo ? "video" : "image") >= cap) continue;
    t.status = "rendering";
    t.startedAt = now;
    t.progress = 0.02;
    t.etaSec = t.durationSec;
    changed = true;
  }

  // Advance rendering tasks
  for (const t of next) {
    if (t.status !== "rendering") continue;
    const started = t.startedAt ?? now;
    const elapsed = (now - started) / 1000;
    const p = Math.min(1, elapsed / t.durationSec);
    if (p !== t.progress) {
      t.progress = p;
      t.etaSec = Math.max(0, Math.round(t.durationSec - elapsed));
      changed = true;
    }
    if (p >= 0.85 && t.forceFailOnce) {
      t.status = "error";
      t.error = "Сервер вернул ошибку рендера. Попробуй ещё раз.";
      t.finishedAt = now;
      t.forceFailOnce = false;
      changed = true;
      continue;
    }
    if (p >= 1) {
      t.status = "ready";
      t.finishedAt = now;
      t.etaSec = 0;
      changed = true;
    }
  }

  if (changed) write(next);
}

let started = false;
export function ensureQueueLoopStarted() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.setInterval(() => tick(Date.now(), getActiveConcurrency()), 800);
}


/* ──────── hooks ──────── */

export function useQueue() {
  const [items, setItems] = useState<QueueTask[]>(() =>
    typeof window === "undefined" ? [] : listTasks(),
  );
  useEffect(() => {
    ensureQueueLoopStarted();
    const refresh = () => setItems(listTasks());
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return items;
}

/* ──────── usage history (mock) ──────── */

export type UsagePoint = { date: string; label: string; credits: number };

export function getUsageHistory(days = 14): UsagePoint[] {
  const out: UsagePoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // deterministic pseudo-random
    const seed = d.getDate() * 7 + d.getMonth() * 13;
    const base = 12 + (seed % 28);
    const spike = i % 6 === 0 ? 22 : 0;
    out.push({
      date: d.toISOString().slice(0, 10),
      label: `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`,
      credits: base + spike,
    });
  }
  return out;
}

export type ToolSpend = {
  tool: string;
  kind: TaskKind;
  runs: number;
  credits: number;
  avgSec: number;
};

export function getToolBreakdown(): ToolSpend[] {
  return [
    { tool: "Photo Studio", kind: "image", runs: 184, credits: 312, avgSec: 28 },
    { tool: "Video Studio", kind: "video", runs: 42, credits: 286, avgSec: 116 },
    { tool: "AI-сайт", kind: "site", runs: 6, credits: 24, avgSec: 174 },
    { tool: "Enhancer", kind: "enhancer", runs: 91, credits: 91, avgSec: 22 },
    { tool: "Realtime", kind: "realtime", runs: 213, credits: 64, avgSec: 8 },
    { tool: "Ассистент", kind: "assistant", runs: 612, credits: 31, avgSec: 11 },
  ];
}

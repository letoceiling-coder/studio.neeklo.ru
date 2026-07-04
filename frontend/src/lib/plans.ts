// Единый источник правды для тарифов: цены, кредиты, конкурентность,
// доступ к моделям (по тиру), возможности (фото/видео/3D/липсинк/LoRA/realtime,
// коммерческая лицензия). Используется на /app/billing, в пейволле,
// в студиях (пикер моделей) и в очереди (конкурентность).

export type PlanId = "free" | "start" | "pro" | "studio" | "business";

/** Sentinel for "unlimited" credit caps. Display as ∞, compare with isUnlimited(). */
export const UNLIMITED = 999_999;
export const isUnlimited = (n: number) => n >= UNLIMITED;

export type PlanCapabilityValue = boolean | string;

export type PlanCapabilities = {
  photo: PlanCapabilityValue;
  video: PlanCapabilityValue;
  threeD: PlanCapabilityValue;
  lipsync: PlanCapabilityValue;
  lora: PlanCapabilityValue;
  realtime: PlanCapabilityValue;
  commercial: PlanCapabilityValue;
};

export type Plan = {
  id: PlanId;
  name: string;
  rank: number; // 0=free … 4=business
  /** RUB / месяц при помесячной оплате */
  price: number;
  /** RUB / месяц при годовой оплате (2 месяца в подарок) */
  yearlyPricePerMonth: number;
  priceLabel: string;
  priceNote: string;
  tagline: string;
  /** Месячная квота кредитов. UNLIMITED — безлимит. */
  monthlyCredits: number;
  /** Конкурентность задач */
  concurrency: { image: number; video: number };
  /** Тир моделей, доступный на тарифе (включительно). */
  modelTier: number;
  /** Капабилити для таблицы сравнения. */
  capabilities: PlanCapabilities;
  features: string[];
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Бесплатно",
    rank: 0,
    price: 0,
    yearlyPricePerMonth: 0,
    priceLabel: "0 ₽",
    priceNote: "навсегда",
    tagline: "Попробовать без карты",
    monthlyCredits: 30,
    concurrency: { image: 1, video: 0 },
    modelTier: 0,
    capabilities: {
      photo: true,
      video: "только Lite",
      threeD: false,
      lipsync: false,
      lora: false,
      realtime: "ограниченно",
      commercial: false,
    },
    features: [
      "30 кредитов в месяц",
      "1 сайт-черновик",
      "Базовые фото-модели",
      "Водяной знак neeklo",
    ],
  },
  {
    id: "start",
    name: "Старт",
    rank: 1,
    price: 490,
    yearlyPricePerMonth: 408,
    priceLabel: "490 ₽",
    priceNote: "в месяц",
    tagline: "Соло-проект",
    monthlyCredits: 300,
    concurrency: { image: 2, video: 1 },
    modelTier: 1,
    capabilities: {
      photo: true,
      video: true,
      threeD: false,
      lipsync: false,
      lora: false,
      realtime: true,
      commercial: false,
    },
    features: [
      "300 кредитов в месяц",
      "1 опубликованный сайт",
      "Видео и базовые арт-модели",
      "Без водяного знака",
    ],
  },
  {
    id: "pro",
    name: "Про",
    rank: 2,
    price: 990,
    yearlyPricePerMonth: 825,
    priceLabel: "990 ₽",
    priceNote: "в месяц",
    tagline: "Малый бизнес",
    monthlyCredits: 1200,
    concurrency: { image: 3, video: 1 },
    modelTier: 2,
    highlight: true,
    capabilities: {
      photo: true,
      video: true,
      threeD: true,
      lipsync: "короткий",
      lora: false,
      realtime: true,
      commercial: true,
    },
    features: [
      "1 200 кредитов в месяц",
      "3 сайта и свой домен",
      "Pro фото- и видео-модели",
      "Коммерческая лицензия",
    ],
  },
  {
    id: "studio",
    name: "Студия",
    rank: 3,
    price: 2990,
    yearlyPricePerMonth: 2492,
    priceLabel: "2 990 ₽",
    priceNote: "в месяц",
    tagline: "Команда и агентство",
    monthlyCredits: 5000,
    concurrency: { image: 5, video: 2 },
    modelTier: 3,
    capabilities: {
      photo: true,
      video: true,
      threeD: true,
      lipsync: true,
      lora: true,
      realtime: true,
      commercial: true,
    },
    features: [
      "5 000 кредитов в месяц",
      "Realtime, LoRA, липсинк",
      "Команда до 5 человек",
      "Брендинг и кастом-аватары",
    ],
  },
  {
    id: "business",
    name: "Бизнес",
    rank: 4,
    price: 7990,
    yearlyPricePerMonth: 6658,
    priceLabel: "7 990 ₽",
    priceNote: "в месяц",
    tagline: "Бренды и продакшен",
    monthlyCredits: UNLIMITED,
    concurrency: { image: 10, video: 4 },
    modelTier: 4,
    capabilities: {
      photo: true,
      video: true,
      threeD: true,
      lipsync: true,
      lora: "кастом",
      realtime: true,
      commercial: "расширенная",
    },
    features: [
      "Безлимит кредитов",
      "Топ-модели (Real, XL, HD)",
      "Приоритетная очередь",
      "Личный менеджер и SLA",
    ],
  },
];

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function planRank(id: PlanId): number {
  return getPlan(id).rank;
}

/** Доступна ли модель с требованием `requiredTier` на тарифе `planId`. */
export function isModelAllowed(requiredTier: number, planId: PlanId): boolean {
  return getPlan(planId).rank >= requiredTier;
}

/** Конкурентность активного плана. */
export function getPlanConcurrency(planId: PlanId): { image: number; video: number } {
  return getPlan(planId).concurrency;
}

/** Credit quota for a plan, formatted (∞ for unlimited). */
export function planQuotaLabel(id: PlanId): string {
  const n = getPlan(id).monthlyCredits;
  return isUnlimited(n) ? "∞" : String(n);
}

export function formatRub(n: number): string {
  if (n === 0) return "0 ₽";
  return `${n.toLocaleString("ru-RU")} ₽`;
}

export type BillingCycle = "month" | "year";

export function getPlanPricePerMonth(id: PlanId, cycle: BillingCycle): number {
  const p = getPlan(id);
  return cycle === "year" ? p.yearlyPricePerMonth : p.price;
}

/* ---------- mock current-plan state ---------- */

import { useSyncExternalStore } from "react";
import { resetFreeCredits } from "./mock-credits";

const KEY = "neeklo.plan.current";
const listeners = new Set<() => void>();

function read(): PlanId {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw && ["free", "start", "pro", "studio", "business"].includes(raw)) return raw as PlanId;
  } catch {}
  return "free";
}

export function setCurrentPlan(id: PlanId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {}
  // Единый источник правды: смена тарифа всегда сбрасывает квоту кредитов,
  // чтобы это нельзя было «забыть» на стороне вызова.
  resetFreeCredits(getPlan(id).monthlyCredits);
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("neeklo:plan-changed"));
  }
}

export function getCurrentPlan(): PlanId {
  return read();
}

export function useCurrentPlan(): PlanId {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => e.key === KEY && cb();
      window.addEventListener("storage", onStorage);
      window.addEventListener("neeklo:plan-changed", cb);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("neeklo:plan-changed", cb);
      };
    },
    () => read(),
    () => "free" as PlanId,
  );
}

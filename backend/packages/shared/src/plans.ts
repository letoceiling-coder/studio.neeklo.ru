import type { PlanId } from "./index.js";

/**
 * Зеркало frontend src/lib/plans.ts — ЕДИНЫЙ источник правды на стороне фронта.
 * Значения должны совпадать. При изменении тарифов меняем фронт и копируем сюда.
 */
export const UNLIMITED = 999_999;
export const isUnlimited = (n: number) => n >= UNLIMITED;

export type SharedPlan = {
  id: PlanId;
  name: string;
  rank: number;
  /** RUB / месяц при помесячной оплате */
  price: number;
  /** RUB / месяц при годовой оплате */
  yearlyPricePerMonth: number;
  monthlyCredits: number;
  concurrency: { image: number; video: number };
  modelTier: number;
};

export const PLANS: Record<PlanId, SharedPlan> = {
  free: {
    id: "free",
    name: "Бесплатно",
    rank: 0,
    price: 0,
    yearlyPricePerMonth: 0,
    monthlyCredits: 30,
    concurrency: { image: 1, video: 0 },
    modelTier: 0,
  },
  start: {
    id: "start",
    name: "Старт",
    rank: 1,
    price: 490,
    yearlyPricePerMonth: 408,
    monthlyCredits: 300,
    concurrency: { image: 2, video: 1 },
    modelTier: 1,
  },
  pro: {
    id: "pro",
    name: "Про",
    rank: 2,
    price: 990,
    yearlyPricePerMonth: 825,
    monthlyCredits: 1200,
    concurrency: { image: 3, video: 1 },
    modelTier: 2,
  },
  studio: {
    id: "studio",
    name: "Студия",
    rank: 3,
    price: 2990,
    yearlyPricePerMonth: 2492,
    monthlyCredits: 5000,
    concurrency: { image: 5, video: 2 },
    modelTier: 3,
  },
  business: {
    id: "business",
    name: "Бизнес",
    rank: 4,
    price: 7990,
    yearlyPricePerMonth: 6658,
    monthlyCredits: UNLIMITED,
    concurrency: { image: 10, video: 4 },
    modelTier: 4,
  },
};

export function getPlan(planId: PlanId): SharedPlan {
  return PLANS[planId] ?? PLANS.free;
}

export function getPlanConcurrency(planId: PlanId) {
  return getPlan(planId).concurrency;
}

/** Back-compat: прежняя форма таблицы. */
export const PLAN_CONCURRENCY: Record<
  PlanId,
  { image: number; video: number; monthlyCredits: number; modelTier: number }
> = Object.fromEntries(
  (Object.keys(PLANS) as PlanId[]).map((id) => [
    id,
    {
      image: PLANS[id].concurrency.image,
      video: PLANS[id].concurrency.video,
      monthlyCredits: PLANS[id].monthlyCredits,
      modelTier: PLANS[id].modelTier,
    },
  ]),
) as Record<PlanId, { image: number; video: number; monthlyCredits: number; modelTier: number }>;

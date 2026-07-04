// Единый конфиг медиа-моделей (ТЗ §10). Питает Model Picker, чипы composer,
// cost-note, валидацию, состояния доступности и generate-кнопку.
// Один источник правды для Image / Video / Enhance.

import type { PlanId } from "./plans";
import { getPlan } from "./plans";

export type MediaProvider = "replicate" | "fal" | "freepik" | "openrouter" | "custom";
export type MediaKind = "image" | "video" | "enhance";
export type InputMode =
  | "text"
  | "image"
  | "startFrame"
  | "endFrame"
  | "reference"
  | "video"
  | "audio";
export type ModelTier = "free" | "standard" | "pro" | "premium";

/** Возможности модели — рендерятся бейджами на карточке. */
export type Capability =
  | "text"
  | "startFrame"
  | "endFrame"
  | "reference"
  | "lora"
  | "audio"
  | "fast"
  | "pro";

/** Категории для табов в Model Picker. */
export type ModelCategory =
  | "recommended"
  | "image"
  | "video"
  | "fast"
  | "quality"
  | "economy"
  | "premium";

export type MediaModel = {
  id: string;
  name: string;
  provider: MediaProvider;
  kind: MediaKind;
  description: string;
  /** Превью-визуал (нет хостинговых картинок — используем фирменный градиент). */
  previewGradient: string;
  tier: ModelTier;
  /** Минимальный rank тарифа (см. plans.ts: free=0 … business=4). */
  requiredTier: number;
  costCredits: number;
  etaSeconds: number;
  inputModes: InputMode[];
  aspectRatios: string[];
  durations?: number[];
  resolutions?: string[];
  capabilities: Capability[];
  /** Жёсткие требования к входным данным/тарифу перед запуском. */
  requires?: {
    startFrame?: boolean;
    endFrame?: boolean;
    reference?: boolean;
    proPlan?: boolean;
  };
  rateLimit?: { rpm: number; concurrency: number };
  /** Доп. ограничения для подписи на карточке («только 720p», «5–6 сек»). */
  limits?: string[];
  categories: ModelCategory[];
};

/* ────────── каталог ────────── */

export const MEDIA_MODELS: MediaModel[] = [
  /* ---------- изображения ---------- */
  {
    id: "vision-lite",
    name: "neeklo Vision Lite",
    provider: "replicate",
    kind: "image",
    description: "Быстрые черновики и пробы идей. Дёшево и моментально.",
    previewGradient: "from-sky-500 via-cyan-400 to-emerald-300",
    tier: "free",
    requiredTier: 0,
    costCredits: 2,
    etaSeconds: 12,
    inputModes: ["text"],
    aspectRatios: ["1:1", "4:5", "9:16", "16:9"],
    capabilities: ["text", "fast"],
    rateLimit: { rpm: 6, concurrency: 1 },
    categories: ["recommended", "image", "fast", "economy"],
  },
  {
    id: "vision",
    name: "neeklo Vision",
    provider: "replicate",
    kind: "image",
    description: "Универсальная модель для большинства задач: товар, контент, баннеры.",
    previewGradient: "from-amber-500 via-orange-400 to-rose-400",
    tier: "standard",
    requiredTier: 0,
    costCredits: 6,
    etaSeconds: 25,
    inputModes: ["text", "reference"],
    aspectRatios: ["1:1", "4:5", "3:4", "9:16", "16:9"],
    capabilities: ["text", "reference"],
    rateLimit: { rpm: 6, concurrency: 1 },
    categories: ["recommended", "image"],
  },
  {
    id: "vision-art",
    name: "neeklo Vision Art",
    provider: "replicate",
    kind: "image",
    description: "Иллюстрация, постер, выраженный авторский стиль.",
    previewGradient: "from-violet-500 via-fuchsia-400 to-pink-300",
    tier: "standard",
    requiredTier: 1,
    costCredits: 8,
    etaSeconds: 30,
    inputModes: ["text", "reference"],
    aspectRatios: ["1:1", "4:5", "9:16", "16:9"],
    capabilities: ["text", "reference"],
    categories: ["image", "quality"],
  },
  {
    id: "vision-pro",
    name: "neeklo Vision Pro",
    provider: "replicate",
    kind: "image",
    description: "Максимум деталей и реализма, лучшая физика света.",
    previewGradient: "from-orange-500 via-amber-400 to-yellow-300",
    tier: "pro",
    requiredTier: 2,
    costCredits: 14,
    etaSeconds: 55,
    inputModes: ["text", "reference"],
    aspectRatios: ["1:1", "4:5", "3:4", "9:16", "16:9"],
    capabilities: ["text", "reference", "pro"],
    requires: { proPlan: true },
    categories: ["image", "quality", "premium"],
  },
  {
    id: "vision-real",
    name: "neeklo Vision Real",
    provider: "replicate",
    kind: "image",
    description: "Фотореализм для продукт-съёмки и портретов.",
    previewGradient: "from-rose-500 via-orange-400 to-amber-300",
    tier: "premium",
    requiredTier: 3,
    costCredits: 20,
    etaSeconds: 70,
    inputModes: ["text", "reference"],
    aspectRatios: ["1:1", "4:5", "16:9"],
    capabilities: ["text", "reference", "pro", "lora"],
    requires: { proPlan: true },
    limits: ["LoRA доступна со «Студии»"],
    categories: ["image", "premium"],
  },

  /* ---------- видео ---------- */
  {
    id: "motion-lite",
    name: "neeklo Motion Lite",
    provider: "replicate",
    kind: "video",
    description: "Оживляет фото: лёгкое движение камеры из одного кадра.",
    previewGradient: "from-emerald-500 via-teal-400 to-cyan-300",
    tier: "standard",
    requiredTier: 1,
    costCredits: 10,
    etaSeconds: 90,
    inputModes: ["image", "startFrame"],
    aspectRatios: ["9:16", "1:1", "16:9"],
    durations: [5, 6],
    resolutions: ["720p"],
    capabilities: ["startFrame", "fast"],
    requires: { startFrame: true },
    limits: ["Только 5–6 сек", "Только 720p", "Нужен стартовый кадр"],
    categories: ["recommended", "video", "fast"],
  },
  {
    id: "motion",
    name: "neeklo Motion",
    provider: "replicate",
    kind: "video",
    description: "Видео по тексту: опишите сцену и движение.",
    previewGradient: "from-amber-500 via-orange-400 to-rose-400",
    tier: "standard",
    requiredTier: 1,
    costCredits: 14,
    etaSeconds: 120,
    inputModes: ["text", "image", "startFrame"],
    aspectRatios: ["9:16", "16:9", "1:1", "4:5"],
    durations: [5, 6, 8],
    resolutions: ["720p", "1080p"],
    capabilities: ["text", "startFrame"],
    categories: ["recommended", "video"],
  },
  {
    id: "motion-frames",
    name: "neeklo Motion Frames",
    provider: "replicate",
    kind: "video",
    description: "Переход между стартовым и финальным кадром (Start + End).",
    previewGradient: "from-sky-500 via-indigo-400 to-violet-300",
    tier: "pro",
    requiredTier: 2,
    costCredits: 18,
    etaSeconds: 130,
    inputModes: ["startFrame", "endFrame"],
    aspectRatios: ["9:16", "16:9", "1:1"],
    durations: [5, 6],
    resolutions: ["720p", "1080p"],
    capabilities: ["startFrame", "endFrame", "pro"],
    requires: { startFrame: true, endFrame: true, proPlan: true },
    limits: ["Нужны оба кадра"],
    categories: ["video", "quality"],
  },
  {
    id: "motion-pro",
    name: "neeklo Motion Pro",
    provider: "replicate",
    kind: "video",
    description: "Cinematic-движение, 1080p, до 10 сек. Реклама и продукт.",
    previewGradient: "from-orange-500 via-amber-400 to-yellow-300",
    tier: "premium",
    requiredTier: 3,
    costCredits: 28,
    etaSeconds: 180,
    inputModes: ["text", "image", "startFrame"],
    aspectRatios: ["9:16", "16:9", "1:1", "4:5"],
    durations: [5, 6, 8, 10],
    resolutions: ["720p", "1080p"],
    capabilities: ["text", "startFrame", "pro", "audio"],
    requires: { proPlan: true },
    categories: ["video", "premium"],
  },
];

/* ────────── выборки ────────── */

export const imageModels = (): MediaModel[] => MEDIA_MODELS.filter((m) => m.kind === "image");
export const videoModels = (): MediaModel[] => MEDIA_MODELS.filter((m) => m.kind === "video");

export function getModel(id: string): MediaModel | undefined {
  return MEDIA_MODELS.find((m) => m.id === id);
}

export function modelsForKind(kind: MediaKind): MediaModel[] {
  return MEDIA_MODELS.filter((m) => m.kind === kind);
}

/* ────────── доступность / валидация ────────── */

export type ModelContext = {
  planId: PlanId;
  /** Текущий баланс кредитов (для подсветки «недостаточно кредитов»). */
  balance?: number;
  hasStartFrame?: boolean;
  hasEndFrame?: boolean;
  hasReference?: boolean;
  /** Есть ли бесплатные генерации (тогда баланс игнорируем). */
  freeAvailable?: boolean;
};

export type Availability = {
  available: boolean;
  /** Причина недоступности (для затемнённой карточки). */
  reason?: string;
};

/** Доступна ли модель прямо сейчас (для disabled-состояния карточки). */
export function modelAvailability(model: MediaModel, ctx: ModelContext): Availability {
  const rank = getPlan(ctx.planId).rank;
  if (model.requiredTier > rank) {
    return { available: false, reason: model.requires?.proPlan ? "Нужен Pro" : "Нужен тариф выше" };
  }
  if (
    !ctx.freeAvailable &&
    typeof ctx.balance === "number" &&
    ctx.balance < model.costCredits
  ) {
    return { available: false, reason: "Недостаточно кредитов" };
  }
  return { available: true };
}

/** Что мешает запустить генерацию ИМЕННО сейчас (учитывает входные данные). */
export function validateBeforeGenerate(
  model: MediaModel,
  ctx: ModelContext,
  opts: { promptFilled: boolean; duration?: number; resolution?: string },
): { ok: boolean; message?: string } {
  const base = modelAvailability(model, ctx);
  if (!base.available) return { ok: false, message: base.reason };

  if (model.requires?.startFrame && !ctx.hasStartFrame) {
    return { ok: false, message: "Добавьте стартовый кадр" };
  }
  if (model.requires?.endFrame && !ctx.hasEndFrame) {
    return { ok: false, message: "Добавьте финальный кадр" };
  }
  if (model.requires?.reference && !ctx.hasReference) {
    return { ok: false, message: "Добавьте референс" };
  }
  // Для text-to-video / text-to-image нужен промпт, если нет ссылочного входа.
  const needsText =
    model.inputModes.includes("text") &&
    !model.requires?.startFrame &&
    !model.requires?.reference;
  if (needsText && !opts.promptFilled && !ctx.hasReference && !ctx.hasStartFrame) {
    return {
      ok: false,
      message: model.kind === "video" ? "Опишите видео" : "Сначала опишите изображение",
    };
  }
  if (opts.duration && model.durations && !model.durations.includes(opts.duration)) {
    return {
      ok: false,
      message: `Эта модель поддерживает ${model.durations.join("/")} сек`,
    };
  }
  if (opts.resolution && model.resolutions && !model.resolutions.includes(opts.resolution)) {
    return { ok: false, message: `Эта модель поддерживает ${model.resolutions.join("/")}` };
  }
  return { ok: true };
}

/* ────────── форматирование для UI ────────── */

export function formatEta(seconds: number): string {
  if (seconds < 60) return `~${seconds} сек`;
  const m = Math.round(seconds / 60);
  return `~${m} мин`;
}

export function formatCost(model: MediaModel): string {
  return `${model.costCredits} кр`;
}

export const CAPABILITY_LABEL: Record<Capability, string> = {
  text: "Текст",
  startFrame: "Стартовый кадр",
  endFrame: "Финальный кадр",
  reference: "Референс",
  lora: "LoRA",
  audio: "Звук",
  fast: "Быстро",
  pro: "Pro",
};

export const CATEGORY_LABEL: Record<ModelCategory, string> = {
  recommended: "Рекомендуемые",
  image: "Изображения",
  video: "Видео",
  fast: "Быстрые",
  quality: "Качественные",
  economy: "Экономные",
  premium: "Премиум",
};

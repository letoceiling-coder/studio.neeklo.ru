// /app/studio/image — Фото-студия в стиле Krea/Higgsfield:
// центр — сетка результатов / empty state, снизу — sticky composer,
// модель выбирается карточками (ModelPickerModal), настройки — в drawer.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  ChevronDown,
  SlidersHorizontal,
  AlertTriangle,
  RotateCw,
  Download,
  Copy,
  Maximize2,
  Film,
  Wand2,
  MoreHorizontal,
  X,
  Camera,
  Star,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentPlan } from "@/lib/plans";
import { tryGenerate, refundCredits, useFreeCredits } from "@/lib/mock-credits";
import { GenerationCostNote } from "@/components/generation-cost-note";
import { ModelPickerModal } from "@/components/studio";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  imageModels,
  getModel,
  validateBeforeGenerate,
  computeImageCost,
  IMAGE_QUALITY_OPTIONS,
  formatEta,
  type MediaModel,
  type ModelContext,
  type ImageQuality,
} from "@/lib/media-models";

export const Route = createFileRoute("/app/studio/image")({
  head: () => ({
    meta: [
      { title: "Фото-студия, neeklo" },
      { name: "description", content: "Генерация фото в neeklo studio." },
    ],
  }),
  component: ImageStudio,
});

/* ────────── типы / константы ────────── */

type Status = "idle" | "loading" | "ready" | "error";
type Count = 1 | 2 | 4;

type Shot = {
  id: string;
  src: string;
  prompt: string;
  modelName: string;
  ratio: string;
  createdAt: number;
  favorite?: boolean;
};

const PRESETS: { label: string; prompt: string; ratio: string }[] = [
  { label: "Товарный кадр", prompt: "Продуктовая съёмка товара на чистом фоне, мягкий студийный свет, высокая детализация", ratio: "1:1" },
  { label: "Обложка Reels", prompt: "Яркая вертикальная обложка для Reels, динамичная композиция, крупный объект, контрастный свет", ratio: "9:16" },
  { label: "Баннер", prompt: "Рекламный баннер с товаром, чистая композиция, место под текст, премиальный вид", ratio: "16:9" },
  { label: "Портрет", prompt: "Премиальный портрет крупным планом, кинематографичный свет, естественная кожа, 85мм", ratio: "4:5" },
  { label: "Интерьер", prompt: "Интерьерная съёмка, естественный свет из окна, тёплая атмосфера, архитектурная геометрия", ratio: "4:5" },
];

const EMPTY_CARDS = [
  "from-amber-500 via-orange-400 to-rose-400",
  "from-sky-500 via-cyan-400 to-emerald-300",
  "from-violet-500 via-fuchsia-400 to-pink-300",
  "from-emerald-500 via-teal-400 to-cyan-300",
];

/* ────────── friendly errors ────────── */

function friendlyError(raw?: string): string {
  const e = (raw ?? "").toLowerCase();
  if (!raw) return "Не удалось сгенерировать. Попробуйте ещё раз.";
  if (e.includes("429") || e.includes("throttl") || e.includes("перегруж") || e.includes("rate")) {
    return "Очередь генерации временно перегружена. Попробуйте через минуту или выберите другую модель.";
  }
  if (e.includes("timeout")) return "Генерация заняла слишком много времени. Попробуйте ещё раз.";
  if (e.includes("недостаточно средств")) return "Сервис временно недоступен. Мы уже разбираемся.";
  // Уже человекочитаемое сообщение с воркера — показываем как есть.
  return raw;
}

/* ────────── компонент ────────── */

function ImageStudio() {
  const planId = useCurrentPlan();
  const balance = useFreeCredits();
  const models = useMemo(() => imageModels(), []);

  const [modelId, setModelId] = useState<string>(models[0]?.id ?? "vision");
  const model = getModel(modelId) ?? models[0];

  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<string>(model.aspectRatios[0] ?? "1:1");
  const [count, setCount] = useState<Count>(1);
  const [quality, setQuality] = useState<ImageQuality>("standard");
  const [negative, setNegative] = useState("");
  const [seed, setSeed] = useState("");

  const [shots, setShots] = useState<Shot[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [lightbox, setLightbox] = useState<Shot | null>(null);

  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  // Если формат не поддерживается новой моделью — выставляем первый доступный.
  useEffect(() => {
    if (!model.aspectRatios.includes(format)) setFormat(model.aspectRatios[0]);
  }, [model, format]);

  const ctx: ModelContext = {
    planId,
    balance,
    hasReference: false,
    freeAvailable: balance > 0,
  };

  const totalCost = computeImageCost(model, count, quality);
  const promptFilled = prompt.trim().length > 0;
  const validation = validateBeforeGenerate(model, ctx, { promptFilled });
  const canGenerate = validation.ok && status !== "loading";

  /* ── генерация ── */
  const startGenerate = async () => {
    if (status === "loading") return;
    if (!validation.ok) {
      if (validation.message) toast.info(validation.message);
      promptRef.current?.focus();
      return;
    }
    if (!tryGenerate(totalCost)) return;

    setStatus("loading");
    setProgress(0);
    setError(null);

    const basePrompt = prompt.trim();
    const idempotencyKey = `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const { runJob } = await import("@/lib/api/generate");
      const result = await runJob(
        "image",
        {
          prompt: basePrompt,
          model: model.id,
          cost: totalCost,
          count,
          format,
          quality,
          negativePrompt: negative.trim() || undefined,
          seed: seed.trim() || undefined,
          idempotencyKey,
        },
        {
          title: basePrompt.slice(0, 80),
          onProgress: (p) => setProgress(Math.round(p * 100)),
        },
      );
      if (result.status === "completed" && result.assetUrl) {
        addShot(basePrompt, result.assetUrl);
      } else {
        refundCredits(totalCost);
        setStatus("error");
        const msg = friendlyError(result.error);
        setError(msg);
        toast.error("Не удалось сгенерировать", { description: msg });
      }
    } catch (err) {
      refundCredits(totalCost);
      setStatus("error");
      const msg = friendlyError(err instanceof Error ? err.message : undefined);
      setError(msg);
      toast.error("Не удалось сгенерировать", { description: msg });
    }
  };

  const addShot = (p: string, src: string) => {
    const shot: Shot = {
      id: `g_${Date.now().toString(36)}`,
      src,
      prompt: p || "Без описания",
      modelName: model.name,
      ratio: format,
      createdAt: Date.now(),
    };
    setShots((arr) => [shot, ...arr]);
    setStatus("ready");
    setProgress(100);
    toast.success("Готово", { description: p.slice(0, 80) || "Изображение создано" });
  };

  /* ── действия с результатом ── */
  const download = (s: Shot) => {
    const a = document.createElement("a");
    a.href = s.src;
    a.download = `neeklo-${s.id}.jpg`;
    a.rel = "noopener";
    a.target = "_blank";
    a.click();
  };
  const copyPrompt = async (s: Shot) => {
    try {
      await navigator.clipboard.writeText(s.prompt);
      toast.success("Промпт скопирован");
    } catch {
      toast.error("Не удалось скопировать");
    }
  };
  const reusePrompt = (s: Shot) => {
    setPrompt(s.prompt);
    promptRef.current?.focus();
    toast.info("Промпт подставлен — отредактируйте и сгенерируйте");
  };
  const makeVideo = (s: Shot) => {
    try {
      sessionStorage.setItem("neeklo.video.startFrame", s.src);
      sessionStorage.setItem("neeklo.video.prompt", s.prompt);
    } catch {
      /* ignore */
    }
    window.location.href = "/app/studio/video";
  };
  const toggleFavorite = (s: Shot) => {
    setShots((arr) => arr.map((x) => (x.id === s.id ? { ...x, favorite: !x.favorite } : x)));
    toast.success(s.favorite ? "Убрано из избранного" : "Добавлено в избранное");
  };
  const openInNodes = (s: Shot) => {
    try {
      sessionStorage.setItem("neeklo.nodes.seedImage", s.src);
      sessionStorage.setItem("neeklo.nodes.seedPrompt", s.prompt);
    } catch {
      /* ignore */
    }
    window.location.href = "/app/nodes";
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setPrompt(p.prompt);
    if (model.aspectRatios.includes(p.ratio)) setFormat(p.ratio);
    promptRef.current?.focus();
  };

  /* ────────── render ────────── */
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-[calc(100dvh-4rem)] w-full max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-8 pt-4">
      {/* header */}
      <header className="flex items-center justify-between gap-3 mb-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-tile shrink-0" style={{ background: "var(--gradient-warm-soft)" }}>
            <Camera className="w-5 h-5 text-accent" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[17px] sm:text-[19px] font-semibold leading-tight">Создайте изображение</h1>
            <p className="text-[12.5px] text-muted-foreground truncate">Опишите кадр, выберите модель и получите варианты</p>
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-label="Ещё"
            className="inline-flex items-center justify-center w-10 h-10 rounded-tile border border-border bg-card hover:bg-surface-2"
          >
            <MoreHorizontal className="w-5 h-5" strokeWidth={2} />
          </button>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 z-40 mt-1.5 w-60 rounded-tile border border-border bg-card shadow-2xl p-1.5">
                <MenuItem label="Из мудборда" onClick={() => { setMoreOpen(false); window.location.href = "/app/moodboards"; }} />
                <MenuItem label="Открыть нодовый воркфлоу" onClick={() => { setMoreOpen(false); toast.info("Нодовый редактор скоро будет здесь"); }} />
                {shots.length > 0 && (
                  <MenuItem label="Очистить результаты" onClick={() => { setMoreOpen(false); setShots([]); setStatus("idle"); }} />
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* центр */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-4">
        {status === "loading" && shots.length === 0 ? (
          <LoadingState progress={progress} eta={formatEta(model.etaSeconds)} />
        ) : status === "error" && shots.length === 0 ? (
          <ErrorState message={error} onRetry={startGenerate} />
        ) : shots.length === 0 ? (
          <EmptyState onPreset={applyPreset} />
        ) : (
          <ResultGrid
            shots={shots}
            loading={status === "loading"}
            progress={progress}
            onOpen={setLightbox}
            onDownload={download}
            onCopy={copyPrompt}
            onReuse={reusePrompt}
            onMakeVideo={makeVideo}
            onRegenerate={startGenerate}
            onFavorite={toggleFavorite}
            onOpenInNodes={openInNodes}
          />
        )}
      </div>

      {/* sticky composer */}
      <Composer
        prompt={prompt}
        setPrompt={setPrompt}
        promptRef={promptRef}
        model={model}
        onOpenPicker={() => setPickerOpen(true)}
        format={format}
        setFormat={setFormat}
        count={count}
        setCount={setCount}
        quality={quality}
        setQuality={setQuality}
        onOpenSettings={() => setSettingsOpen(true)}
        totalCost={totalCost}
        loading={status === "loading"}
        canGenerate={canGenerate}
        hint={validation.ok ? null : validation.message ?? null}
        onGenerate={startGenerate}
      />

      {/* model picker */}
      <ModelPickerModal
        open={pickerOpen}
        kind="image"
        selectedId={modelId}
        ctx={ctx}
        onSelect={setModelId}
        onClose={() => setPickerOpen(false)}
      />

      {/* settings drawer */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-background border-l border-border flex flex-col">
          <SheetTitle className="sr-only">Настройки генерации</SheetTitle>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-[15px] font-semibold">Настройки</span>
            <button type="button" onClick={() => setSettingsOpen(false)} className="inline-flex items-center justify-center w-9 h-9 rounded-tile border border-border hover:bg-surface-2">
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <Field label="Negative prompt" hint="Что исключить из кадра">
              <textarea
                value={negative}
                onChange={(e) => setNegative(e.target.value)}
                rows={3}
                placeholder="например: текст, водяные знаки, артефакты"
                className="w-full resize-none rounded-tile border border-border bg-surface-1 px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-accent/40"
              />
            </Field>
            <Field label="Seed" hint="Фиксирует результат для повтора">
              <input
                value={seed}
                onChange={(e) => setSeed(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="случайный"
                inputMode="numeric"
                className="w-full h-10 rounded-tile border border-border bg-surface-1 px-3 text-[13px] outline-none focus:ring-2 focus:ring-accent/40"
              />
            </Field>
          </div>
        </SheetContent>
      </Sheet>

      {/* lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setLightbox(null)}>
          <img src={lightbox.src} alt={lightbox.prompt} className="max-h-[90vh] max-w-full rounded-tile object-contain" />
          <button type="button" aria-label="Закрыть" onClick={() => setLightbox(null)} className="absolute top-4 right-4 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/15 text-white hover:bg-white/25">
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ────────── empty / loading / error ────────── */

function EmptyState({ onPreset }: { onPreset: (p: (typeof PRESETS)[number]) => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 sm:py-16 gap-6">
      <div className="flex items-end justify-center gap-3 sm:gap-4">
        {EMPTY_CARDS.map((g, i) => (
          <div
            key={i}
            className={`rounded-tile border border-border bg-gradient-to-br ${g} shadow-lg`}
            style={{
              width: 64,
              height: 84,
              transform: `rotate(${[-8, -3, 3, 8][i]}deg) translateY(${[6, 0, 0, 6][i]}px)`,
            }}
          />
        ))}
      </div>
      <div>
        <h2 className="text-[18px] font-semibold">Создайте изображение</h2>
        <p className="text-[13px] text-muted-foreground mt-1 max-w-sm">
          Опишите кадр, выберите модель и получите несколько вариантов.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onPreset(p)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border bg-card hover:bg-surface-2 text-[12.5px] font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" strokeWidth={1.8} />
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LoadingState({ progress, eta }: { progress: number; eta: string }) {
  return (
    <div className="relative w-full min-h-[420px] rounded-tile overflow-hidden border border-border bg-surface-2 flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-surface-2 via-surface-1 to-surface-2 animate-pulse" />
      <div className="relative flex flex-col items-center gap-4 text-center px-6">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full" style={{ background: "var(--gradient-warm-soft)" }}>
          <Sparkles className="w-5 h-5 text-accent" strokeWidth={1.8} />
        </span>
        <div className="text-[14px] font-medium">Генерируем изображение…</div>
        <div className="w-64 max-w-full h-1.5 rounded-full bg-surface-3 overflow-hidden">
          <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${progress}%`, background: "var(--gradient-warm)" }} />
        </div>
        <div className="text-[12px] text-muted-foreground tabular-nums">{Math.round(progress)}% · {eta}</div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="w-full min-h-[420px] rounded-tile border border-border bg-surface-2 flex flex-col items-center justify-center gap-4 text-center px-6">
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/15 text-destructive">
        <AlertTriangle className="w-5 h-5" strokeWidth={1.8} />
      </span>
      <div>
        <div className="text-[15px] font-semibold">Не получилось сгенерировать</div>
        <div className="text-[13px] text-muted-foreground mt-1 max-w-sm">{message ?? "Попробуйте ещё раз, настройки сохранены."}</div>
      </div>
      <button type="button" onClick={onRetry} className="btn-primary inline-flex items-center gap-2 h-11 px-5 rounded-tile text-[13px] font-semibold">
        <RotateCw className="w-4 h-4" strokeWidth={2} /> Повторить
      </button>
    </div>
  );
}

/* ────────── result grid ────────── */

function ResultGrid({
  shots, loading, progress, onOpen, onDownload, onCopy, onReuse, onMakeVideo, onRegenerate,
  onFavorite, onOpenInNodes,
}: {
  shots: Shot[];
  loading: boolean;
  progress: number;
  onOpen: (s: Shot) => void;
  onDownload: (s: Shot) => void;
  onCopy: (s: Shot) => void;
  onReuse: (s: Shot) => void;
  onMakeVideo: (s: Shot) => void;
  onRegenerate: () => void;
  onFavorite: (s: Shot) => void;
  onOpenInNodes: (s: Shot) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {loading && (
        <div className="relative col-span-1 aspect-square rounded-tile overflow-hidden border border-border bg-surface-2 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-surface-2 via-surface-1 to-surface-2 animate-pulse" />
          <div className="relative text-[12px] text-muted-foreground tabular-nums">{Math.round(progress)}%</div>
        </div>
      )}
      {shots.map((s) => (
        <div key={s.id} className="group relative aspect-square rounded-tile overflow-hidden border border-border bg-black">
          <img src={s.src} alt={s.prompt} loading="lazy" className="w-full h-full object-cover" />
          {/* hover actions */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
          {/* избранное — видно всегда, если помечено */}
          <button
            type="button"
            onClick={() => onFavorite(s)}
            title={s.favorite ? "В избранном" : "В избранное"}
            aria-label={s.favorite ? "Убрать из избранного" : "В избранное"}
            className={`absolute top-2 left-2 inline-flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-sm transition-all ${
              s.favorite
                ? "bg-black/55 text-amber-400 opacity-100"
                : "bg-black/55 text-white opacity-0 group-hover:opacity-100 hover:bg-black/75"
            }`}
          >
            <Star className="w-4 h-4" strokeWidth={1.9} fill={s.favorite ? "currentColor" : "none"} />
          </button>
          <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ActionBtn icon={Maximize2} label="Открыть" onClick={() => onOpen(s)} />
            <ActionBtn icon={Download} label="Скачать" onClick={() => onDownload(s)} />
            <ActionBtn icon={Film} label="Сделать видео" onClick={() => onMakeVideo(s)} />
            <ActionBtn icon={Boxes} label="Открыть в нодах" onClick={() => onOpenInNodes(s)} />
            <ActionBtn icon={Wand2} label="Повторить промпт" onClick={() => onReuse(s)} />
            <ActionBtn icon={Copy} label="Копировать промпт" onClick={() => onCopy(s)} />
            <ActionBtn icon={RotateCw} label="Повторить генерацию" onClick={onRegenerate} />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="text-[10.5px] text-white/90 truncate">{s.prompt}</div>
            <div className="text-[9.5px] text-white/60">{s.modelName}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick }: { icon: typeof Download; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/55 backdrop-blur-sm text-white hover:bg-black/75 transition-colors"
    >
      <Icon className="w-4 h-4" strokeWidth={1.9} />
    </button>
  );
}

/* ────────── composer ────────── */

function Composer({
  prompt, setPrompt, promptRef, model, onOpenPicker,
  format, setFormat, count, setCount, quality, setQuality,
  onOpenSettings, totalCost, loading, canGenerate, hint, onGenerate,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  promptRef: React.RefObject<HTMLTextAreaElement | null>;
  model: MediaModel;
  onOpenPicker: () => void;
  format: string;
  setFormat: (v: string) => void;
  count: Count;
  setCount: (v: Count) => void;
  quality: ImageQuality;
  setQuality: (v: ImageQuality) => void;
  onOpenSettings: () => void;
  totalCost: number;
  loading: boolean;
  canGenerate: boolean;
  hint: string | null;
  onGenerate: () => void;
}) {
  return (
    <div className="shrink-0 pt-2 pb-[84px] lg:pb-3">
      <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl p-2.5 sm:p-3">
          {/* prompt */}
          <textarea
            ref={promptRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canGenerate) onGenerate();
            }}
            rows={1}
            placeholder="Опишите изображение: объект, стиль, свет, фон…"
            className="w-full resize-none rounded-tile bg-transparent px-2 py-2 text-[14px] leading-relaxed outline-none min-h-[44px] max-h-32"
          />

          <div className="flex items-center gap-2 flex-wrap">
            {/* model chip */}
            <button
              type="button"
              onClick={onOpenPicker}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-border bg-surface-1 hover:bg-surface-2 text-[12.5px] font-medium"
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-md text-[9px] font-bold text-accent-foreground" style={{ background: "var(--gradient-warm)" }}>AI</span>
              <span className="truncate max-w-[140px]">{model.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
            </button>

            {/* format */}
            <ChipSelect
              value={format}
              options={model.aspectRatios.map((r) => ({ id: r, label: r }))}
              onChange={setFormat}
            />

            {/* count */}
            <ChipSelect
              value={String(count)}
              prefix="×"
              options={[{ id: "1", label: "1" }, { id: "2", label: "2" }, { id: "4", label: "4" }]}
              onChange={(v) => setCount(Number(v) as Count)}
            />

            {/* quality */}
            <ChipSelect
              value={quality}
              options={IMAGE_QUALITY_OPTIONS}
              onChange={(v) => setQuality(v as ImageQuality)}
            />

            {/* settings */}
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Настройки"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border bg-surface-1 hover:bg-surface-2 text-[12.5px] font-medium"
            >
              <SlidersHorizontal className="w-4 h-4" strokeWidth={1.8} />
              <span className="hidden sm:inline">Настройки</span>
            </button>

            {/* CTA */}
            <div className="ml-auto flex items-center gap-2">
              {hint && <span className="hidden sm:inline text-[11.5px] text-muted-foreground">{hint}</span>}
              <button
                type="button"
                onClick={onGenerate}
                disabled={!canGenerate}
                className="btn-primary inline-flex items-center gap-2 h-10 px-5 rounded-full text-[13px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: "var(--shadow-warm)" }}
              >
                <Sparkles className="w-4 h-4" strokeWidth={2.2} />
                {loading ? "Генерируем…" : `Сгенерировать · ${totalCost} кр`}
              </button>
            </div>
          </div>
          <div className="px-1 pt-1.5">
            <GenerationCostNote cost={totalCost} />
          </div>
      </div>
    </div>
  );
}

function ChipSelect({
  value, options, onChange, prefix,
}: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (v: string) => void;
  prefix?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border bg-surface-1 hover:bg-surface-2 text-[12.5px] font-medium"
      >
        {prefix}{current?.label ?? value}
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute z-40 bottom-full mb-1.5 left-0 min-w-[120px] rounded-tile border border-border bg-card shadow-2xl p-1">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => { onChange(o.id); setOpen(false); }}
                className={`w-full text-left px-3 h-9 rounded-md text-[12.5px] hover:bg-surface-2 ${o.id === value ? "text-accent font-semibold" : ""}`}
              >
                {prefix}{o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ────────── мелочи ────────── */

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left px-3 h-9 rounded-md text-[13px] hover:bg-surface-2">
      {label}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <div className="text-[13px] font-medium">{label}</div>
        {hint && <div className="text-[11.5px] text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

// /app/studio/video — Видео-студия как отдельный пошаговый flow (ТЗ §5):
// режимы (Текст→видео / Фото→видео / Старт+Финал), панель создания слева,
// «Как это работает» / превью / прогресс по центру, выбор модели карточками.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clapperboard,
  Sparkles,
  Upload,
  Link2,
  RotateCw,
  AlertTriangle,
  X,
  ChevronDown,
  Film,
  Wand2,
  Download,
  MoreHorizontal,
  Clock,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentPlan } from "@/lib/plans";
import { tryGenerate, useFreeCredits } from "@/lib/mock-credits";
import { GenerationCostNote } from "@/components/generation-cost-note";
import { ModelPickerModal } from "@/components/studio";
import {
  videoModels,
  getModel,
  validateBeforeGenerate,
  formatEta,
  type MediaModel,
  type ModelContext,
} from "@/lib/media-models";

type Search = { frame?: string; title?: string };

export const Route = createFileRoute("/app/studio/video")({
  head: () => ({
    meta: [
      { title: "Видео-студия, neeklo" },
      { name: "description", content: "Генерация видео: текст→видео и фото→видео." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    frame: typeof s.frame === "string" ? s.frame : undefined,
    title: typeof s.title === "string" ? s.title : undefined,
  }),
  component: VideoStudio,
});

/* ────────── режимы / фазы ────────── */

type Mode = "t2v" | "i2v" | "frames";
type Phase = "idle" | "preparing" | "queued" | "generating" | "processing" | "ready" | "error";

const MODES: { id: Mode; label: string; needs: ("startFrame" | "endFrame")[] }[] = [
  { id: "t2v", label: "Текст → видео", needs: [] },
  { id: "i2v", label: "Фото → видео", needs: ["startFrame"] },
  { id: "frames", label: "Старт + финал", needs: ["startFrame", "endFrame"] },
];

const SOON = ["Reference", "Продукт", "Motion Control"];

const PHASE_LABEL: Record<Exclude<Phase, "idle" | "ready" | "error">, string> = {
  preparing: "Подготовка",
  queued: "В очереди",
  generating: "Генерация",
  processing: "Обработка",
};

const DURATIONS_ALL = [5, 6, 8, 10];
const RES_ALL = ["720p", "1080p"];

function friendlyError(raw?: string): string {
  const e = (raw ?? "").toLowerCase();
  if (!raw) return "Не удалось сгенерировать видео. Попробуйте ещё раз.";
  if (e.includes("429") || e.includes("throttl") || e.includes("перегруж") || e.includes("rate"))
    return "Очередь генерации временно перегружена. Попробуйте через минуту или выберите другую модель.";
  if (e.includes("timeout")) return "Генерация заняла слишком много времени. Попробуйте ещё раз.";
  if (e.includes("недостаточно средств")) return "Сервис временно недоступен. Мы уже разбираемся.";
  return raw;
}

/* ────────── компонент ────────── */

function VideoStudio() {
  const { frame, title: incomingTitle } = Route.useSearch();
  const planId = useCurrentPlan();
  const balance = useFreeCredits();
  const models = useMemo(() => videoModels(), []);

  const [mode, setMode] = useState<Mode>(frame ? "i2v" : "t2v");
  const [prompt, setPrompt] = useState(incomingTitle ?? "");
  const [startFrame, setStartFrame] = useState<string | undefined>(frame);
  const [endFrame, setEndFrame] = useState<string | undefined>(undefined);

  const [modelId, setModelId] = useState<string>(() => defaultModelFor(frame ? "i2v" : "t2v", models));
  const model = getModel(modelId) ?? models[0];

  const [format, setFormat] = useState<string>(model.aspectRatios[0] ?? "9:16");
  const [duration, setDuration] = useState<number>(model.durations?.[0] ?? 5);
  const [resolution, setResolution] = useState<string>(model.resolutions?.[0] ?? "720p");
  const [linkInput, setLinkInput] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [etaSec, setEtaSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const etaTimer = useRef<number | null>(null);

  // Кадр из фото-студии (через sessionStorage из makeVideo).
  useEffect(() => {
    try {
      const sf = sessionStorage.getItem("neeklo.video.startFrame");
      const sp = sessionStorage.getItem("neeklo.video.prompt");
      if (sf) {
        setStartFrame(sf);
        setMode("i2v");
        if (sp) setPrompt((p) => p || sp);
        sessionStorage.removeItem("neeklo.video.startFrame");
        sessionStorage.removeItem("neeklo.video.prompt");
        toast.message("Кадр из фото-студии загружен", { description: "Опишите движение и сгенерируйте" });
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Подгоняем параметры под возможности модели.
  useEffect(() => {
    if (!model.aspectRatios.includes(format)) setFormat(model.aspectRatios[0]);
    if (model.durations && !model.durations.includes(duration)) setDuration(model.durations[0]);
    if (model.resolutions && !model.resolutions.includes(resolution)) setResolution(model.resolutions[0]);
  }, [model, format, duration, resolution]);

  useEffect(() => () => { if (etaTimer.current) window.clearInterval(etaTimer.current); }, []);

  const busy = phase === "preparing" || phase === "queued" || phase === "generating" || phase === "processing";

  const ctx: ModelContext = {
    planId,
    balance,
    hasStartFrame: !!startFrame,
    hasEndFrame: !!endFrame,
    freeAvailable: balance > 0,
  };

  const durFactor = duration >= 10 ? 1.6 : duration >= 8 ? 1.3 : 1;
  const resFactor = resolution === "1080p" ? 1.5 : 1;
  const totalCost = Math.max(1, Math.round(model.costCredits * durFactor * resFactor));

  const validation = validateBeforeGenerate(model, ctx, {
    promptFilled: prompt.trim().length > 0,
    duration,
    resolution,
  });
  const canGenerate = validation.ok && !busy;

  /* ── выбор режима меняет модель по умолчанию ── */
  const switchMode = (m: Mode) => {
    setMode(m);
    const next = defaultModelFor(m, models);
    if (next) setModelId(next);
  };

  /* ── загрузка кадра ── */
  const onUploadFrame = (which: "start" | "end"): React.ChangeEventHandler<HTMLInputElement> => (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = typeof reader.result === "string" ? reader.result : undefined;
      if (which === "start") setStartFrame(data);
      else setEndFrame(data);
    };
    reader.readAsDataURL(f);
  };
  const applyLink = () => {
    const url = linkInput.trim();
    if (!/^https?:\/\//.test(url)) {
      toast.error("Вставьте ссылку на изображение (http/https)");
      return;
    }
    setStartFrame(url);
    setLinkInput("");
    if (mode === "t2v") setMode("i2v");
    toast.success("Кадр по ссылке добавлен");
  };

  /* ── запуск ── */
  const startGenerate = async () => {
    if (busy) return;
    if (!validation.ok) {
      if (validation.message) toast.info(validation.message);
      return;
    }
    if (!tryGenerate(totalCost)) return;

    setPhase("preparing");
    setProgress(0);
    setError(null);
    setResultUrl(null);
    startEta(model.etaSeconds);

    const idempotencyKey = `vid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      const { runJob } = await import("@/lib/api/generate");
      setPhase("queued");
      const result = await runJob(
        "video",
        {
          prompt: prompt.trim(),
          model: model.id,
          mode,
          cost: totalCost,
          format,
          duration,
          resolution,
          startFrame,
          endFrame,
          idempotencyKey,
        },
        {
          title: prompt.trim().slice(0, 80) || "Видео",
          onProgress: (p) => {
            setProgress(Math.round(p * 100));
            setPhase(p >= 0.9 ? "processing" : "generating");
          },
        },
      );
      stopEta();
      if (result.status === "completed" && result.assetUrl) {
        setResultUrl(result.assetUrl);
        setPhase("ready");
        setProgress(100);
        toast.success("Видео готово");
      } else {
        setPhase("error");
        const msg = friendlyError(result.error);
        setError(msg);
        toast.error("Не удалось сгенерировать", { description: msg });
      }
    } catch (err) {
      stopEta();
      setPhase("error");
      const msg = friendlyError(err instanceof Error ? err.message : undefined);
      setError(msg);
      toast.error("Не удалось сгенерировать", { description: msg });
    }
  };

  const startEta = (seconds: number) => {
    setEtaSec(seconds);
    if (etaTimer.current) window.clearInterval(etaTimer.current);
    etaTimer.current = window.setInterval(() => {
      setEtaSec((s) => Math.max(0, s - 1));
    }, 1000);
  };
  const stopEta = () => { if (etaTimer.current) window.clearInterval(etaTimer.current); };

  const cancel = () => {
    stopEta();
    setPhase("idle");
    setProgress(0);
  };

  const hasInput = mode === "t2v" ? prompt.trim().length > 0 : !!startFrame;

  /* ────────── render ────────── */
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-[calc(100dvh-4rem)] w-full max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-8 pt-4">
      {/* header + режимы */}
      <header className="shrink-0 mb-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-tile shrink-0" style={{ background: "var(--gradient-warm-soft)" }}>
              <Clapperboard className="w-5 h-5 text-accent" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <h1 className="text-[17px] sm:text-[19px] font-semibold leading-tight">Создайте видео</h1>
              <p className="text-[12.5px] text-muted-foreground truncate">Выберите режим, добавьте материалы и опишите движение</p>
            </div>
          </div>
          <div className="relative">
            <button type="button" onClick={() => setMoreOpen((v) => !v)} aria-label="Ещё" className="inline-flex items-center justify-center w-10 h-10 rounded-tile border border-border bg-card hover:bg-surface-2">
              <MoreHorizontal className="w-5 h-5" strokeWidth={2} />
            </button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 z-40 mt-1.5 w-56 rounded-tile border border-border bg-card shadow-2xl p-1.5">
                  <button type="button" onClick={() => { setMoreOpen(false); window.location.href = "/app/nodes"; }} className="w-full text-left px-3 h-9 rounded-md text-[13px] hover:bg-surface-2">Нодовый воркфлоу</button>
                  <button type="button" onClick={() => { setMoreOpen(false); setStartFrame(undefined); setEndFrame(undefined); setResultUrl(null); setPhase("idle"); }} className="w-full text-left px-3 h-9 rounded-md text-[13px] hover:bg-surface-2">Сбросить</button>
                </div>
              </>
            )}
          </div>
        </div>
        {/* mode tabs */}
        <div className="flex gap-1.5 overflow-x-auto">
          {MODES.map((m) => {
            const active = m.id === mode;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => switchMode(m.id)}
                aria-pressed={active}
                className={`shrink-0 h-9 px-3.5 rounded-full text-[12.5px] font-medium transition-studio ${
                  active ? "text-accent-foreground" : "text-muted-foreground hover:text-foreground border border-border bg-surface-1"
                }`}
                style={active ? { background: "var(--gradient-warm)" } : undefined}
              >
                {m.label}
              </button>
            );
          })}
          {SOON.map((s) => (
            <span key={s} className="shrink-0 inline-flex items-center gap-1 h-9 px-3 rounded-full border border-dashed border-border text-[12px] text-muted-foreground/70">
              {s}<span className="text-[9px] uppercase">скоро</span>
            </span>
          ))}
        </div>
      </header>

      {/* двухколоночная рабочая зона */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-4 overflow-hidden">
        {/* левая панель создания */}
        <aside className="min-h-0 overflow-y-auto pb-28 lg:pb-4 flex flex-col gap-4 order-2 lg:order-1">
          {/* входные данные */}
          {mode !== "t2v" && (
            <Section title="Входные данные">
              <div className="flex gap-2">
                <FrameBox
                  label={mode === "frames" ? "Старт" : "Кадр"}
                  src={startFrame}
                  onUpload={onUploadFrame("start")}
                  onClear={() => setStartFrame(undefined)}
                />
                {mode === "frames" && (
                  <FrameBox label="Финал" src={endFrame} onUpload={onUploadFrame("end")} onClear={() => setEndFrame(undefined)} />
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
                  <input
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="Вставить ссылку на кадр"
                    className="w-full h-9 pl-8 pr-2 rounded-tile border border-border bg-surface-1 text-[12.5px] outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
                <button type="button" onClick={applyLink} className="h-9 px-3 rounded-tile border border-border bg-card hover:bg-surface-2 text-[12.5px] font-medium">Ок</button>
              </div>
            </Section>
          )}

          {/* промпт */}
          <Section title={mode === "t2v" ? "Опишите видео" : "Опишите движение"}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder={mode === "t2v" ? "Опишите сцену, кадр и движение камеры…" : "Опишите движение камеры, действие, атмосферу…"}
              className="w-full resize-none rounded-tile border border-border bg-surface-1 px-3 py-2.5 text-[13px] leading-relaxed outline-none focus:ring-2 focus:ring-accent/40"
            />
          </Section>

          {/* модель */}
          <Section title="Модель">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="w-full flex items-center gap-2 h-11 px-3 rounded-tile border border-border bg-surface-1 hover:bg-surface-2 text-left"
            >
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[9px] font-bold text-accent-foreground" style={{ background: "var(--gradient-warm)" }}>AI</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium truncate">{model.name}</span>
                <span className="block text-[11px] text-muted-foreground">{formatEta(model.etaSeconds)} · {model.costCredits} кр</span>
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
            </button>
          </Section>

          {/* параметры */}
          <Section title="Параметры">
            <ParamRow label="Формат">
              <Seg options={model.aspectRatios} value={format} onChange={setFormat} />
            </ParamRow>
            <ParamRow label="Длительность">
              <Seg
                options={(model.durations ?? DURATIONS_ALL).map(String)}
                value={String(duration)}
                onChange={(v) => setDuration(Number(v))}
                suffix="с"
              />
            </ParamRow>
            <ParamRow label="Качество">
              <Seg options={model.resolutions ?? RES_ALL} value={resolution} onChange={setResolution} />
            </ParamRow>
          </Section>

          {/* cost + CTA (desktop) */}
          <div className="hidden lg:flex flex-col gap-2">
            <GenerationCostNote cost={totalCost} />
            {!validation.ok && validation.message && (
              <div className="text-[12px] text-amber-500">{validation.message}</div>
            )}
            <button
              type="button"
              onClick={startGenerate}
              disabled={!canGenerate}
              className="btn-primary inline-flex items-center justify-center gap-2 h-11 rounded-tile text-[13px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: "var(--shadow-warm)" }}
            >
              <Sparkles className="w-4 h-4" strokeWidth={2.2} />
              {busy ? "Генерируем…" : `Сгенерировать видео · ${totalCost} кр`}
            </button>
          </div>
        </aside>

        {/* центр */}
        <main className="min-h-0 overflow-y-auto pb-28 lg:pb-4 order-1 lg:order-2">
          {phase === "ready" && resultUrl ? (
            <ResultView url={resultUrl} poster={startFrame} format={format} onRegenerate={startGenerate} />
          ) : busy ? (
            <ProgressView phase={phase} progress={progress} etaSec={etaSec} modelName={model.name} cost={totalCost} onCancel={cancel} />
          ) : phase === "error" ? (
            <ErrorView message={error} onRetry={startGenerate} />
          ) : hasInput && startFrame ? (
            <FramePreview src={startFrame} format={format} />
          ) : (
            <HowItWorks mode={mode} />
          )}
        </main>
      </div>

      {/* mobile sticky CTA */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 px-3 pb-[84px] pt-2 bg-gradient-to-t from-background via-background/95 to-transparent">
        {!validation.ok && validation.message && (
          <div className="text-[12px] text-amber-500 mb-1.5 text-center">{validation.message}</div>
        )}
        <button
          type="button"
          onClick={startGenerate}
          disabled={!canGenerate}
          className="btn-primary w-full inline-flex items-center justify-center gap-2 h-12 rounded-tile text-[13.5px] font-semibold disabled:opacity-50"
          style={{ boxShadow: "var(--shadow-warm)" }}
        >
          <Sparkles className="w-4 h-4" strokeWidth={2.2} />
          {busy ? "Генерируем…" : `Сгенерировать · ${totalCost} кр`}
        </button>
      </div>

      <ModelPickerModal
        open={pickerOpen}
        kind="video"
        selectedId={modelId}
        ctx={ctx}
        onSelect={setModelId}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

/* ────────── default model per mode ────────── */

function defaultModelFor(mode: Mode, models: MediaModel[]): string {
  if (mode === "frames") {
    const m = models.find((x) => x.requires?.endFrame);
    if (m) return m.id;
  }
  if (mode === "i2v") {
    const m = models.find((x) => x.inputModes.includes("startFrame") && !x.requires?.endFrame);
    if (m) return m.id;
  }
  const t = models.find((x) => x.inputModes.includes("text") && !x.requires?.startFrame && !x.requires?.endFrame);
  return (t ?? models[0])?.id ?? "motion";
}

/* ────────── центральные состояния ────────── */

function HowItWorks({ mode }: { mode: Mode }) {
  const steps =
    mode === "t2v"
      ? ["Опишите сцену и движение", "Выберите модель и формат", "Получите готовое видео"]
      : ["Добавьте кадр (или оба для перехода)", "Опишите движение и выберите модель", "Получите готовое видео"];
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-6">
      <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl" style={{ background: "var(--gradient-warm-soft)" }}>
        <Film className="w-7 h-7 text-accent" strokeWidth={1.6} />
      </span>
      <div>
        <h2 className="text-[18px] font-semibold">Как это работает</h2>
        <p className="text-[13px] text-muted-foreground mt-1">Три шага до готового ролика</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 w-full max-w-2xl">
        {steps.map((s, i) => (
          <div key={i} className="rounded-tile border border-border bg-surface-1 p-4 text-left">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-bold text-accent-foreground mb-2" style={{ background: "var(--gradient-warm)" }}>{i + 1}</span>
            <div className="text-[13px] font-medium leading-snug">{s}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FramePreview({ src, format }: { src: string; format: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-4">
      <div className="relative rounded-tile overflow-hidden border border-border bg-black max-h-[60vh]" style={{ aspectRatio: ratioCss(format), maxWidth: format === "9:16" ? 320 : "100%" }}>
        <img src={src} alt="Стартовый кадр" className="w-full h-full object-cover" />
      </div>
      <p className="text-[13px] text-muted-foreground">Кадр готов — опишите движение и нажмите «Сгенерировать».</p>
    </div>
  );
}

function ProgressView({
  phase, progress, etaSec, modelName, cost, onCancel,
}: {
  phase: Phase;
  progress: number;
  etaSec: number;
  modelName: string;
  cost: number;
  onCancel: () => void;
}) {
  const phases: Exclude<Phase, "idle" | "ready" | "error">[] = ["preparing", "queued", "generating", "processing"];
  const currentIdx = phases.indexOf(phase as never);
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-5">
      <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl" style={{ background: "var(--gradient-warm-soft)" }}>
        <Film className="w-7 h-7 text-accent animate-pulse" strokeWidth={1.6} />
      </span>
      <div>
        <h2 className="text-[18px] font-semibold">{PHASE_LABEL[phase as keyof typeof PHASE_LABEL] ?? "Генерация"}</h2>
        <p className="text-[12.5px] text-muted-foreground mt-1">
          {modelName} · {cost} кр{etaSec > 0 ? ` · осталось ~${etaSec}с` : ""}
        </p>
      </div>
      {/* stepper */}
      <div className="flex items-center gap-2">
        {phases.map((p, i) => (
          <div key={p} className="flex items-center gap-2">
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${i <= currentIdx ? "text-accent-foreground" : "text-muted-foreground bg-surface-2"}`} style={i <= currentIdx ? { background: "var(--gradient-warm)" } : undefined}>
              {i < currentIdx ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
            </span>
            {i < phases.length - 1 && <span className={`w-6 h-px ${i < currentIdx ? "bg-accent" : "bg-border"}`} />}
          </div>
        ))}
      </div>
      <div className="w-72 max-w-full h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${Math.max(6, progress)}%`, background: "var(--gradient-warm)" }} />
      </div>
      <button type="button" onClick={onCancel} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-tile border border-border bg-card hover:bg-surface-2 text-[12.5px] font-medium">
        <Clock className="w-3.5 h-3.5" strokeWidth={1.8} /> Оставить в очереди и закрыть
      </button>
    </div>
  );
}

function ErrorView({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-4">
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/15 text-destructive">
        <AlertTriangle className="w-5 h-5" strokeWidth={1.8} />
      </span>
      <div>
        <div className="text-[15px] font-semibold">Не получилось сгенерировать</div>
        <div className="text-[13px] text-muted-foreground mt-1 max-w-sm">{message ?? "Попробуйте ещё раз — кредиты вернулись."}</div>
      </div>
      <button type="button" onClick={onRetry} className="btn-primary inline-flex items-center gap-2 h-11 px-5 rounded-tile text-[13px] font-semibold">
        <RotateCw className="w-4 h-4" strokeWidth={2} /> Повторить
      </button>
    </div>
  );
}

function ResultView({ url, poster, format, onRegenerate }: { url: string; poster?: string; format: string; onRegenerate: () => void }) {
  const download = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = "neeklo-video.mp4";
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  };
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 px-4">
      <div className="relative rounded-tile overflow-hidden border border-border bg-black max-h-[62vh]" style={{ aspectRatio: ratioCss(format), maxWidth: format === "9:16" ? 320 : "100%" }}>
        <video src={url} poster={poster} controls playsInline className="w-full h-full object-contain bg-black" />
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={download} className="inline-flex items-center gap-2 h-10 px-4 rounded-tile border border-border bg-card hover:bg-surface-2 text-[12.5px] font-medium">
          <Download className="w-4 h-4" strokeWidth={1.8} /> Скачать
        </button>
        <button type="button" onClick={onRegenerate} className="inline-flex items-center gap-2 h-10 px-4 rounded-tile border border-border bg-card hover:bg-surface-2 text-[12.5px] font-medium">
          <RotateCw className="w-4 h-4" strokeWidth={1.8} /> Ещё вариант
        </button>
        <a href="/app/media" className="inline-flex items-center gap-2 h-10 px-4 rounded-tile border border-border bg-card hover:bg-surface-2 text-[12.5px] font-medium">
          <Wand2 className="w-4 h-4" strokeWidth={1.8} /> В медиатеку
        </a>
      </div>
    </div>
  );
}

/* ────────── мелкие части ────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-tile border border-border bg-card p-3">
      <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground/80 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function FrameBox({ label, src, onUpload, onClear }: { label: string; src?: string; onUpload: React.ChangeEventHandler<HTMLInputElement>; onClear: () => void }) {
  return (
    <div className="flex-1">
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      {src ? (
        <div className="relative aspect-square rounded-tile overflow-hidden border border-border">
          <img src={src} alt={label} className="w-full h-full object-cover" />
          <button type="button" onClick={onClear} aria-label="Убрать" className="absolute top-1 right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/60 text-white">
            <X className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      ) : (
        <label className="aspect-square rounded-tile border border-dashed border-border bg-surface-1 hover:bg-surface-2 flex flex-col items-center justify-center cursor-pointer text-muted-foreground">
          <input type="file" accept="image/*" hidden onChange={onUpload} />
          <Upload className="w-5 h-5" strokeWidth={1.8} />
          <span className="text-[10.5px] mt-1">Загрузить</span>
        </label>
      )}
    </div>
  );
}

function ParamRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-[12.5px] text-muted-foreground shrink-0">{label}</span>
      <div className="min-w-0 overflow-x-auto">{children}</div>
    </div>
  );
}

function Seg({ options, value, onChange, suffix }: { options: string[]; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-tile border border-border bg-surface-1">
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={active}
            className={`h-7 px-2 rounded-md text-[11.5px] font-medium tabular-nums transition-studio ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            style={active ? { background: "var(--gradient-warm-soft)" } : undefined}
          >
            {o}{suffix}
          </button>
        );
      })}
    </div>
  );
}

function ratioCss(format: string): string {
  switch (format) {
    case "9:16": return "9 / 16";
    case "1:1": return "1 / 1";
    case "4:5": return "4 / 5";
    case "16:9": return "16 / 9";
    default: return "16 / 9";
  }
}

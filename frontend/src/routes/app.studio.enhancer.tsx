// /app/studio/enhancer, Улучшение медиа: Апскейл 4K, Шумодав, Сжатие.
// Загрузка или выбор из ассетов, состояние очереди → прогресс → до/после,
// слайдер-шторка для сравнения, авто-сохранение в медиабанк как «Энхансировано».
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Wand2,
  Upload,
  Sparkles,
  Images,
  X,
  Check,
  RotateCw,
  AlertTriangle,
  Download,
  Save,
  GripVertical,
  Maximize2,
  Volume2,
  Scissors,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  StudioWorkspace,
  ToolHeader,
  Panel,
  SegmentedTabs,
  OutputActionButton,
  SliderRow,
  type ToolTab,
} from "@/components/studio";
import { addMedia, listMedia, pickGradient, useMediaList } from "@/lib/media-store";
import { tryGenerate, refundCredits } from "@/lib/mock-credits";
import preset1 from "@/assets/preset-1.jpg";
import preset2 from "@/assets/preset-2.jpg";
import preset3 from "@/assets/preset-3.jpg";
import preset4 from "@/assets/preset-4.jpg";
import preset5 from "@/assets/preset-5.jpg";
import preset6 from "@/assets/preset-6.jpg";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/studio/enhancer")({
  head: () => ({
    meta: [
      { title: "Энхансер, neeklo studio" },
      { name: "description", content: "Апскейл до 4K, шумодав, сжатие, со сравнением до/после." },
    ],
  }),
  component: EnhancerStudio,
});

/* ────────── модели обработки ────────── */

type Mode = "upscale" | "denoise" | "compress";

const MODE_TABS: ToolTab[] = [
  { id: "upscale", label: "Апскейл до 4K" },
  { id: "denoise", label: "Убрать шум" },
  { id: "compress", label: "Сжать" },
];

const MODES: Record<
  Mode,
  {
    label: string;
    short: string;
    desc: string;
    cost: number;
    /** CSS-фильтр на превью «после», визуально передаёт характер обработки. */
    filter: string;
  }
> = {
  upscale: {
    label: "Апскейл до 4K",
    short: "4K",
    desc: "Поднимает разрешение до 3840 px, добивает детали и резкость без артефактов.",
    cost: 12,
    filter: "saturate(1.08) contrast(1.06) brightness(1.02)",
  },
  denoise: {
    label: "Убрать шум",
    short: "Denoise",
    desc: "Чистит сенсорный и компрессионный шум, сохраняя текстуры кожи и тканей.",
    cost: 6,
    filter: "saturate(1.04) contrast(1.02) blur(0.25px)",
  },
  compress: {
    label: "Сжать",
    short: "Compress",
    desc: "Сжимает файл к целевому размеру без видимой потери качества.",
    cost: 2,
    filter: "contrast(1.02)",
  },
};

/* Целевой размер для режима «Сжать» */
const TARGETS = [
  { id: "250", label: "250 КБ", kb: 250 },
  { id: "500", label: "500 КБ", kb: 500 },
  { id: "1024", label: "1 МБ", kb: 1024 },
  { id: "2048", label: "2 МБ", kb: 2048 },
];

const SAMPLE_SOURCES = [
  { id: "p1", src: preset1, title: "Студийный портрет" },
  { id: "p2", src: preset2, title: "Керамика «Глина»" },
  { id: "p3", src: preset3, title: "Reels-обложка" },
  { id: "p4", src: preset4, title: "Продукт-кадр" },
  { id: "p5", src: preset5, title: "Тёплый интерьер" },
  { id: "p6", src: preset6, title: "Lifestyle-съёмка" },
];

/* ────────── типы ────────── */

type Status = "idle" | "loading" | "processing" | "ready" | "error";

type Source = { title: string; src: string; sizeKb?: number };

type Result = {
  id: string;
  mode: Mode;
  beforeSrc: string;
  afterSrc: string;
  title: string;
  filter: string;
  beforeKb: number;
  afterKb: number;
  resolution: string;
  createdAt: number;
};

/* ────────── component ────────── */

function EnhancerStudio() {
  const [mode, setMode] = useState<Mode>("upscale");
  const [source, setSource] = useState<Source | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [target, setTarget] = useState<string>("500");
  const [result, setResult] = useState<Result | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  /*, загрузка файла, */
  const onFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Поддерживаются только изображения", { description: "JPG, PNG или WebP до 30 МБ." });
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      toast.error("Файл больше 30 МБ");
      return;
    }
    setStatus("loading");
    setResult(null);
    const url = URL.createObjectURL(file);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = url;
    // мини-задержка, чтобы показать состояние «загрузка»
    window.setTimeout(() => {
      setSource({ title: file.name.replace(/\.[^.]+$/, ""), src: url, sizeKb: Math.round(file.size / 1024) });
      setStatus("idle");
    }, 380);
  };

  const onPick = (s: { src: string; title: string }) => {
    setResult(null);
    setSource({ title: s.title, src: s.src, sizeKb: 1800 + Math.floor(Math.random() * 2400) });
    setPickerOpen(false);
  };

  /*, запуск обработки, */
  const apply = () => {
    if (!source) {
      toast.error("Сначала загрузите или выберите изображение");
      return;
    }
    if (status === "processing") return;
    if (!tryGenerate(MODES[mode].cost)) return;
    setStatus("processing");
    setProgress(0);
    setResult(null);
    const failure = Math.random() < 0.05;
    const totalMs = 2600 + Math.random() * 2400;
    const startedAt = Date.now();
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setProgress(pct);
      if (pct >= 100) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        if (failure) {
          refundCredits(MODES[mode].cost);
          setStatus("error");
          toast.error("Не удалось обработать", {
            description: "Кредиты возвращены. Попробуйте ещё раз.",
          });
          return;
        }
        finalize();
      }
    }, 90);
  };

  const finalize = () => {
    if (!source) return;
    const m = MODES[mode];
    const beforeKb = source.sizeKb ?? 1800;
    let afterKb = beforeKb;
    let resolution = "2048 × 2048";
    if (mode === "upscale") {
      afterKb = Math.round(beforeKb * 2.4);
      resolution = "3840 × 3840";
    } else if (mode === "denoise") {
      afterKb = Math.round(beforeKb * 0.92);
      resolution = "2048 × 2048";
    } else {
      const tgt = TARGETS.find((t) => t.id === target) ?? TARGETS[1];
      afterKb = Math.min(beforeKb, tgt.kb);
      resolution = "2048 × 2048";
    }
    const r: Result = {
      id: `enh_${Date.now().toString(36)}`,
      mode,
      beforeSrc: source.src,
      afterSrc: source.src, // в моке используем тот же кадр; визуально отличает CSS-фильтр
      title: source.title,
      filter: m.filter,
      beforeKb,
      afterKb,
      resolution,
      createdAt: Date.now(),
    };
    setResult(r);
    setStatus("ready");
    // авто-сохранение в ассеты
    const saved = addMedia({
      kind: "photo",
      title: `Энхансировано · ${source.title}`.slice(0, 80),
      ratio: "1:1",
      gradient: pickGradient(),
      src: source.src,
    });
    toast.success(`${m.label}: готово`, {
      description: `Сохранено в ассеты · ${(afterKb / 1024).toFixed(2)} МБ`,
      action: { label: "Открыть медиабанк", onClick: () => window.location.assign("/app/media") },
    });
    void saved;
  };

  const reset = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setStatus("idle");
    setProgress(0);
    setResult(null);
  };

  const m = MODES[mode];
  const tgtLabel = TARGETS.find((t) => t.id === target)?.label ?? ", ";

  /*, шапка, */
  const header = (
    <ToolHeader
      icon={Sparkles}
      title="Энхансер"
      subtitle="Улучшение и оптимизация медиа со сравнением до/после"
      tabs={MODE_TABS}
      activeTab={mode}
      onTabChange={(id) => {
        setMode(id as Mode);
        if (status === "ready" || status === "error") reset();
      }}
      actions={
        <span
          className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border bg-card/80 text-[12.5px]"
          title="Стоимость операции"
        >
          <Zap className="w-3.5 h-3.5 text-accent" strokeWidth={2} />
          <span className="font-semibold tabular-nums">{m.cost}</span>
          <span className="text-muted-foreground">кр</span>
        </span>
      }
    />
  );

  /*, превью, */
  const preview = (
    <PreviewArea
      source={source}
      status={status}
      progress={progress}
      result={result}
      mode={mode}
      onPickFile={() => fileRef.current?.click()}
      onPickAsset={() => setPickerOpen(true)}
      onRetry={apply}
      onClear={() => {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        setSource(null);
        reset();
      }}
    />
  );

  /*, нижний док: режимы и Apply, */
  const dock = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-muted-foreground mr-1">Режим:</span>
        <SegmentedTabs items={MODE_TABS} value={mode} onChange={(id) => setMode(id as Mode)} />
        <div className="ml-auto flex items-center gap-2">
          {result && (
            <OutputActionButton icon={Download} label="Скачать" hideLabelOnMobile onClick={() => toast("Файл сохранён")} />
          )}
          {result && (
            <OutputActionButton
              icon={Save}
              label="В ассеты"
              hideLabelOnMobile
              onClick={() => {
                addMedia({
                  kind: "photo",
                  title: `Энхансировано · ${result.title}`.slice(0, 80),
                  ratio: "1:1",
                  gradient: pickGradient(),
                  src: result.afterSrc,
                });
                toast.success("Добавлено в медиабанк");
              }}
            />
          )}
          <button
            type="button"
            onClick={apply}
            disabled={!source || status === "processing" || status === "loading"}
            className={cn(
              "inline-flex items-center gap-2 h-11 px-5 rounded-tile font-semibold text-[13.5px] transition-studio",
              "btn-primary active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {status === "processing" ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" strokeWidth={2} />
                Обработка…
              </>
            ) : status === "ready" ? (
              <>
                <RotateCw className="w-4 h-4" strokeWidth={2} />
                Обработать ещё раз
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" strokeWidth={2} />
                Применить · {m.cost} кр
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  /*, инспектор, */
  const inspector = (
    <Panel className="p-4 lg:p-5 flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-tile" style={{ background: "var(--gradient-warm-soft)" }}>
            {mode === "upscale" && <Maximize2 className="w-4 h-4 text-accent" />}
            {mode === "denoise" && <Volume2 className="w-4 h-4 text-accent" />}
            {mode === "compress" && <Scissors className="w-4 h-4 text-accent" />}
          </span>
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold leading-tight">{m.label}</div>
            <div className="text-[11.5px] text-muted-foreground">Стоимость · {m.cost} кр</div>
          </div>
        </div>
        <p className="text-[12.5px] text-muted-foreground leading-relaxed">{m.desc}</p>
      </div>

      <div className="h-px bg-border" />

      {/* Параметры режима */}
      {mode === "upscale" && (
        <div className="space-y-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Параметры</h3>
          <Row k="Целевое разрешение" v="3840 px" />
          <Row k="Резкость" v="Авто" />
          <Row k="Сохранение деталей" v="Высокое" />
        </div>
      )}
      {mode === "denoise" && (
        <div className="space-y-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Параметры</h3>
          <Row k="Тип шума" v="Сенсор + сжатие" />
          <Row k="Защита текстур" v="Кожа, ткань" />
        </div>
      )}
      {mode === "compress" && (
        <div className="space-y-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Целевой размер</h3>
          <div className="grid grid-cols-2 gap-2">
            {TARGETS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTarget(t.id)}
                className={cn(
                  "h-10 rounded-tile border text-[12.5px] font-medium transition-studio",
                  target === t.id
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border bg-card hover:bg-surface-2 text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-[11.5px] text-muted-foreground">
            Алгоритм подберёт качество, чтобы файл уложился в {tgtLabel} с минимальной видимой потерей.
          </p>
        </div>
      )}

      <div className="h-px bg-border" />

      {/* Источник */}
      <div className="space-y-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Источник</h3>
        {source ? (
          <div className="flex items-center gap-3 p-2.5 rounded-tile border border-border bg-surface-1">
            <img src={source.src} alt="" className="w-12 h-12 rounded-[8px] object-cover" />
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-medium truncate">{source.title}</div>
              <div className="text-[11.5px] text-muted-foreground">
                {source.sizeKb ? `${(source.sizeKb / 1024).toFixed(2)} МБ` : ", "}
              </div>
            </div>
            <button
              type="button"
              aria-label="Убрать"
              onClick={() => {
                if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
                setSource(null);
                reset();
              }}
              className="w-8 h-8 inline-flex items-center justify-center rounded-tile hover:bg-surface-2 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="h-10 rounded-tile border border-border bg-card hover:bg-surface-2 text-[12.5px] font-medium inline-flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" strokeWidth={2} />
              Загрузить
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="h-10 rounded-tile border border-border bg-card hover:bg-surface-2 text-[12.5px] font-medium inline-flex items-center justify-center gap-1.5"
            >
              <Images className="w-3.5 h-3.5" strokeWidth={2} />
              Из ассетов
            </button>
          </div>
        )}
      </div>

      {/* Сводка по результату */}
      {result && (
        <>
          <div className="h-px bg-border" />
          <div className="space-y-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Результат</h3>
            <Row k="Разрешение" v={result.resolution} />
            <Row
              k="Размер"
              v={`${(result.beforeKb / 1024).toFixed(2)} → ${(result.afterKb / 1024).toFixed(2)} МБ`}
            />
            <Row
              k="Изменение"
              v={
                result.afterKb < result.beforeKb
                  ? `−${Math.round((1 - result.afterKb / result.beforeKb) * 100)}%`
                  : `+${Math.round((result.afterKb / result.beforeKb - 1) * 100)}%`
              }
            />
          </div>
        </>
      )}
    </Panel>
  );

  /*, лента «Энхансировано», */
  const reel = <EnhancedReel />;

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.currentTarget.value = "";
        }}
      />
      <StudioWorkspace header={header} preview={preview} dock={dock} reel={reel} inspector={inspector} />
      {pickerOpen && (
        <AssetPicker
          onClose={() => setPickerOpen(false)}
          onPick={onPick}
        />
      )}
    </>
  );
}

/* ────────── PreviewArea ────────── */

function PreviewArea({
  source,
  status,
  progress,
  result,
  mode,
  onPickFile,
  onPickAsset,
  onRetry,
  onClear,
}: {
  source: Source | null;
  status: Status;
  progress: number;
  result: Result | null;
  mode: Mode;
  onPickFile: () => void;
  onPickAsset: () => void;
  onRetry: () => void;
  onClear: () => void;
}) {
  const [drag, setDrag] = useState(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      const ev = new Event("filepick");
      // используем тот же обработчик
      (window as Window & { __enhancerPick?: (f: File) => void }).__enhancerPick?.(f);
      void ev;
    }
  };
  void onDrop;

  //, пустое состояние , 
  if (!source) {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
        }}
        className={cn(
          "relative w-full h-full min-h-[360px] rounded-tile border-2 border-dashed transition-studio",
          "flex flex-col items-center justify-center text-center px-6 py-10",
          drag ? "border-accent bg-accent/5" : "border-border bg-surface-1/50",
        )}
      >
        <span
          className="inline-flex items-center justify-center w-14 h-14 rounded-tile mb-4"
          style={{ background: "var(--gradient-warm-soft)" }}
        >
          <Upload className="w-6 h-6 text-accent" strokeWidth={1.8} />
        </span>
        <h3 className="text-[16px] font-semibold mb-1">Перетащите файл или выберите источник</h3>
        <p className="text-[12.5px] text-muted-foreground max-w-md mb-5">
          JPG, PNG, WebP до 30 МБ. После загрузки нажмите «Применить», слева/справа появится сравнение до/после.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onPickFile}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-tile btn-primary text-[13px] font-semibold"
          >
            <Upload className="w-4 h-4" strokeWidth={2} />
            Загрузить файл
          </button>
          <button
            type="button"
            onClick={onPickAsset}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-tile border border-border bg-card hover:bg-surface-2 text-[13px] font-medium"
          >
            <Images className="w-4 h-4" strokeWidth={1.8} />
            Выбрать из ассетов
          </button>
        </div>
      </div>
    );
  }

  //, загрузка файла , 
  if (status === "loading") {
    return (
      <FrameWrap>
        <div className="absolute inset-0 grid place-items-center text-center text-muted-foreground">
          <div>
            <RotateCw className="w-6 h-6 mx-auto mb-2 animate-spin text-accent" />
            <div className="text-[13px]">Готовим источник…</div>
          </div>
        </div>
      </FrameWrap>
    );
  }

  //, обработка , 
  if (status === "processing") {
    return (
      <FrameWrap>
        <img src={source.src} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-[13px] font-semibold">{MODES[mode].label}</span>
            <span className="ml-auto text-[12.5px] text-muted-foreground tabular-nums">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width]"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, var(--accent), color-mix(in oklab, var(--accent) 70%, white))",
              }}
            />
          </div>
          <div className="mt-2 text-[11.5px] text-muted-foreground">
            Анализ кадра · восстановление деталей · финальный проход
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="absolute top-3 right-3 w-9 h-9 rounded-tile bg-background/70 backdrop-blur border border-border inline-flex items-center justify-center"
          aria-label="Отменить"
        >
          <X className="w-4 h-4" />
        </button>
      </FrameWrap>
    );
  }

  //, ошибка , 
  if (status === "error") {
    return (
      <FrameWrap>
        <img src={source.src} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-background/60" />
        <div className="relative z-10 h-full grid place-items-center text-center px-6">
          <div className="max-w-sm">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-tile bg-destructive/10 text-destructive mb-3">
              <AlertTriangle className="w-6 h-6" />
            </span>
            <h3 className="text-[16px] font-semibold mb-1">Не удалось обработать</h3>
            <p className="text-[12.5px] text-muted-foreground mb-4">
              Кредиты не списались. Можно попробовать ещё раз или сменить режим.
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-tile btn-primary text-[13px] font-semibold"
            >
              <RotateCw className="w-4 h-4" /> Повторить
            </button>
          </div>
        </div>
      </FrameWrap>
    );
  }

  //, готово: до/после со слайдером , 
  if (status === "ready" && result) {
    return <BeforeAfter result={result} />;
  }

  //, idle с источником: показ оригинала с подсказкой , 
  return (
    <FrameWrap>
      <img src={source.src} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <div className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-background/70 backdrop-blur border border-border text-[12px]">
          <Check className="w-3.5 h-3.5 text-accent" />
          Источник готов, нажмите «Применить»
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="absolute top-3 right-3 w-9 h-9 rounded-tile bg-background/70 backdrop-blur border border-border inline-flex items-center justify-center"
        aria-label="Убрать источник"
      >
        <X className="w-4 h-4" />
      </button>
    </FrameWrap>
  );
}

function FrameWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full h-full min-h-[360px] rounded-tile overflow-hidden border border-border bg-surface-1">
      {children}
    </div>
  );
}

/* ────────── BeforeAfter, слайдер-шторка ────────── */

function BeforeAfter({ result }: { result: Result }) {
  const [pos, setPos] = useState(50);
  const wrapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = (clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPos(pct);
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      updateFromClientX(e.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div className="flex flex-col gap-3 h-full">
      <div
        ref={wrapRef}
        className="relative w-full flex-1 min-h-[360px] rounded-tile overflow-hidden border border-border bg-surface-1 select-none cursor-ew-resize"
        onPointerDown={(e) => {
          draggingRef.current = true;
          updateFromClientX(e.clientX);
        }}
      >
        {/* «До», снизу */}
        <img
          src={result.beforeSrc}
          alt="До обработки"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        {/* «После», поверх, обрезан слева */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
        >
          <img
            src={result.afterSrc}
            alt="После обработки"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: result.filter }}
            draggable={false}
          />
        </div>

        {/* Метки */}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-background/75 backdrop-blur border border-border text-[11.5px] font-semibold uppercase tracking-wider">
          До
        </span>
        <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-semibold uppercase tracking-wider text-white" style={{ background: "var(--accent)" }}>
          <Sparkles className="w-3 h-3" /> После
        </span>

        {/* Линия + ручка */}
        <div className="absolute inset-y-0 pointer-events-none" style={{ left: `${pos}%` }}>
          <div className="w-px h-full bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white text-graphite shadow-lg border border-white/40 inline-flex items-center justify-center cursor-ew-resize"
          style={{ left: `${pos}%`, color: "var(--graphite-900, #1a1a1a)" }}
          onPointerDown={(e) => {
            e.stopPropagation();
            draggingRef.current = true;
          }}
          aria-label="Перетащить разделитель"
        >
          <GripVertical className="w-4 h-4 text-foreground" />
        </div>
      </div>

      {/* Числовой контроль для клавиатуры/тача */}
      <div className="px-1">
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          className="studio-slider w-full"
          style={{ ["--pct" as never]: `${pos}%` }}
          aria-label="Позиция шторки сравнения"
        />
      </div>
    </div>
  );
}

/* ────────── AssetPicker ────────── */

function AssetPicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (s: { src: string; title: string }) => void;
}) {
  const { items } = useMediaList();
  const savedWithSrc = useMemo(
    () => items.filter((i) => i.kind === "photo" && i.src),
    [items],
  );

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-background/70 backdrop-blur"
      onClick={onClose}
    >
      <Panel
        className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-[15px] font-semibold">Выбрать из ассетов</h3>
            <p className="text-[12px] text-muted-foreground">Готовые сэмплы и сохранённые работы</p>
          </div>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="w-9 h-9 inline-flex items-center justify-center rounded-tile hover:bg-surface-2"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="p-5 overflow-y-auto space-y-5">
          <section>
            <h4 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Сэмплы
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {SAMPLE_SOURCES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onPick(s)}
                  className="group aspect-square rounded-tile overflow-hidden border border-border hover:border-accent transition-studio relative"
                >
                  <img src={s.src} alt={s.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform" />
                  <span className="absolute inset-x-0 bottom-0 px-2 py-1.5 text-[10.5px] font-medium text-white bg-gradient-to-t from-black/70 to-transparent text-left truncate">
                    {s.title}
                  </span>
                </button>
              ))}
            </div>
          </section>
          {savedWithSrc.length > 0 && (
            <section>
              <h4 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Из медиабанка
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {savedWithSrc.slice(0, 12).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onPick({ src: s.src!, title: s.title })}
                    className="group aspect-square rounded-tile overflow-hidden border border-border hover:border-accent transition-studio relative"
                  >
                    <img src={s.src} alt={s.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform" />
                    <span className="absolute inset-x-0 bottom-0 px-2 py-1.5 text-[10.5px] font-medium text-white bg-gradient-to-t from-black/70 to-transparent text-left truncate">
                      {s.title}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </Panel>
    </div>
  );
}

/* ────────── Reel «Энхансировано» ────────── */

function EnhancedReel() {
  const [items, setItems] = useState(() => (typeof window === "undefined" ? [] : listMedia()));
  useEffect(() => {
    const refresh = () => setItems(listMedia());
    window.addEventListener("media-store-changed", refresh);
    return () => window.removeEventListener("media-store-changed", refresh);
  }, []);
  const enhanced = items.filter((i) => i.title.startsWith("Энхансировано")).slice(0, 8);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[15px] font-semibold tracking-tight">Энхансировано</h2>
        <span className="text-[11.5px] text-muted-foreground">
          {enhanced.length > 0 ? `${enhanced.length} файла(ов) сохранено` : "Здесь появятся ваши работы"}
        </span>
      </div>
      {enhanced.length === 0 ? (
        <Panel className="p-6 text-center text-muted-foreground text-[12.5px]">
          После «Применить» результат автоматически сохраняется сюда и в медиабанк.
        </Panel>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {enhanced.map((it) => (
            <div key={it.id} className="aspect-square rounded-tile overflow-hidden border border-border bg-surface-1 relative">
              {it.src ? (
                <img src={it.src} alt={it.title} className="w-full h-full object-cover" />
              ) : (
                <div className={cn("w-full h-full bg-gradient-to-br", it.gradient)} />
              )}
              <span className="absolute top-2 left-2 inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10.5px] font-semibold uppercase tracking-wider text-white" style={{ background: "var(--accent)" }}>
                <Sparkles className="w-3 h-3" /> Enh
              </span>
              <span className="absolute inset-x-0 bottom-0 px-2 py-1.5 text-[11px] font-medium text-white bg-gradient-to-t from-black/70 to-transparent truncate">
                {it.title.replace(/^Энхансировано · /, "")}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ────────── маленький Row ────────── */

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-[12.5px]">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium tabular-nums">{v}</span>
    </div>
  );
}

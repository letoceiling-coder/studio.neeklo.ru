// /app/studio/realtime, Скетч → рендер в реальном времени.
// Слева холст (кисть/ластик/заливка/текст/вставка изображения), справа живой
// рендер по моку. Снизу, промпт, режимы Realtime Edit / Draw, формат,
// Examples, Seed. Кнопки Model, Upscale, Record, Save. Индикатор лимита.
import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Zap,
  Brush,
  Eraser,
  PaintBucket,
  Type as TypeIcon,
  ImagePlus,
  Trash2,
  Undo2,
  Save,
  Maximize2,
  CircleDot,
  Cpu,
  Dice5,
  Sparkles,
  Lightbulb,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Panel, ToolHeader, SegmentedTabs, type ToolTab } from "@/components/studio";
import { addMedia, pickGradient } from "@/lib/media-store";
import { tryGenerate } from "@/lib/mock-credits";
import preset1 from "@/assets/preset-1.jpg";
import preset2 from "@/assets/preset-2.jpg";
import preset3 from "@/assets/preset-3.jpg";
import preset4 from "@/assets/preset-4.jpg";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/studio/realtime")({
  head: () => ({
    meta: [
      { title: "Realtime · скетч в рендер, neeklo studio" },
      {
        name: "description",
        content: "Рисуй слева, справа сразу появляется фотореалистичный рендер.",
      },
    ],
  }),
  component: RealtimeStudio,
});

/* ────────── типы ────────── */

type Tool = "brush" | "eraser" | "fill" | "text" | "image";
type Mode = "realtime" | "draw";
type RenderState = "idle" | "rendering" | "ready";

const MODE_TABS: ToolTab[] = [
  { id: "realtime", label: "Realtime Edit" },
  { id: "draw", label: "Draw" },
];

const FORMATS = [
  { id: "1:1", label: "1:1", w: 1024, h: 1024 },
  { id: "3:4", label: "3:4", w: 864, h: 1152 },
  { id: "16:9", label: "16:9", w: 1280, h: 720 },
] as const;

const MODELS = [
  { id: "flash", label: "Realtime Flash", desc: "Самая быстрая, ~150 мс", cost: 1 },
  { id: "lcm", label: "LCM-XL", desc: "Баланс качества и скорости", cost: 2 },
  { id: "sdxl", label: "SDXL-Turbo", desc: "Максимум деталей", cost: 4 },
] as const;

const PALETTE = [
  "#0F1115", "#FFFFFF", "#F26B5E", "#F4B03A", "#7CC4A3",
  "#5A8DEE", "#A78BFA", "#EC7AB6", "#8B6B4A", "#9CA3AF",
];

const EXAMPLES = [
  {
    id: "chair",
    label: "Стул у окна",
    prompt: "Минималистичный деревянный стул у окна, мягкий утренний свет, скандинавский интерьер",
    render: preset1,
    /** Простой набросок стула, рисуется на холсте по клику. */
    strokes: [
      // спинка
      { x1: 0.42, y1: 0.22, x2: 0.42, y2: 0.55 },
      { x1: 0.58, y1: 0.22, x2: 0.58, y2: 0.55 },
      { x1: 0.42, y1: 0.22, x2: 0.58, y2: 0.22 },
      // сиденье
      { x1: 0.36, y1: 0.55, x2: 0.66, y2: 0.55 },
      { x1: 0.36, y1: 0.55, x2: 0.36, y2: 0.6 },
      { x1: 0.66, y1: 0.55, x2: 0.66, y2: 0.6 },
      { x1: 0.36, y1: 0.6, x2: 0.66, y2: 0.6 },
      // ножки
      { x1: 0.4, y1: 0.6, x2: 0.4, y2: 0.86 },
      { x1: 0.62, y1: 0.6, x2: 0.62, y2: 0.86 },
      // подоконник за стулом
      { x1: 0.1, y1: 0.45, x2: 0.9, y2: 0.45 },
    ],
  },
  {
    id: "mug",
    label: "Чашка с паром",
    prompt: "Керамическая чашка кофе с паром, тёмный мраморный стол, мягкий боковой свет",
    render: preset2,
    strokes: [
      { x1: 0.38, y1: 0.5, x2: 0.62, y2: 0.5 },
      { x1: 0.38, y1: 0.5, x2: 0.38, y2: 0.78 },
      { x1: 0.62, y1: 0.5, x2: 0.62, y2: 0.78 },
      { x1: 0.38, y1: 0.78, x2: 0.62, y2: 0.78 },
      { x1: 0.62, y1: 0.56, x2: 0.74, y2: 0.62 },
      { x1: 0.74, y1: 0.62, x2: 0.7, y2: 0.7 },
      { x1: 0.46, y1: 0.42, x2: 0.46, y2: 0.36 },
      { x1: 0.54, y1: 0.44, x2: 0.54, y2: 0.36 },
    ],
  },
  {
    id: "tower",
    label: "Силуэт башни",
    prompt: "Силуэт средневековой башни на закате, тёплое небо, лёгкий туман",
    render: preset3,
    strokes: [
      { x1: 0.45, y1: 0.18, x2: 0.55, y2: 0.18 },
      { x1: 0.45, y1: 0.18, x2: 0.45, y2: 0.82 },
      { x1: 0.55, y1: 0.18, x2: 0.55, y2: 0.82 },
      { x1: 0.45, y1: 0.82, x2: 0.55, y2: 0.82 },
      { x1: 0.3, y1: 0.82, x2: 0.7, y2: 0.82 },
      { x1: 0.48, y1: 0.32, x2: 0.52, y2: 0.32 },
      { x1: 0.48, y1: 0.5, x2: 0.52, y2: 0.5 },
    ],
  },
  {
    id: "wave",
    label: "Волна и луна",
    prompt: "Лунная дорожка на ночном океане, длинная волна на переднем плане, киношный свет",
    render: preset4,
    strokes: [
      { x1: 0.1, y1: 0.65, x2: 0.9, y2: 0.55 },
      { x1: 0.1, y1: 0.78, x2: 0.9, y2: 0.7 },
      { x1: 0.72, y1: 0.22, x2: 0.78, y2: 0.22 },
      { x1: 0.72, y1: 0.22, x2: 0.72, y2: 0.28 },
      { x1: 0.78, y1: 0.22, x2: 0.78, y2: 0.28 },
      { x1: 0.72, y1: 0.28, x2: 0.78, y2: 0.28 },
    ],
  },
] as const;

type Example = (typeof EXAMPLES)[number];

const CREDITS_TOTAL = 800;

/* ────────── вспомогательные функции рисования ────────── */

function drawExample(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strokes: Example["strokes"],
) {
  ctx.save();
  ctx.fillStyle = "#FAFAF7";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#0F1115";
  ctx.lineWidth = Math.max(2, Math.round(width / 220));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (const s of strokes) {
    ctx.moveTo(s.x1 * width, s.y1 * height);
    ctx.lineTo(s.x2 * width, s.y2 * height);
  }
  ctx.stroke();
  ctx.restore();
}

function clearCanvas(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#FAFAF7";
  ctx.fillRect(0, 0, w, h);
}

/* ───────────────────────── component ───────────────────────── */

function RealtimeStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const snapshots = useRef<string[]>([]);

  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState<string>(PALETTE[0]);
  const [brushSize, setBrushSize] = useState(6);
  const [mode, setMode] = useState<Mode>("realtime");
  const [formatId, setFormatId] = useState<(typeof FORMATS)[number]["id"]>("1:1");
  const [modelId, setModelId] = useState<(typeof MODELS)[number]["id"]>("flash");
  const [prompt, setPrompt] = useState("Минималистичный деревянный стул у окна, мягкий утренний свет");
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 99999));
  const [renderState, setRenderState] = useState<RenderState>("idle");
  const [renderImage, setRenderImage] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [upscaled, setUpscaled] = useState(false);
  const renderTimer = useRef<number | null>(null);

  const format = useMemo(() => FORMATS.find((f) => f.id === formatId)!, [formatId]);
  const model = useMemo(() => MODELS.find((m) => m.id === modelId)!, [modelId]);
  const creditsLeft = Math.max(0, CREDITS_TOTAL - creditsUsed);
  const limitPct = Math.min(100, (creditsUsed / CREDITS_TOTAL) * 100);

  /* ───── canvas init / resize ───── */
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const wCSS = Math.floor(rect.width);
    const hCSS = Math.floor((wCSS * format.h) / format.w);
    canvas.style.width = wCSS + "px";
    canvas.style.height = hCSS + "px";
    if (canvas.width !== wCSS * dpr || canvas.height !== hCSS * dpr) {
      const prev = canvas.toDataURL();
      canvas.width = wCSS * dpr;
      canvas.height = hCSS * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      clearCanvas(ctx, wCSS, hCSS);
      if (snapshots.current.length > 0) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, wCSS, hCSS);
        img.src = prev;
      }
    }
  }, [format]);

  useEffect(() => {
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [resizeCanvas]);

  /* ───── undo snapshot ───── */
  const snapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    snapshots.current.push(canvas.toDataURL());
    if (snapshots.current.length > 20) snapshots.current.shift();
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const prev = snapshots.current.pop();
    if (!prev) {
      const rect = canvas.getBoundingClientRect();
      clearCanvas(ctx, rect.width, rect.height);
      setHasStrokes(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      clearCanvas(ctx, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
    img.src = prev;
  };

  const clearAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    snapshot();
    const rect = canvas.getBoundingClientRect();
    clearCanvas(ctx, rect.width, rect.height);
    setHasStrokes(false);
    setRenderState("idle");
    setRenderImage(null);
  };

  /* ───── render trigger ───── */
  const triggerRender = useCallback(
    (image?: string) => {
      if (!tryGenerate(Math.max(1, model.cost))) return;
      if (renderTimer.current) window.clearTimeout(renderTimer.current);
      const targetImage = image ?? pickRenderForPrompt(prompt);
      setRenderState("rendering");
      setRenderProgress(0);
      const start = Date.now();
      const total = mode === "realtime" ? 700 : 1400;
      const tick = window.setInterval(() => {
        const elapsed = Date.now() - start;
        setRenderProgress(Math.min(100, (elapsed / total) * 100));
      }, 50);
      renderTimer.current = window.setTimeout(() => {
        window.clearInterval(tick);
        setRenderProgress(100);
        setRenderImage(targetImage);
        setRenderState("ready");
        setCreditsUsed((c) => c + model.cost);
        setUpscaled(false);
      }, total);
    },
    [mode, model.cost, prompt],
  );

  /* ───── pointer drawing ───── */
  const getPoint = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (tool === "image" || tool === "text") return; // обрабатываются отдельно
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    snapshot();
    canvas.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = getPoint(e);
    lastPoint.current = p;

    if (tool === "fill") {
      ctx.fillStyle = color;
      const rect = canvas.getBoundingClientRect();
      ctx.fillRect(0, 0, rect.width, rect.height);
      setHasStrokes(true);
      drawing.current = false;
      if (mode === "realtime") triggerRender();
      return;
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = tool === "eraser" ? brushSize * 2.4 : brushSize;
    ctx.strokeStyle = tool === "eraser" ? "#FAFAF7" : color;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.01, p.y + 0.01);
    ctx.stroke();
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = getPoint(e);
    const prev = lastPoint.current ?? p;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPoint.current = p;
  };

  const handlePointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setHasStrokes(true);
    if (mode === "realtime") triggerRender();
  };

  /* ───── text вставка ───── */
  const handleCanvasClick = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (tool !== "text") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const text = window.prompt("Текст на холсте", "Текст");
    if (!text) return;
    snapshot();
    const p = getPoint(e);
    ctx.fillStyle = color;
    ctx.font = `${Math.max(16, brushSize * 3)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(text, p.x, p.y);
    setHasStrokes(true);
    if (mode === "realtime") triggerRender();
  };

  /* ───── вставка изображения ───── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImagePick = () => fileInputRef.current?.click();
  const handleImageFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      snapshot();
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min((rect.width * 0.6) / img.width, (rect.height * 0.6) / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (rect.width - w) / 2, (rect.height - h) / 2, w, h);
      setHasStrokes(true);
      URL.revokeObjectURL(url);
      if (mode === "realtime") triggerRender();
    };
    img.src = url;
    e.target.value = "";
  };

  /* ───── examples ───── */
  const loadExample = (ex: Example) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    snapshot();
    const rect = canvas.getBoundingClientRect();
    drawExample(ctx, rect.width, rect.height, ex.strokes);
    setHasStrokes(true);
    setPrompt(ex.prompt);
    setRenderImage(null);
    triggerRender(ex.render);
  };

  /* ───── manual render in Draw mode ───── */
  const onRenderNow = () => {
    if (!hasStrokes) {
      toast.error("Сначала нарисуй что-нибудь");
      return;
    }
    triggerRender();
  };

  /* ───── Upscale / Record / Save ───── */
  const onUpscale = () => {
    if (renderState !== "ready" || !renderImage) {
      toast.error("Сначала дождись рендера");
      return;
    }
    toast.promise(
      new Promise<void>((resolve) =>
        window.setTimeout(() => {
          setUpscaled(true);
          setCreditsUsed((c) => c + 6);
          resolve();
        }, 1200),
      ),
      { loading: "Апскейл до 4K…", success: "Готово · 4K", error: "Ошибка апскейла" },
    );
  };

  const onRecord = () => {
    if (recording) {
      setRecording(false);
      toast.success("Запись остановлена · сохранено в Историю");
      return;
    }
    setRecording(true);
    toast.success("Запись таймлапса началась");
  };

  const onSave = () => {
    if (renderState !== "ready" || !renderImage) {
      toast.error("Нет готового рендера");
      return;
    }
    addMedia({
      kind: "photo",
      title: `Realtime · ${prompt.slice(0, 40)}${upscaled ? " · 4K" : ""}`,
      ratio: formatId,
      gradient: pickGradient(seed),
      src: renderImage,
    });
    toast.success("Сохранено в ассеты");
  };

  /* ───── derived ───── */
  const PromptIcon = renderState === "rendering" ? Loader2 : Sparkles;

  return (
    <div className="min-h-dvh w-full px-4 sm:px-6 lg:px-8 py-5 lg:py-7 max-w-[1500px] mx-auto">
      <ToolHeader
        icon={Zap}
        title="Realtime · скетч в рендер"
        subtitle="Рисуй слева, справа сразу появляется фотореалистичный рендер"
        actions={
          <div className="flex items-center gap-2">
            <CreditIndicator used={creditsUsed} total={CREDITS_TOTAL} pct={limitPct} />
          </div>
        }
      />

      {/* ───── split: canvas + render ───── */}
      <div className="grid gap-4 lg:gap-5 lg:grid-cols-2">
        {/* canvas side */}
        <Panel className="p-3 sm:p-4 flex flex-col gap-3">
          <Toolbar
            tool={tool}
            setTool={setTool}
            color={color}
            setColor={setColor}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            onUndo={undo}
            onClear={clearAll}
            onPickImage={handleImagePick}
          />
          <div
            ref={wrapRef}
            className="rounded-tile bg-[#FAFAF7] border border-border overflow-hidden relative"
          >
            <canvas
              ref={canvasRef}
              className={cn(
                "block w-full touch-none",
                tool === "image" ? "cursor-copy" : tool === "text" ? "cursor-text" : "cursor-crosshair",
              )}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onClick={handleCanvasClick}
            />
            {!hasStrokes && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none text-foreground/40">
                <Brush className="w-7 h-7" strokeWidth={1.5} />
                <p className="text-sm">Нарисуй или выбери пример</p>
                <p className="text-xs">Realtime обновит рендер автоматически</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFile}
            />
          </div>
          <p className="text-xs text-foreground/55">
            Инструмент: <span className="text-foreground/85">{TOOL_LABEL[tool]}</span> · Формат {formatId}
          </p>
        </Panel>

        {/* render side */}
        <Panel className="p-3 sm:p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <PromptIcon
                className={cn("w-4 h-4 text-accent", renderState === "rendering" && "animate-spin")}
                strokeWidth={1.75}
              />
              <span className="font-medium">Живой рендер</span>
              <span className="text-foreground/50">· {model.label}</span>
            </div>
            <div className="text-xs text-foreground/55">
              {renderState === "ready" && upscaled && (
                <span className="inline-flex items-center gap-1 text-accent">
                  <Check className="w-3 h-3" /> 4K
                </span>
              )}
              {renderState === "rendering" && <span>{Math.round(renderProgress)}%</span>}
            </div>
          </div>

          <div className="rounded-tile bg-foreground/5 border border-border overflow-hidden relative aspect-square">
            {renderImage ? (
              <img
                src={renderImage}
                alt="Рендер"
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                  renderState === "rendering" ? "opacity-60" : "opacity-100",
                )}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-foreground/40">
                <Sparkles className="w-7 h-7" strokeWidth={1.5} />
                <p className="text-sm">Здесь появится рендер</p>
                <p className="text-xs">Начни рисовать на холсте слева</p>
              </div>
            )}

            {renderState === "rendering" && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 h-1 bg-foreground/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-[width] duration-100"
                    style={{ width: `${renderProgress}%` }}
                  />
                </div>
                <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur px-2.5 py-1 text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" /> Рендерим…
                </div>
              </>
            )}

            {recording && (
              <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur px-2.5 py-1 text-xs">
                <CircleDot className="w-3 h-3 text-[color:var(--destructive,_#ef4444)] animate-pulse" />
                REC
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ActionBtn icon={Cpu} onClick={() => cycleModel(modelId, setModelId)}>
              {model.label}
            </ActionBtn>
            <ActionBtn icon={Maximize2} onClick={onUpscale} disabled={renderState !== "ready"}>
              Upscale 4K
            </ActionBtn>
            <ActionBtn icon={CircleDot} onClick={onRecord} active={recording}>
              {recording ? "Стоп" : "Record"}
            </ActionBtn>
            <ActionBtn icon={Save} onClick={onSave} disabled={renderState !== "ready"} primary>
              Save
            </ActionBtn>
          </div>
        </Panel>
      </div>

      {/* ───── bottom dock ───── */}
      <Panel className="mt-4 p-4 flex flex-col gap-4">
        <div className="grid lg:grid-cols-[1fr_auto] gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-foreground/60">Промпт</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-tile bg-foreground/[0.04] border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              placeholder="Опиши сцену, стиль, свет, что должен сделать рендер из твоего скетча"
            />
          </div>
          <button
            type="button"
            onClick={onRenderNow}
            className="h-11 px-4 rounded-tile bg-accent text-accent-foreground font-medium text-sm hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-50"
            disabled={renderState === "rendering"}
          >
            {renderState === "rendering" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Рендер · {model.cost} кр
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[auto_auto_1fr_auto] items-center">
          <SegmentedTabs items={MODE_TABS} value={mode} onChange={(v) => setMode(v as Mode)} />

          <div className="flex items-center gap-1.5 rounded-tile border border-border p-1">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormatId(f.id)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs",
                  formatId === f.id
                    ? "bg-foreground text-background"
                    : "text-foreground/65 hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="hidden md:block" />

          <div className="flex items-center gap-2">
            <label className="text-xs text-foreground/60 inline-flex items-center gap-1.5">
              <Dice5 className="w-3.5 h-3.5" /> Seed
            </label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value) || 0)}
              className="w-24 rounded-tile bg-foreground/[0.04] border border-border px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={() => setSeed(Math.floor(Math.random() * 99999))}
              className="text-xs text-foreground/60 hover:text-foreground underline-offset-2 hover:underline"
            >
              Случайный
            </button>
          </div>
        </div>

        {/* examples */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-accent" />
            <p className="text-xs text-foreground/60 uppercase tracking-wider">Examples</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => loadExample(ex)}
                className="shrink-0 group rounded-tile border border-border bg-foreground/[0.03] hover:border-accent/60 transition-colors p-1.5 pr-3 flex items-center gap-2"
              >
                <img src={ex.render} alt="" className="w-10 h-10 rounded-md object-cover" />
                <span className="text-xs font-medium">{ex.label}</span>
              </button>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ───────────────────────── sub-components ───────────────────────── */

const TOOL_LABEL: Record<Tool, string> = {
  brush: "Кисть",
  eraser: "Ластик",
  fill: "Заливка",
  text: "Текст",
  image: "Изображение",
};

const TOOLS: Array<{ id: Tool; label: string; icon: typeof Brush }> = [
  { id: "brush", label: "Кисть", icon: Brush },
  { id: "eraser", label: "Ластик", icon: Eraser },
  { id: "fill", label: "Заливка", icon: PaintBucket },
  { id: "text", label: "Текст", icon: TypeIcon },
  { id: "image", label: "Изображение", icon: ImagePlus },
];

function Toolbar({
  tool,
  setTool,
  color,
  setColor,
  brushSize,
  setBrushSize,
  onUndo,
  onClear,
  onPickImage,
}: {
  tool: Tool;
  setTool: (t: Tool) => void;
  color: string;
  setColor: (c: string) => void;
  brushSize: number;
  setBrushSize: (n: number) => void;
  onUndo: () => void;
  onClear: () => void;
  onPickImage: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-tile border border-border p-1">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              title={t.label}
              onClick={() => {
                setTool(t.id);
                if (t.id === "image") onPickImage();
              }}
              className={cn(
                "inline-flex items-center justify-center w-8 h-8 rounded-md text-foreground/70",
                tool === t.id
                  ? "bg-foreground text-background"
                  : "hover:bg-foreground/10 hover:text-foreground",
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={1.75} />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1 rounded-tile border border-border p-1">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            title={c}
            className={cn(
              "w-5 h-5 rounded-full border",
              color === c ? "ring-2 ring-accent border-transparent" : "border-foreground/15",
            )}
            style={{ background: c }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 px-2">
        <span className="text-xs text-foreground/60">Размер</span>
        <input
          type="range"
          min={2}
          max={36}
          step={1}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-24 accent-[color:var(--accent)]"
        />
        <span className="text-xs text-foreground/60 w-6 text-right">{brushSize}</span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={onUndo}
          className="inline-flex items-center gap-1 rounded-md px-2 h-8 text-xs text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
          title="Отменить"
        >
          <Undo2 className="w-3.5 h-3.5" /> Назад
        </button>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-md px-2 h-8 text-xs text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
          title="Очистить"
        >
          <Trash2 className="w-3.5 h-3.5" /> Очистить
        </button>
      </div>
    </div>
  );
}

function ActionBtn({
  icon: Icon,
  children,
  onClick,
  disabled,
  primary,
  active,
}: {
  icon: typeof Cpu;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-3 rounded-tile text-xs font-medium border transition-colors",
        primary
          ? "bg-foreground text-background border-transparent hover:opacity-90"
          : active
          ? "bg-accent/15 text-accent border-accent/30"
          : "bg-foreground/[0.04] border-border text-foreground/80 hover:text-foreground hover:bg-foreground/10",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  );
}

function CreditIndicator({ used, total, pct }: { used: number; total: number; pct: number }) {
  const left = total - used;
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-foreground/[0.03] pl-2.5 pr-3 py-1">
      <div className="relative w-16 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-[width]", left < 50 ? "bg-[color:var(--destructive,_#ef4444)]" : "bg-accent")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs">
        <span className="font-medium">{left}</span>
        <span className="text-foreground/50"> / {total} кр</span>
      </span>
    </div>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function cycleModel(
  current: (typeof MODELS)[number]["id"],
  set: (v: (typeof MODELS)[number]["id"]) => void,
) {
  const idx = MODELS.findIndex((m) => m.id === current);
  const next = MODELS[(idx + 1) % MODELS.length];
  set(next.id);
  toast(`Модель: ${next.label}`, { description: next.desc });
}

function pickRenderForPrompt(prompt: string): string {
  const p = prompt.toLowerCase();
  for (const ex of EXAMPLES) {
    if (ex.prompt.toLowerCase().split(" ").some((w) => w.length > 4 && p.includes(w))) {
      return ex.render;
    }
  }
  // fallback: вращаем по длине промпта
  return EXAMPLES[prompt.length % EXAMPLES.length].render;
}

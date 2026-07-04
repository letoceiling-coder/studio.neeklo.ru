import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Upload, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { tools } from "./app.tools.index";
import { tryGenerate } from "@/lib/mock-credits";
import { CreditCost } from "@/components/credit-cost";
import { GenerationCostNote } from "@/components/generation-cost-note";
import { MediaActions } from "@/components/media-actions";
import { addMediaBatch, pickGradient, type MediaItem } from "@/lib/media-store";

export const Route = createFileRoute("/app/tools/$toolId")({
  head: ({ params }) => {
    const tool = tools.find((t) => t.id === params.toolId);
    return {
      meta: [
        { title: tool ? `${tool.title}, AI-инструменты` : "Инструмент" },
        { name: "description", content: tool?.desc ?? "AI-инструмент" },
      ],
    };
  },
  component: ToolPage,
  notFoundComponent: () => (
    <div className="min-h-dvh flex items-center justify-center text-muted-foreground">
      Инструмент не найден
    </div>
  ),
});

type Phase = "idle" | "running" | "ready" | "error";

function ToolPage() {
  const { toolId } = Route.useParams();
  const tool = tools.find((t) => t.id === toolId);
  if (!tool) {
    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-[15px] text-muted-foreground">Инструмент не найден</div>
        <Link to="/app/tools" className="btn-primary inline-flex items-center gap-2 h-11 px-5 text-[13.5px]">
          <ArrowLeft className="w-4 h-4" /> К инструментам
        </Link>
      </div>
    );
  }
  const Icon = tool.icon;
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Array<Omit<MediaItem, "id" | "createdAt">>>([]);

  const needsUpload = tool.id !== "generate-photo" && tool.id !== "generate-video";
  const needsPrompt = ["generate-photo", "generate-video", "edit-photo"].includes(tool.id);

  const kind: MediaItem["kind"] = tool.id.includes("video") ? "video" : "photo";
  const ratio: MediaItem["ratio"] = tool.id === "generate-video" ? "9:16" : "1:1";
  const ctaLabel = tool.id === "generate-video" ? "Сгенерировать" : tool.id === "generate-photo" ? "Создать" : "Применить";

  const run = () => {
    if (!tryGenerate()) return;
    setPhase("running");
    setResults([]);
    setProgress(0);
    const tick = window.setInterval(() => {
      setProgress((p) => {
        const next = p + 8 + Math.random() * 12;
        if (next >= 100) {
          window.clearInterval(tick);
          // tiny chance of mock failure for visible error state
          if (Math.random() < 0.06) {
            setPhase("error");
            return 100;
          }
          const count = tool.id === "generate-video" ? 2 : 4;
          const out = Array.from({ length: count }, (_, i) => ({
            kind,
            title: `${tool.title} · ${i + 1}`,
            ratio,
            gradient: pickGradient(Date.now() + i * 37),
            duration: kind === "video" ? `0:${String(8 + Math.floor(Math.random() * 22)).padStart(2, "0")}` : undefined,
          }));
          setResults(out);
          // Auto-save so the user never loses generated work.
          addMediaBatch(out);
          setPhase("ready");
          toast.success("Готово · сохранено в медиатеку", { description: tool.title });
          return 100;
        }
        return next;
      });
    }, 160);
  };

  const reset = () => {
    setPhase("idle");
    setResults([]);
    setProgress(0);
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex justify-center">
      <div className="w-full app-screen min-h-dvh px-5 pt-14 pb-12 flex flex-col">
        <header className="mb-7 flex items-center gap-3">
          <Link
            to="/app/tools"
            aria-label="Назад"
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "color-mix(in oklab, var(--accent) 14%, transparent)" }}
          >
            <Icon className="w-[18px] h-[18px]" strokeWidth={1.6} style={{ color: "var(--accent)" }} />
          </div>
          <h1 className="text-[20px] font-bold tracking-tight">{tool.title}</h1>
        </header>

        <p className="text-[14px] text-muted-foreground mb-5">{tool.desc}</p>

        {phase === "idle" && (
          <>
            {needsUpload && (
              <label className="block mb-4">
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <div className="border border-dashed border-border rounded-2xl py-10 px-5 flex flex-col items-center justify-center gap-2 bg-card/40 cursor-pointer">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <div className="text-[14px] text-muted-foreground text-center">
                    {file ? file.name : "Перетащи фото или нажми"}
                  </div>
                </div>
              </label>
            )}

            {needsPrompt && (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опиши, что нужно"
                rows={4}
                className="w-full bg-card border border-border rounded-2xl p-4 text-[14px] outline-none resize-none placeholder:text-muted-foreground mb-4"
              />
            )}
          </>
        )}

        {phase === "running" && (
          <div className="rounded-2xl border border-border bg-card p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                Генерируем
              </div>
              <span className="text-[14px] font-semibold tabular-nums" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-background overflow-hidden">
              <div className="h-full transition-[width] duration-200" style={{ width: progress + "%", background: "var(--gradient-warm)" }} />
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 mb-4 flex flex-col items-center text-center gap-3">
            <AlertCircle className="w-7 h-7 text-destructive" />
            <div className="text-[14px] font-semibold">Не удалось сгенерировать</div>
            <div className="text-[12.5px] text-muted-foreground">Бывает. Попробуй ещё раз, кредит не списан.</div>
            <button type="button" onClick={reset} className="h-10 px-5 rounded-full bg-card border border-border text-[13px] font-medium">
              Попробовать снова
            </button>
          </div>
        )}

        {phase === "ready" && results.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-3 text-[13px] text-muted-foreground">
              <Sparkles className="w-4 h-4 text-accent" /> Готово · {results.length}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {results.map((r, i) => (
                <ResultTile key={i} item={r} />
              ))}
            </div>
            <MediaActions item={results[0]} onMore={reset} variant="stacked" saved />
            <div className="mt-1 mb-2 text-[11.5px] text-muted-foreground inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-accent" /> Авто-сохранено в медиатеку
            </div>
            <div className="mt-2 text-center">
              <Link to="/app/media" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex">
                Открыть медиатеку →
              </Link>
            </div>
          </div>
        )}

        <div className="flex-1" />

        {phase !== "ready" && (
          <button
            type="button"
            onClick={run}
            disabled={phase === "running" || (needsUpload && !file) || (needsPrompt && prompt.trim().length < 3)}
            className="h-14 rounded-full bg-gradient-warm flex items-center justify-center gap-2 text-[16px] font-semibold disabled:opacity-50"
            style={{ color: "var(--accent-foreground)", boxShadow: "var(--shadow-warm)" }}
          >
            {phase === "running" && <Loader2 className="w-5 h-5 animate-spin" />}
            {phase === "running" ? "Генерируем…" : ctaLabel}
            {phase !== "running" && <CreditCost />}
          </button>
        )}
        {phase !== "running" && <GenerationCostNote className="mt-2" />}

      </div>
    </div>
  );
}

function ResultTile({ item }: { item: Omit<MediaItem, "id" | "createdAt"> }) {
  const aspect =
    item.ratio === "9:16" ? "aspect-[9/16]" :
    item.ratio === "1:1" ? "aspect-square" :
    item.ratio === "16:9" ? "aspect-[16/9]" : "aspect-[3/4]";
  return (
    <div className={`relative ${aspect} rounded-xl overflow-hidden bg-gradient-to-br ${item.gradient} animate-fade-in`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.35),transparent_60%)]" />
      {item.duration && (
        <span className="absolute bottom-1.5 right-1.5 h-5 px-1.5 inline-flex items-center rounded-md bg-black/55 backdrop-blur-md text-[10px] font-mono text-white tabular-nums">
          {item.duration}
        </span>
      )}
    </div>
  );
}

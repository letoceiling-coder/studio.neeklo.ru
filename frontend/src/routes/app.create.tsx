import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ImagePlus, Check, AlertCircle, Sparkles, RefreshCw, BookmarkPlus, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import p1 from "@/assets/preset-1.jpg";
import p2 from "@/assets/preset-2.jpg";
import p3 from "@/assets/preset-3.jpg";
import p4 from "@/assets/preset-4.jpg";
import p5 from "@/assets/preset-5.jpg";
import p6 from "@/assets/preset-6.jpg";
import { tryGenerate } from "@/lib/mock-credits";
import { CreditCost } from "@/components/credit-cost";
import { GenerationCostNote } from "@/components/generation-cost-note";
import { addMediaBatch, pickGradient, type MediaItem } from "@/lib/media-store";
import { createShareLink } from "@/lib/share-store";

export const Route = createFileRoute("/app/create")({
  head: () => ({
    meta: [
      { title: "Создание контента" },
      { name: "description", content: "Создание серии видео из одного фото." },
    ],
  }),
  component: Create,
});

const previewPool = [p1, p2, p3, p4, p5, p6];

type Phase = "form" | "generating" | "ready" | "error";

type GenItem = Omit<MediaItem, "id" | "createdAt"> & { src: string; saved?: boolean };

function Create() {
  const [phase, setPhase] = useState<Phase>("form");
  const [count, setCount] = useState(20);
  const [prompt, setPrompt] = useState("");
  const [done, setDone] = useState(0);
  const [items, setItems] = useState<GenItem[]>([]);

  useEffect(() => {
    if (phase !== "generating") return;
    setDone(0);
    setItems([]);
    const interval = setInterval(() => {
      setDone((d) => {
        if (d >= count) {
          clearInterval(interval);
          // tiny chance of error
          if (Math.random() < 0.04) {
            setPhase("error");
            return d;
          }
          const out: GenItem[] = Array.from({ length: count }, (_, i) => ({
            kind: "video",
            title: `Ролик ${i + 1}`,
            ratio: "9:16",
            duration: `0:${String(8 + Math.floor(Math.random() * 22)).padStart(2, "0")}`,
            gradient: pickGradient(Date.now() + i * 31),
            src: previewPool[i % previewPool.length],
            saved: true,
          }));
          // Auto-save everything to the media library so nothing is lost.
          addMediaBatch(out.map(({ kind, title, ratio, gradient, duration, src }) => ({ kind, title, ratio, gradient, duration, src })));
          toast.success(`Авто-сохранено в медиатеку · ${out.length}`);
          setItems(out);
          setPhase("ready");
          return d;
        }
        return d + 1;
      });
    }, 220);
    return () => clearInterval(interval);
  }, [phase, count]);

  const start = () => { if (tryGenerate()) setPhase("generating"); };

  const saveOne = (idx: number) => {
    setItems((arr) => {
      const it = arr[idx];
      if (!it || it.saved) return arr;
      addMediaBatch([{ kind: it.kind, title: it.title, ratio: it.ratio, gradient: it.gradient, duration: it.duration, src: it.src }]);
      toast.success("Сохранено в медиатеку");
      const next = [...arr];
      next[idx] = { ...it, saved: true };
      return next;
    });
  };

  const saveAll = () => {
    const unsaved = items.filter((i) => !i.saved);
    if (unsaved.length === 0) { toast.info("Все уже в медиатеке"); return; }
    addMediaBatch(unsaved.map(({ kind, title, ratio, gradient, duration, src }) => ({ kind, title, ratio, gradient, duration, src })));
    setItems((arr) => arr.map((i) => ({ ...i, saved: true })));
    toast.success(`Сохранено ${unsaved.length} в медиатеку`);
  };

  const publishAll = () => {
    if (items[0]) {
      const { url } = createShareLink({ title: `Пачка · ${items.length}`, kind: items[0].kind, ratio: items[0].ratio, gradient: items[0].gradient, src: items[0].src });
      navigator.clipboard?.writeText(url).catch(() => {});
      toast.success("Опубликовано", { description: "Ссылка скопирована: " + url });
    }
  };

  const shareAll = () => {
    if (!items[0]) return;
    const { url } = createShareLink({ title: `Пачка · ${items.length}`, kind: items[0].kind, ratio: items[0].ratio, gradient: items[0].gradient, src: items[0].src });
    navigator.clipboard?.writeText(url).catch(() => {});
    toast.success("Короткая ссылка скопирована", { description: url });
  };

  const downloadAll = () => toast.success("Скачивание началось", { description: `${items.length} файлов` });

  const makeMore = () => { setPhase("form"); setItems([]); setDone(0); };

  return (
    <div className="min-h-dvh bg-background text-foreground flex justify-center">
      <div className="w-full app-screen flex flex-col min-h-dvh px-5 pt-14 pb-10">
        <header className="flex items-center gap-3 mb-7">
          <Link to="/app/factory" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-card transition-colors" aria-label="Назад">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Пресет</div>
            <h1 className="text-[18px] font-semibold leading-tight truncate">Neon Dance</h1>
          </div>
        </header>

        {phase === "form" && (
          <FormView count={count} setCount={setCount} prompt={prompt} setPrompt={setPrompt} onSubmit={start} />
        )}
        {phase === "generating" && <GeneratingView count={count} done={done} />}
        {phase === "error" && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 flex flex-col items-center text-center gap-3">
            <AlertCircle className="w-7 h-7 text-destructive" />
            <div className="text-[14px] font-semibold">Не удалось завершить пакет</div>
            <div className="text-[12.5px] text-muted-foreground">Попробуй ещё раз, кредит не списан.</div>
            <button onClick={makeMore} className="h-10 px-5 rounded-full bg-card border border-border text-[13px] font-medium">Попробовать снова</button>
          </div>
        )}
        {phase === "ready" && (
          <ReadyView
            items={items}
            onSaveOne={saveOne}
            onSaveAll={saveAll}
            onPublish={publishAll}
            onShare={shareAll}
            onDownload={downloadAll}
            onMore={makeMore}
          />
        )}
      </div>
    </div>
  );
}

function FormView({ count, setCount, prompt, setPrompt, onSubmit }: {
  count: number; setCount: (n: number) => void;
  prompt: string; setPrompt: (s: string) => void; onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <label className="block">
        <span className="text-[13px] text-muted-foreground mb-2 block">Фото</span>
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 flex flex-col items-center justify-center text-center hover:border-muted-foreground/60 transition-colors cursor-pointer">
          <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
            <ImagePlus className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="text-[14px] font-medium">Перетащи фото или нажми</div>
          <div className="text-[12px] text-muted-foreground mt-1">JPG или PNG, до 10 МБ</div>
          <input type="file" accept="image/*" className="hidden" />
        </div>
      </label>

      <label className="block">
        <span className="text-[13px] text-muted-foreground mb-2 block">Опиши, что нужно</span>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}
          placeholder="Например: танец в неоновом коридоре, динамичные ракурсы"
          className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-[14px] placeholder:text-muted-foreground outline-none focus:border-muted-foreground/60 transition-colors resize-none" />
      </label>

      <label className="block">
        <span className="text-[13px] text-muted-foreground mb-2 block">Сколько штук</span>
        <div className="flex items-center bg-card border border-border rounded-2xl px-2 py-1.5">
          <button type="button" onClick={() => setCount(Math.max(1, count - 1))} className="w-10 h-10 rounded-xl hover:bg-muted/60 text-[20px] text-muted-foreground" aria-label="Меньше">−</button>
          <input type="number" value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
            className="flex-1 bg-transparent text-center text-[18px] font-semibold outline-none" style={{ fontVariantNumeric: "tabular-nums" }} />
          <button type="button" onClick={() => setCount(count + 1)} className="w-10 h-10 rounded-xl hover:bg-muted/60 text-[20px] text-muted-foreground" aria-label="Больше">+</button>
        </div>
      </label>

      <button onClick={onSubmit} className="mt-3 w-full py-4 rounded-full bg-gradient-warm font-semibold text-[15px] active:scale-[0.99] inline-flex items-center justify-center gap-2"
        style={{ color: "var(--accent-foreground)", boxShadow: "var(--shadow-warm)" }}>
        Подтвердить <CreditCost />
      </button>
      <GenerationCostNote className="mt-3" />
    </div>
  );
}

function GeneratingView({ count, done }: { count: number; done: number }) {
  const pct = Math.min(100, (done / count) * 100);
  const items = Array.from({ length: count });
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] text-muted-foreground">Генерируем</span>
          <span className="text-[14px] font-semibold tabular-nums" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
            {done} / {count}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-warm transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((_, i) => {
          const ready = i < done;
          return (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-card border border-border">
              {ready ? (
                <>
                  <img loading="lazy" decoding="async" src={previewPool[i % previewPool.length]} alt="" className="w-full h-full object-cover animate-fade-in" />
                  <div className="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <Check className="w-3 h-3" style={{ color: "var(--accent)" }} />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">в очереди</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReadyView({ items, onSaveOne, onSaveAll, onPublish, onShare, onDownload, onMore }: {
  items: GenItem[];
  onSaveOne: (i: number) => void;
  onSaveAll: () => void;
  onPublish: () => void;
  onShare: () => void;
  onDownload: () => void;
  onMore: () => void;
}) {
  const allSaved = items.every((i) => i.saved);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles className="w-4 h-4 text-accent" />
        <span className="text-[14px] font-semibold">Готово</span>
        <span className="text-[12px] text-muted-foreground">· {items.length} файлов</span>
        {allSaved && (
          <span className="ml-auto inline-flex items-center gap-1 h-5 px-2 rounded-full bg-accent/10 border border-accent/30 text-[10.5px] font-semibold text-accent">
            <Check className="w-3 h-3" /> авто-сохранено
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {items.map((it, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-card border border-border group">
            <img loading="lazy" decoding="async" src={it.src} alt={it.title} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onSaveOne(i)}
              aria-label="Сохранить"
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/75 transition-colors"
            >
              {it.saved ? <Check className="w-3.5 h-3.5 text-accent" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
            </button>
            {it.duration && (
              <span className="absolute bottom-1.5 right-1.5 h-5 px-1.5 inline-flex items-center rounded-md bg-black/55 backdrop-blur-md text-[10px] font-mono text-white tabular-nums">
                {it.duration}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onDownload} className="h-11 rounded-full bg-card border border-border/70 text-[13px] font-medium inline-flex items-center justify-center gap-1.5">
          <Download className="w-4 h-4" /> Скачать все
        </button>
        <button onClick={onShare} className="h-11 rounded-full bg-card border border-border/70 text-[13px] font-medium inline-flex items-center justify-center gap-1.5">
          <Share2 className="w-4 h-4" /> Поделиться
        </button>
        <button onClick={onPublish} className="h-11 rounded-full bg-card border border-border/70 text-[13px] font-medium inline-flex items-center justify-center gap-1.5">
          <Share2 className="w-4 h-4" /> Опубликовать
        </button>
        <button onClick={onMore} className="h-11 rounded-full bg-gradient-warm text-[13px] font-semibold inline-flex items-center justify-center gap-1.5" style={{ color: "var(--accent-foreground)" }}>
          <RefreshCw className="w-4 h-4" /> Сделать ещё
        </button>
      </div>

      {!allSaved && (
        <button onClick={onSaveAll} className="h-10 rounded-full bg-card border border-border/70 text-[12.5px] font-medium inline-flex items-center justify-center gap-1.5">
          <BookmarkPlus className="w-4 h-4" /> Сохранить остальные
        </button>
      )}

      <Link to="/app/media" className="text-[12.5px] text-muted-foreground hover:text-foreground text-center">
        Открыть медиатеку →
      </Link>
    </div>
  );
}

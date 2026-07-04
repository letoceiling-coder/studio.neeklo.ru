import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronRight,
  Upload,
  Link2,
  Plus,
  FileText,
  FileCode,
  FileSpreadsheet,
  RefreshCw,
  Check,
  Trash2,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/app/knowledge/$id")({
  head: () => ({
    meta: [
      { title: "База знаний" },
      { name: "description", content: "Источники, документы, чанки и эмбеддинги базы знаний." },
    ],
  }),
  component: KnowledgeBase,
});

const TABS = [
  "Источники",
  "Документы",
  "Чанки",
  "Эмбеддинги",
] as const;

type SourceStatus = "queued" | "processing" | "ready" | "error";
type EmbeddingStatus = "ready" | "stale" | "pending";

type Source = {
  id: string;
  name: string;
  from: "file" | "url";
  status: SourceStatus;
  progress: number; // 0..100
  chunks: Chunk[];
  embedding: EmbeddingStatus;
  createdAt: string;
};

type Chunk = {
  n: number;
  chars: number;
  tokens: number;
  preview: string;
  created: string;
};

const ICONS: Record<string, LucideIcon> = {
  pdf: FileText,
  docx: FileText,
  md: FileCode,
  txt: FileCode,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  url: Link2,
};

const PREVIEWS = [
  "Тариф «Старт» включает 1 ассистента, 10 000 сообщений в месяц…",
  "Тариф «Про»: до 5 ассистентов, безлимит сообщений, API…",
  "Как подключить виджет на сайт? Скопируйте embed-код из раздела…",
  "Можно ли обучить на наших переписках? Да, выгрузите из CRM…",
  "Этап 1, установление контакта. Поздоровайтесь и уточните…",
  "Сегмент / Источник / Конверсия / Средний чек / Окно сделки…",
  "FAQ по доставке: сроки, регионы, частичный возврат…",
  "Скрипт обработки возражений «дорого», три варианта ответа…",
];

const SEED: Source[] = [
  {
    id: "s1",
    name: "price-2026.pdf",
    from: "file",
    status: "ready",
    progress: 100,
    embedding: "ready",
    createdAt: "27.06 14:02",
    chunks: [
      { n: 1, chars: 1284, tokens: 412, preview: PREVIEWS[0], created: "27.06 14:02" },
      { n: 2, chars: 1192, tokens: 388, preview: PREVIEWS[1], created: "27.06 14:02" },
    ],
  },
  {
    id: "s2",
    name: "faq.md",
    from: "file",
    status: "ready",
    progress: 100,
    embedding: "ready",
    createdAt: "27.06 14:03",
    chunks: [
      { n: 1, chars: 842, tokens: 271, preview: PREVIEWS[2], created: "27.06 14:03" },
      { n: 2, chars: 967, tokens: 312, preview: PREVIEWS[3], created: "27.06 14:03" },
    ],
  },
];

function getIcon(name: string, from: "file" | "url"): LucideIcon {
  if (from === "url") return ICONS.url;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ICONS[ext] ?? FileText;
}

function nowStamp() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm} ${hh}:${mi}`;
}

function generateChunks(): Chunk[] {
  const n = 2 + Math.floor(Math.random() * 3); // 2..4
  const stamp = nowStamp();
  return Array.from({ length: n }, (_, i) => ({
    n: i + 1,
    chars: 600 + Math.floor(Math.random() * 1200),
    tokens: 180 + Math.floor(Math.random() * 380),
    preview: PREVIEWS[Math.floor(Math.random() * PREVIEWS.length)],
    created: stamp,
  }));
}

function KnowledgeBase() {
  const { id } = Route.useParams();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Источники");
  const [url, setUrl] = useState("");
  const [sources, setSources] = useState<Source[]>(SEED);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // embeddings recompute
  const [reembedding, setReembedding] = useState(false);
  const [reembedProgress, setReembedProgress] = useState(0);

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearInterval(t));
      timers.current.clear();
    };
  }, []);

  const startProcessing = (sid: string) => {
    const interval = setInterval(() => {
      setSources((prev) =>
        prev.map((s) => {
          if (s.id !== sid) return s;
          const step = 6 + Math.floor(Math.random() * 12);
          const next = Math.min(100, s.progress + step);
          if (next >= 100) {
            const timer = timers.current.get(sid);
            if (timer) clearInterval(timer);
            timers.current.delete(sid);
            return {
              ...s,
              status: "ready",
              progress: 100,
              chunks: generateChunks(),
              embedding: "ready",
            };
          }
          return { ...s, progress: next, status: "processing" };
        })
      );
    }, 350);
    timers.current.set(sid, interval);
  };

  const addSource = (name: string, from: "file" | "url") => {
    const sid = "s" + Math.random().toString(36).slice(2, 8);
    const src: Source = {
      id: sid,
      name,
      from,
      status: "queued",
      progress: 0,
      chunks: [],
      embedding: "pending",
      createdAt: nowStamp(),
    };
    setSources((p) => [src, ...p]);
    setTimeout(() => startProcessing(sid), 250);
  };

  const onFiles = (files: FileList | null) => {
    const arr = Array.from(files ?? []);
    if (!arr.length) return;
    arr.forEach((f) => addSource(f.name, "file"));
    toast.success(arr.length + " источник(а) в обработке", {
      description: "Запускаем чанкование и эмбеддинги",
    });
  };

  const onUrl = () => {
    const v = url.trim();
    if (!v) return;
    addSource(v, "url");
    setUrl("");
    toast.success("Ссылка добавлена", { description: v });
  };

  const removeSource = (sid: string) => {
    const t = timers.current.get(sid);
    if (t) clearInterval(t);
    timers.current.delete(sid);
    setSources((p) => p.filter((s) => s.id !== sid));
  };

  const recomputeEmbeddings = () => {
    if (reembedding) return;
    setReembedding(true);
    setReembedProgress(0);
    setSources((p) =>
      p.map((s) => (s.status === "ready" ? { ...s, embedding: "pending" as const } : s))
    );
    const total = Math.max(
      1,
      sources.filter((s) => s.status === "ready").reduce((acc, s) => acc + s.chunks.length, 0)
    );
    let done = 0;
    const iv = setInterval(() => {
      done += 1 + Math.floor(Math.random() * 2);
      const pct = Math.min(100, Math.round((done / total) * 100));
      setReembedProgress(pct);
      if (pct >= 100) {
        clearInterval(iv);
        setSources((p) =>
          p.map((s) => (s.status === "ready" ? { ...s, embedding: "ready" as const } : s))
        );
        setReembedding(false);
        toast.success("Эмбеддинги пересчитаны", {
          description: total + " чанков обновлено",
        });
      }
    }, 260);
  };

  const totalChunks = useMemo(
    () => sources.reduce((acc, s) => acc + s.chunks.length, 0),
    [sources]
  );
  const totalTokens = useMemo(
    () => sources.reduce((acc, s) => acc + s.chunks.reduce((a, c) => a + c.tokens, 0), 0),
    [sources]
  );
  const readyCount = sources.filter((s) => s.status === "ready").length;
  const processingCount = sources.filter(
    (s) => s.status === "processing" || s.status === "queued"
  ).length;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full max-w-4xl px-5 pt-10 pb-16">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-4">
          <Link to="/" className="hover:text-foreground transition-colors">Ассистенты</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link
            to="/app/assistant/$id"
            params={{ id }}
            className="hover:text-foreground transition-colors"
          >
            Продажи Avito
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground">База знаний</span>
        </nav>

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[24px] leading-tight font-bold tracking-tight truncate">
                База Продажи Avito
              </h1>
              {processingCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-medium text-amber-300">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Обрабатывается {processingCount}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-medium text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Готово
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 h-10 px-4 rounded-full bg-gradient-warm text-accent-foreground text-[13px] font-semibold inline-flex items-center gap-1.5 active:scale-[0.99] transition-transform"
          >
            <Plus className="w-4 h-4" />
            Добавить источник
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-7">
          <Metric label="Источников" value={String(sources.length)} />
          <Metric label="Готовых" value={String(readyCount)} />
          <Metric label="Чанков" value={String(totalChunks)} />
          <Metric label="Токенов" value={totalTokens.toLocaleString("ru-RU")} />
        </div>

        {/* Tabs */}
        <div className="-mx-5 px-5 overflow-x-auto no-scrollbar border-b border-border/60 mb-7">
          <div className="flex gap-1 w-max">
            {TABS.map((t) => {
              const active = t === tab;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`relative h-10 px-3 text-[13px] font-medium whitespace-nowrap transition-colors ${
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                  {active && (
                    <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-accent rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {tab === "Источники" && (
          <div className="flex flex-col gap-4">
            <label className="block">
              <div
                className="rounded-2xl border border-dashed border-border/70 bg-card/40 hover:border-accent/50 transition-colors p-10 flex flex-col items-center text-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  onFiles(e.dataTransfer.files);
                }}
              >
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5 text-accent" />
                </div>
                <div className="text-[15px] font-medium">Перетащи файлы или нажми, чтобы выбрать</div>
                <div className="text-[12px] text-muted-foreground mt-1.5">
                  PDF, DOCX, XLSX, MD, TXT, до 20 МБ каждый
                </div>
              </div>
            </label>

            <div className="relative">
              <Link2 className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onUrl();
                  }
                }}
                placeholder="https://example.com/docs"
                className="w-full h-12 pl-10 pr-32 rounded-2xl bg-card border border-border/60 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/60 transition-colors"
              />
              <button
                type="button"
                disabled={!url.trim()}
                onClick={onUrl}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 rounded-full bg-card border border-border/60 text-[12px] font-medium hover:border-accent/40 transition-colors disabled:opacity-50"
              >
                Добавить url
              </button>
            </div>

            {sources.length > 0 && (
              <ul className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden">
                {sources.map((s) => {
                  const Icon = getIcon(s.name, s.from);
                  return (
                    <li key={s.id} className="px-4 py-3">
                      <div className="flex items-center gap-3 text-[13px]">
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1 font-medium">{s.name}</span>
                        <SourceStatusBadge s={s} />
                        <button
                          type="button"
                          onClick={() => removeSource(s.id)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          aria-label="Удалить источник"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {(s.status === "queued" || s.status === "processing") && (
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full bg-background overflow-hidden">
                            <div
                              className="h-full bg-gradient-warm transition-[width] duration-300"
                              style={{ width: `${s.progress}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono tabular-nums text-muted-foreground w-9 text-right">
                            {s.progress}%
                          </span>
                        </div>
                      )}
                      {s.status === "ready" && (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {s.chunks.length} чанков ·{" "}
                          {s.chunks.reduce((a, c) => a + c.tokens, 0).toLocaleString("ru-RU")} токенов
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {tab === "Документы" && (
          <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
            {sources.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Пока нет документов
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {sources.map((s) => {
                  const Icon = getIcon(s.name, s.from);
                  return (
                    <li
                      key={s.id}
                      className="px-4 py-3 flex items-center gap-3 text-[13px]"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{s.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {s.from === "url" ? "Ссылка" : "Файл"} · {s.createdAt}
                        </div>
                      </div>
                      <span className="text-[12px] text-muted-foreground font-mono tabular-nums">
                        {s.chunks.length} чанк.
                      </span>
                      <SourceStatusBadge s={s} compact />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {tab === "Чанки" && (
          <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
            {totalChunks === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Чанки появятся после обработки источников
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] min-w-[760px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                      <th className="font-medium px-4 py-3">Документ</th>
                      <th className="font-medium px-3 py-3 text-right">№</th>
                      <th className="font-medium px-3 py-3 text-right">Символов</th>
                      <th className="font-medium px-3 py-3 text-right">Токенов</th>
                      <th className="font-medium px-4 py-3">Превью</th>
                      <th className="font-medium px-4 py-3 text-right">Эмб.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.flatMap((s) => {
                      const Icon = getIcon(s.name, s.from);
                      return s.chunks.map((c) => (
                        <tr
                          key={s.id + "-" + c.n}
                          className="border-b border-border/40 last:border-0 hover:bg-background/40 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="truncate">{s.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums text-muted-foreground">
                            {c.n}
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums">
                            {c.chars.toLocaleString("ru-RU")}
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums">
                            {c.tokens.toLocaleString("ru-RU")}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[280px]">
                            <div className="truncate">{c.preview}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <EmbedDot status={s.embedding} />
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "Эмбеддинги" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-card border border-border/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-semibold">Эмбеддинги базы</div>
                  <div className="text-[12px] text-muted-foreground mt-1">
                    Модель: <span className="font-mono">text-embedding-3-large</span> · {totalChunks} чанков
                  </div>
                </div>
                <button
                  type="button"
                  onClick={recomputeEmbeddings}
                  disabled={reembedding || totalChunks === 0}
                  className="h-10 px-4 rounded-full bg-card border border-border/60 text-[13px] font-medium hover:border-accent/40 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {reembedding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {reembedding ? "Пересчитываем…" : "Пересчитать эмбеддинги"}
                </button>
              </div>
              {reembedding && (
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-background overflow-hidden">
                    <div
                      className="h-full bg-gradient-warm transition-[width] duration-300"
                      style={{ width: `${reembedProgress}%` }}
                    />
                  </div>
                  <span className="text-[12px] font-mono tabular-nums text-muted-foreground w-10 text-right">
                    {reembedProgress}%
                  </span>
                </div>
              )}
              {!reembedding && totalChunks > 0 && (
                <div className="mt-4 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11.5px] font-medium text-emerald-300">
                  <Check className="w-3.5 h-3.5" />
                  Готово · все чанки векторизованы
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
              <ul className="divide-y divide-border/40">
                {sources.map((s) => {
                  const Icon = getIcon(s.name, s.from);
                  return (
                    <li key={s.id} className="px-4 py-3 flex items-center gap-3 text-[13px]">
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1">{s.name}</span>
                      <span className="text-[11.5px] text-muted-foreground tabular-nums">
                        {s.chunks.length} чанк.
                      </span>
                      <EmbedDot status={s.embedding} label />
                    </li>
                  );
                })}
                {sources.length === 0 && (
                  <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Добавьте источники, чтобы создать эмбеддинги
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[18px] font-semibold font-mono tabular-nums mt-1">{value}</div>
    </div>
  );
}

function SourceStatusBadge({ s, compact = false }: { s: Source; compact?: boolean }) {
  if (s.status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10.5px] font-medium text-emerald-300">
        <Check className="w-3 h-3" />
        {compact ? "Готово" : "Готов"}
      </span>
    );
  }
  if (s.status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-destructive/10 border border-destructive/30 text-[10.5px] font-medium text-destructive">
        Ошибка
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10.5px] font-medium text-amber-300">
      <Loader2 className="w-3 h-3 animate-spin" />
      {s.status === "queued" ? "В очереди" : "Обработка"}
    </span>
  );
}

function EmbedDot({ status, label = false }: { status: EmbeddingStatus; label?: boolean }) {
  const map = {
    ready: { color: "bg-emerald-400", text: "text-emerald-300", label: "ok" },
    pending: { color: "bg-amber-400", text: "text-amber-300", label: "ждёт" },
    stale: { color: "bg-muted-foreground/60", text: "text-muted-foreground", label: "устарел" },
  } as const;
  const m = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.color}`} />
      {label && m.label}
    </span>
  );
}

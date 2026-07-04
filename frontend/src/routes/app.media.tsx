import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Play, X, Image as ImageIcon, UserSquare2, Film, Loader2, Trash2 } from "lucide-react";
import { useMediaList, removeMedia, type MediaItem } from "@/lib/media-store";
import { MediaActions } from "@/components/media-actions";

export const Route = createFileRoute("/app/media")({
  head: () => ({ meta: [{ title: "Медиатека" }] }),
  component: MediaLibrary,
});

type FilterId = "all" | MediaItem["kind"];

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Всё" },
  { id: "video", label: "Видео" },
  { id: "photo", label: "Фото" },
  { id: "avatar", label: "Аватары" },
];

function MediaLibrary() {
  const { items, loading } = useMediaList();
  const [filter, setFilter] = useState<FilterId>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.kind === filter)),
    [items, filter]
  );
  const open = openId ? items.find((i) => i.id === openId) ?? null : null;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-5 pt-8 pb-16">
        <Link to="/app" className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> На главную
        </Link>

        <header className="mb-5">
          <h1 className="text-[26px] lg:text-[30px] leading-tight font-bold tracking-tight">Медиатека</h1>
          <p className="text-[13.5px] text-muted-foreground mt-1">Все сохранённые видео, фото и аватары</p>
        </header>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {FILTERS.map((f) => {
            const n = f.id === "all" ? items.length : items.filter((i) => i.kind === f.id).length;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`h-9 px-4 rounded-full text-[12.5px] font-medium border transition-colors inline-flex items-center gap-1.5 ${
                  filter === f.id
                    ? "bg-accent/15 border-accent/50 text-accent"
                    : "bg-card border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                <span className="text-[10.5px] tabular-nums opacity-70">{n}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <LoadingGrid />
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} hasAny={items.length > 0} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((it) => (
              <Tile key={it.id} item={it} onOpen={() => setOpenId(it.id)} />
            ))}
          </div>
        )}
      </div>

      {open && (
        <Lightbox
          item={open}
          onClose={() => setOpenId(null)}
          onDelete={() => {
            removeMedia(open.id);
            setOpenId(null);
            toast.success("Удалено из медиатеки");
          }}
        />
      )}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-square rounded-2xl bg-card border border-border/60 animate-pulse" />
      ))}
      <div className="col-span-full text-center text-[12px] text-muted-foreground inline-flex items-center justify-center gap-2 mt-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Загружаем
      </div>
    </div>
  );
}

function EmptyState({ filter, hasAny }: { filter: FilterId; hasAny: boolean }) {
  return (
    <div className="text-center py-20 rounded-2xl border border-dashed border-border/60 bg-card/30">
      <div className="text-[15px] font-semibold mb-1">
        {hasAny ? "В этой категории пока пусто" : "Медиатека пуста"}
      </div>
      <div className="text-[13px] text-muted-foreground mb-5">
        {filter === "all" ? "Создай первое видео или фото" : "Сохрани сюда результаты генерации"}
      </div>
      <Link to="/app/create" className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-gradient-warm text-accent-foreground text-[13px] font-semibold">
        Создать
      </Link>
    </div>
  );
}

function KindIcon({ kind, className }: { kind: MediaItem["kind"]; className?: string }) {
  if (kind === "video") return <Film className={className} />;
  if (kind === "photo") return <ImageIcon className={className} />;
  return <UserSquare2 className={className} />;
}

function aspectClass(r: MediaItem["ratio"]) {
  return r === "9:16" ? "aspect-[9/16]" : r === "1:1" ? "aspect-square" : r === "16:9" ? "aspect-[16/9]" : "aspect-[3/4]";
}

function Tile({ item, onOpen }: { item: MediaItem; onOpen: () => void }) {
  const aspect = aspectClass(item.ratio);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left rounded-2xl bg-card border border-border/60 overflow-hidden hover:border-border transition-colors"
    >
      <div className={`relative ${aspect} overflow-hidden bg-gradient-to-br ${item.gradient}`}>
        {item.src ? (
          <img loading="lazy" decoding="async" src={item.src} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.35),transparent_60%)]" />
        )}
        <span className="absolute top-2 left-2 h-6 px-2 inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-white">
          <KindIcon kind={item.kind} className="w-3 h-3" />
          {item.kind === "video" ? "Видео" : item.kind === "photo" ? "Фото" : "Аватар"}
        </span>
        {item.kind === "video" && item.duration && (
          <span className="absolute bottom-2 right-2 h-5 px-1.5 inline-flex items-center rounded-md bg-black/55 backdrop-blur-md text-[10.5px] font-mono text-white tabular-nums">
            {item.duration}
          </span>
        )}
        {item.kind === "video" && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-transform group-hover:scale-110">
              <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
            </span>
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="text-[13px] font-semibold truncate">{item.title}</div>
        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{item.ratio}</div>
      </div>
    </button>
  );
}

function Lightbox({ item, onClose, onDelete }: { item: MediaItem; onClose: () => void; onDelete: () => void }) {
  const aspect = aspectClass(item.ratio);
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-5 h-14 border-b border-white/10">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-white truncate">{item.title}</div>
          <div className="text-[11px] text-white/55 font-mono">
            {item.ratio}{item.duration ? ` · ${item.duration}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onDelete} aria-label="Удалить"
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-destructive transition-colors">
            <Trash2 className="w-4.5 h-4.5" />
          </button>
          <button type="button" onClick={onClose} aria-label="Закрыть"
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-5 min-h-0">
        <div className={`relative ${aspect} max-h-full max-w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br ${item.gradient}`}>
          {item.src ? (
            <img loading="lazy" decoding="async" src={item.src} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.35),transparent_60%)]" />
          )}
          {item.kind === "video" && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-16 h-16 rounded-full bg-black/45 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
                <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="px-5 pb-6 pt-3">
        <MediaActions
          item={{ kind: item.kind, title: item.title, ratio: item.ratio, gradient: item.gradient, duration: item.duration, src: item.src }}
          saved
          onMore={() => { onClose(); window.location.href = "/app/create"; }}
        />
      </div>
    </div>
  );
}

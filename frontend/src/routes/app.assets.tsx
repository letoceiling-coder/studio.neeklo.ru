import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Play, X, Heart, Share2, Download, Maximize2, Plus, Folder as FolderIcon,
  Loader2, Image as ImageIcon, ChevronRight, Sparkles, Trash2,
} from "lucide-react";
import { useMediaList, removeMedia } from "@/lib/media-store";
import { MOCK_ASSETS, categoryFor, type Asset, type AssetCategory } from "@/lib/asset-mocks";
import { useFavorites, toggleFavorite, useFolders, createFolder } from "@/lib/asset-prefs";
import { Panel } from "@/components/studio";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { createShareLink } from "@/lib/share-store";

export const Route = createFileRoute("/app/assets")({
  head: () => ({
    meta: [
      { title: "Ассеты, neeklo studio" },
      { name: "description", content: "Все генерации в одном месте: фото, видео, 3D и загрузки." },
    ],
  }),
  component: AssetsPage,
});

/* ─────────────── Categories ─────────────── */

type CatId = "all" | "favorites" | "shared" | AssetCategory;

const CATEGORIES: { id: CatId; label: string; group: "main" | "type" | "source" }[] = [
  { id: "all",       label: "Все",            group: "main"   },
  { id: "favorites", label: "Избранное",      group: "main"   },
  { id: "shared",    label: "Доступные мне",  group: "main"   },
  { id: "photo",     label: "Фото",           group: "type"   },
  { id: "video",     label: "Видео",          group: "type"   },
  { id: "edited",    label: "Редактировано",  group: "type"   },
  { id: "enhanced",  label: "Энхансировано",  group: "type"   },
  { id: "threed",    label: "3D",             group: "type"   },
  { id: "motion",    label: "Перенос движения", group: "type" },
  { id: "uploaded",  label: "Загружено",      group: "source" },
];

/* ─────────────── Page ─────────────── */

function AssetsPage() {
  const { items: stored, loading: storedLoading } = useMediaList();
  const favorites = useFavorites();
  const folders = useFolders();

  // Bake a single, sorted list combining mocks + user's saved items.
  const all: Asset[] = useMemo(() => {
    const fromStore: Asset[] = stored.map((m) => ({
      ...m,
      category: categoryFor(m),
      shared: false,
    }));
    // de-dupe by id (mock ids are mock_*, store ids are seed-/m_)
    const merged = [...fromStore, ...MOCK_ASSETS];
    const seen = new Set<string>();
    return merged.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [stored]);

  const [cat, setCat] = useState<CatId>("all");
  const [tileSize, setTileSize] = useState<number>(2); // 0=L, 1=M, 2=S, 3=XS
  const [openId, setOpenId] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");

  // Counts by category for the right rail badges.
  const counts = useMemo(() => {
    const c: Record<CatId, number> = {
      all: all.length,
      favorites: all.filter((a) => favorites.has(a.id)).length,
      shared: all.filter((a) => a.shared).length,
      photo: 0, video: 0, edited: 0, enhanced: 0, threed: 0, motion: 0, uploaded: 0,
    };
    for (const a of all) c[a.category] += 1;
    return c;
  }, [all, favorites]);

  const filtered = useMemo(() => {
    if (cat === "all") return all;
    if (cat === "favorites") return all.filter((a) => favorites.has(a.id));
    if (cat === "shared") return all.filter((a) => a.shared);
    return all.filter((a) => a.category === cat);
  }, [all, cat, favorites]);

  // Group by date bucket
  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const open = openId ? all.find((a) => a.id === openId) ?? null : null;

  // grid columns per tile size (mobile / tablet / desktop)
  const gridCls = [
    "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3",
    "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5",
    "grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7",
  ][tileSize];

  const onCreateFolder = () => {
    const name = folderName.trim();
    if (!name) return;
    createFolder(name);
    setFolderName("");
    setNewFolderOpen(false);
    toast.success(`Папка «${name}» создана`);
  };

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background text-foreground px-5 lg:px-10 pt-6 lg:pt-10 app-pad-tab">
      <div className="max-w-[1500px] mx-auto">
        <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[12px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
              Хранилище
            </p>
            <h1 className="mt-1 text-[26px] lg:text-[34px] font-bold tracking-tight leading-tight">
              Ассеты
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {counts.all} {plural(counts.all, ["объект", "объекта", "объектов"])} · обновляется автоматически
            </p>
          </div>

          {/* Tile size slider */}
          <div className="flex items-center gap-3 panel px-4 py-2 rounded-full">
            <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <Slider
              value={[tileSize]}
              min={0}
              max={3}
              step={1}
              onValueChange={(v) => setTileSize(v[0] ?? 2)}
              className="w-[140px]"
              aria-label="Размер плиток"
            />
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 lg:gap-8 items-start">
          {/* GRID column */}
          <section className="min-w-0">
            {storedLoading ? (
              <LoadingGrid gridCls={gridCls} />
            ) : filtered.length === 0 ? (
              <EmptyState cat={cat} hasAny={all.length > 0} onReset={() => setCat("all")} />
            ) : (
              <div className="space-y-8">
                {groups.map((g) => (
                  <div key={g.label}>
                    <div className="flex items-end justify-between mb-3">
                      <h2 className="text-[13px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
                        {g.label}
                      </h2>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {g.items.length}
                      </span>
                    </div>
                    <div className={`grid ${gridCls} gap-3`}>
                      {g.items.map((it) => (
                        <Tile
                          key={it.id}
                          item={it}
                          favorited={favorites.has(it.id)}
                          onOpen={() => setOpenId(it.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* RIGHT RAIL */}
          <aside className="lg:sticky lg:top-20 space-y-5">
            <Panel className="p-3">
              <div className="px-2 py-1 text-[11px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
                Категории
              </div>
              <nav className="mt-1 flex flex-col gap-0.5">
                {CATEGORIES.map((c, i) => {
                  const prev = CATEGORIES[i - 1];
                  const divider = prev && prev.group !== c.group;
                  const n = counts[c.id];
                  const active = cat === c.id;
                  return (
                    <div key={c.id}>
                      {divider && <div className="my-1.5 mx-2 h-px bg-border/70" />}
                      <button
                        type="button"
                        onClick={() => setCat(c.id)}
                        className={[
                          "w-full h-9 px-3 rounded-lg flex items-center justify-between text-[13px] transition-studio",
                          active
                            ? "bg-gradient-warm-soft text-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                        ].join(" ")}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {active && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                          <span className="truncate">{c.label}</span>
                        </span>
                        <span className="text-[11px] tabular-nums opacity-75">{n}</span>
                      </button>
                    </div>
                  );
                })}
              </nav>
            </Panel>

            <Panel className="p-3">
              <div className="flex items-center justify-between px-2 py-1">
                <div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
                  Папки
                </div>
                <button
                  type="button"
                  onClick={() => setNewFolderOpen(true)}
                  className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11.5px] font-semibold text-accent hover:bg-accent/10 transition-studio"
                  aria-label="Создать папку"
                >
                  <Plus className="w-3.5 h-3.5" /> Создать
                </button>
              </div>
              <div className="mt-1 flex flex-col gap-0.5">
                {folders.length === 0 ? (
                  <div className="px-3 py-3 text-[12px] text-muted-foreground">
                    Пока пусто
                  </div>
                ) : folders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toast(`Папка «${f.name}», пока заглушка`)}
                    className="w-full h-9 px-3 rounded-lg flex items-center justify-between text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-studio"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <FolderIcon className="w-3.5 h-3.5 text-accent/80" />
                      <span className="truncate">{f.name}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[11px] tabular-nums opacity-75">
                      {f.count}
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            </Panel>
          </aside>
        </div>
      </div>

      {/* New folder modal */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="max-w-sm">
          <h3 className="text-[16px] font-semibold">Новая папка</h3>
          <p className="text-[12.5px] text-muted-foreground -mt-1">
            Сгруппируй ассеты по проектам или клиентам
          </p>
          <input
            autoFocus
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onCreateFolder(); }}
            placeholder="Название папки"
            className="mt-2 h-11 px-4 rounded-lg bg-card border border-border focus:border-accent/60 outline-none text-[14px]"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setNewFolderOpen(false)}
              className="h-10 px-4 rounded-full text-[13px] text-muted-foreground hover:text-foreground"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={onCreateFolder}
              disabled={!folderName.trim()}
              className="h-10 px-5 rounded-full btn-primary text-[13px] disabled:opacity-50"
            >
              Создать
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {open && (
        <Lightbox
          item={open}
          favorited={favorites.has(open.id)}
          onClose={() => setOpenId(null)}
          onDelete={() => {
            if (open.id.startsWith("mock_")) {
              toast("Демо-ассет нельзя удалить");
              return;
            }
            removeMedia(open.id);
            setOpenId(null);
            toast.success("Удалено");
          }}
        />
      )}
    </main>
  );
}

/* ─────────────── Subcomponents ─────────────── */

function LoadingGrid({ gridCls }: { gridCls: string }) {
  return (
    <div>
      <Skeleton className="h-3.5 w-24 mb-3" />
      <div className={`grid ${gridCls} gap-3`}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-tile" />
        ))}
      </div>
      <div className="mt-4 text-center text-[12px] text-muted-foreground inline-flex items-center justify-center gap-2 w-full">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Загружаем ассеты
      </div>
    </div>
  );
}

function EmptyState({ cat, hasAny, onReset }: { cat: CatId; hasAny: boolean; onReset: () => void }) {
  const filtered = hasAny && cat !== "all";
  return (
    <Panel className="p-10 lg:p-14 text-center">
      <div
        className="mx-auto w-14 h-14 rounded-tile flex items-center justify-center"
        style={{ background: "var(--gradient-warm-soft)" }}
      >
        <Sparkles className="w-6 h-6 text-accent" strokeWidth={1.75} />
      </div>
      <h3 className="mt-4 text-[16px] font-semibold">
        {filtered ? "В этой категории пусто" : "Хранилище пока пустое"}
      </h3>
      <p className="mt-1 text-[13px] text-muted-foreground max-w-[44ch] mx-auto">
        {filtered
          ? "Попробуй другой фильтр или создай новый ассет, он попадёт сюда автоматически."
          : "Сгенерируй фото, видео или загрузи свои файлы, они появятся здесь."}
      </p>
      <div className="mt-5 flex items-center justify-center gap-2">
        {filtered && (
          <button
            type="button"
            onClick={onReset}
            className="h-11 px-5 rounded-full bg-card border border-border text-[13px] font-medium hover:border-accent/40 transition-studio"
          >
            Показать все
          </button>
        )}
        <Link
          to="/app/tools/photo"
          className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full btn-primary text-[13px]"
          style={{ boxShadow: "var(--shadow-warm)" }}
        >
          <Plus className="w-4 h-4" /> Создать ассет
        </Link>
      </div>
    </Panel>
  );
}

function Tile({
  item,
  favorited,
  onOpen,
}: {
  item: Asset;
  favorited: boolean;
  onOpen: () => void;
}) {
  const stop = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); };
  const onShare = (e: React.MouseEvent) => {
    stop(e);
    const link = createShareLink({
      kind: item.kind, title: item.title, ratio: item.ratio,
      gradient: item.gradient, duration: item.duration, src: item.src,
    });
    navigator.clipboard?.writeText(link.url).catch(() => {});
    toast.success("Ссылка скопирована");
  };
  const onDownload = (e: React.MouseEvent) => {
    stop(e);
    toast.success("Скачивание началось", { description: item.title });
  };
  const onFavorite = (e: React.MouseEvent) => {
    stop(e);
    toggleFavorite(item.id);
    toast(favorited ? "Убрано из избранного" : "Добавлено в избранное");
  };

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative text-left rounded-tile overflow-hidden bg-card border border-border hover:border-accent/45 transition-studio focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      <div className={`relative aspect-square overflow-hidden bg-gradient-to-br ${item.gradient}`}>
        {item.src && (
          <img
            src={item.src}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        )}
        {/* hover scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/15 opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* video meta */}
        {item.kind === "video" && (
          <>
            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="w-10 h-10 rounded-full bg-black/55 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
                <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
              </span>
            </span>
            {item.duration && (
              <span className="absolute bottom-1.5 right-1.5 h-5 px-1.5 inline-flex items-center rounded-md bg-black/65 backdrop-blur-md text-[10.5px] font-mono text-white tabular-nums">
                {item.duration}
              </span>
            )}
          </>
        )}

        {/* favorite (always visible if set) */}
        {favorited && (
          <span className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center text-accent">
            <Heart className="w-3 h-3" fill="currentColor" />
          </span>
        )}

        {/* hover quick actions */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <QuickAction label={favorited ? "В избранном" : "В избранное"} onClick={onFavorite} active={favorited}>
            <Heart className="w-3.5 h-3.5" fill={favorited ? "currentColor" : "none"} />
          </QuickAction>
          <QuickAction label="Поделиться" onClick={onShare}>
            <Share2 className="w-3.5 h-3.5" />
          </QuickAction>
          <QuickAction label="Открыть" onClick={(e) => { stop(e); onOpen(); }}>
            <Maximize2 className="w-3.5 h-3.5" />
          </QuickAction>
          <QuickAction label="Скачать" onClick={onDownload}>
            <Download className="w-3.5 h-3.5" />
          </QuickAction>
        </div>

        {/* title strip on hover */}
        <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="text-[11.5px] font-semibold text-white truncate drop-shadow">
            {item.title}
          </div>
        </div>
      </div>
    </button>
  );
}

function QuickAction({
  children, onClick, label, active,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        "w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border transition-studio",
        active
          ? "bg-accent text-accent-foreground border-accent"
          : "bg-black/55 text-white border-white/15 hover:bg-black/75",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Lightbox({
  item, favorited, onClose, onDelete,
}: {
  item: Asset;
  favorited: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const aspect =
    item.ratio === "9:16" ? "aspect-[9/16]"
    : item.ratio === "1:1" ? "aspect-square"
    : item.ratio === "16:9" ? "aspect-[16/9]"
    : "aspect-[3/4]";

  const onShare = () => {
    const link = createShareLink({
      kind: item.kind, title: item.title, ratio: item.ratio,
      gradient: item.gradient, duration: item.duration, src: item.src,
    });
    navigator.clipboard?.writeText(link.url).catch(() => {});
    toast.success("Ссылка скопирована");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col animate-in fade-in duration-150">
      <div className="flex items-center justify-between px-5 h-14 border-b border-white/10">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-white truncate">{item.title}</div>
          <div className="text-[11px] text-white/55 font-mono">
            {item.ratio}{item.duration ? ` · ${item.duration}` : ""} · {labelForCategory(item.category)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <LightboxAction label={favorited ? "В избранном" : "В избранное"} onClick={() => { toggleFavorite(item.id); toast(favorited ? "Убрано" : "Добавлено"); }}>
            <Heart className="w-4 h-4" fill={favorited ? "currentColor" : "none"} />
          </LightboxAction>
          <LightboxAction label="Поделиться" onClick={onShare}>
            <Share2 className="w-4 h-4" />
          </LightboxAction>
          <LightboxAction label="Скачать" onClick={() => toast.success("Скачивание началось")}>
            <Download className="w-4 h-4" />
          </LightboxAction>
          <LightboxAction label="Удалить" onClick={onDelete} danger>
            <Trash2 className="w-4 h-4" />
          </LightboxAction>
          <LightboxAction label="Закрыть" onClick={onClose}>
            <X className="w-5 h-5" />
          </LightboxAction>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-5 min-h-0">
        <div className={`relative ${aspect} max-h-full max-w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br ${item.gradient}`}>
          {item.src && (
            <img src={item.src} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
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
    </div>
  );
}

function LightboxAction({
  children, onClick, label, danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        "w-10 h-10 rounded-full flex items-center justify-center transition-studio",
        danger
          ? "text-white/70 hover:bg-white/10 hover:text-destructive"
          : "text-white/80 hover:bg-white/10",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ─────────────── Helpers ─────────────── */

function plural(n: number, [a, b, c]: [string, string, string]) {
  const m = n % 100;
  if (m >= 11 && m <= 14) return c;
  const l = n % 10;
  if (l === 1) return a;
  if (l >= 2 && l <= 4) return b;
  return c;
}

function labelForCategory(c: AssetCategory) {
  return ({
    photo: "Фото", video: "Видео", edited: "Редактировано",
    enhanced: "Энхансировано", threed: "3D",
    motion: "Перенос движения", uploaded: "Загружено",
  } as const)[c];
}

function groupByDate(items: Asset[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const startOfWeek = startOfToday - 6 * 86_400_000;

  const buckets: { label: string; items: Asset[] }[] = [
    { label: "Сегодня", items: [] },
    { label: "Вчера", items: [] },
    { label: "На этой неделе", items: [] },
    { label: "Ранее", items: [] },
  ];
  for (const a of items) {
    if (a.createdAt >= startOfToday) buckets[0].items.push(a);
    else if (a.createdAt >= startOfYesterday) buckets[1].items.push(a);
    else if (a.createdAt >= startOfWeek) buckets[2].items.push(a);
    else buckets[3].items.push(a);
  }
  return buckets.filter((b) => b.items.length > 0);
}

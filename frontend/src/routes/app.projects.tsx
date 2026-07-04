// /app/projects, Пространства: проекты как холсты связанных генераций.
// Хлебные крошки, кнопка «Создать пространство», переключатель размера плиток,
// группировка по месяцам, левая под-панель навигации.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  FolderKanban,
  Plus,
  Star,
  ChevronRight,
  Search,
  LayoutGrid,
  Images,
  Boxes,
  Download,
  Trash2,
  Clock,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Panel, ToolHeader } from "@/components/studio";
import {
  createSpace,
  groupByMonth,
  relativeTime,
  toggleFavorite,
  useSpaces,
  type Space,
} from "@/lib/spaces-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/projects")({
  head: () => ({
    meta: [
      { title: "Пространства, neeklo" },
      { name: "description", content: "Проекты как холсты связанных генераций: доски, ассеты, кампании." },
    ],
  }),
  component: ProjectsPage,
});

type Section = "all-projects" | "all-assets" | "all-spaces" | "favorites" | "downloads" | "trash";
type TileSize = "s" | "m" | "l" | "xl";

const SECTIONS: Array<{ id: Section; label: string; icon: typeof FolderKanban }> = [
  { id: "all-projects", label: "Все проекты", icon: FolderKanban },
  { id: "all-assets", label: "Все ассеты", icon: Images },
  { id: "all-spaces", label: "Все пространства", icon: Boxes },
  { id: "favorites", label: "Избранное", icon: Star },
  { id: "downloads", label: "Загрузки", icon: Download },
  { id: "trash", label: "Корзина", icon: Trash2 },
];

const TILE_CFG: Record<TileSize, { grid: string; cover: string; mini: string }> = {
  s: { grid: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6", cover: "aspect-[4/3]", mini: "w-6 h-6" },
  m: { grid: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4", cover: "aspect-[4/3]", mini: "w-8 h-8" },
  l: { grid: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", cover: "aspect-[16/10]", mini: "w-10 h-10" },
  xl: { grid: "grid-cols-1 lg:grid-cols-2", cover: "aspect-[16/9]", mini: "w-14 h-14" },
};

function ProjectsPage() {
  const { items, loading } = useSpaces();
  const [section, setSection] = useState<Section>("all-projects");
  const [size, setSize] = useState<TileSize>("m");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    let arr = items;
    if (section === "favorites") arr = arr.filter((s) => s.favorite && !s.trashed);
    else if (section === "trash") arr = arr.filter((s) => s.trashed);
    else arr = arr.filter((s) => !s.trashed);
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((s) => s.title.toLowerCase().includes(q));
    }
    return arr;
  }, [items, section, query]);

  const groups = useMemo(() => groupByMonth(filtered), [filtered]);

  const sectionLabel = SECTIONS.find((s) => s.id === section)?.label ?? "Все проекты";

  return (
    <div className="min-h-dvh w-full px-4 sm:px-6 lg:px-8 py-5 lg:py-7 max-w-[1500px] mx-auto">
      {/* breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-foreground/55 mb-3">
        <Link to="/app" className="hover:text-foreground">Главная</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/app/projects" className="hover:text-foreground">Пространства</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground/85">{sectionLabel}</span>
      </nav>

      <ToolHeader
        icon={FolderKanban}
        title="Пространства"
        subtitle="Проекты как холсты связанных генераций, собирай кадры, сцены и финалы в одном месте"
        actions={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-tile bg-accent text-accent-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Создать пространство
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* left subnav */}
        <aside className="lg:sticky lg:top-[88px] lg:self-start">
          <Panel className="p-2">
            <nav className="flex flex-col gap-0.5">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                const count =
                  s.id === "favorites"
                    ? items.filter((x) => x.favorite && !x.trashed).length
                    : s.id === "trash"
                    ? items.filter((x) => x.trashed).length
                    : s.id === "all-projects" || s.id === "all-spaces"
                    ? items.filter((x) => !x.trashed).length
                    : null;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSection(s.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                      section === s.id
                        ? "bg-foreground/10 text-foreground"
                        : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                    <span className="flex-1 text-left truncate">{s.label}</span>
                    {count !== null && count > 0 && (
                      <span className="text-[11px] text-foreground/50 tabular-nums">{count}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </Panel>
        </aside>

        {/* main */}
        <div className="min-w-0 flex flex-col gap-4">
          {/* toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по названиям…"
                className="w-full h-9 pl-8 pr-3 rounded-tile bg-foreground/[0.04] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
            <SizePicker value={size} onChange={setSize} />
          </div>

          {/* states */}
          {loading ? (
            <LoadingGrid size={size} />
          ) : filtered.length === 0 ? (
            <EmptyState section={section} onCreate={() => setShowCreate(true)} />
          ) : (
            <div className="flex flex-col gap-7">
              {groups.map((g) => (
                <section key={g.key}>
                  <header className="flex items-center justify-between mb-3">
                    <h2 className="text-[13px] uppercase tracking-wider text-foreground/55">{g.label}</h2>
                    <span className="text-xs text-foreground/45">{g.items.length}</span>
                  </header>
                  <div className={cn("grid gap-3", TILE_CFG[size].grid)}>
                    {g.items.map((sp) => (
                      <SpaceCard key={sp.id} space={sp} size={size} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateSpaceModal
          onClose={() => setShowCreate(false)}
          onCreated={(s) => {
            setShowCreate(false);
            toast.success("Пространство создано", { description: s.title });
          }}
        />
      )}
    </div>
  );
}

/* ───────────────────────── size picker ───────────────────────── */

function SizePicker({ value, onChange }: { value: TileSize; onChange: (v: TileSize) => void }) {
  const sizes: TileSize[] = ["s", "m", "l", "xl"];
  return (
    <div className="inline-flex items-center gap-1 rounded-tile border border-border bg-foreground/[0.03] p-1">
      <LayoutGrid className="w-3.5 h-3.5 text-foreground/45 ml-1.5 mr-0.5" />
      {sizes.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={cn(
            "h-7 w-7 inline-flex items-center justify-center rounded-md text-xs font-medium",
            value === s
              ? "bg-foreground text-background"
              : "text-foreground/65 hover:text-foreground",
          )}
        >
          {s.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────── space card ───────────────────────── */

function SpaceCard({ space, size }: { space: Space; size: TileSize }) {
  const cfg = TILE_CFG[size];
  const thumbs = space.assets.slice(0, 4);
  const more = Math.max(0, space.assets.length - thumbs.length);

  return (
    <div className="group rounded-tile border border-border bg-foreground/[0.03] overflow-hidden hover:border-accent/60 transition-colors flex flex-col">
      <Link
        to="/app/projects/$id"
        params={{ id: space.id }}
        className={cn("block relative overflow-hidden bg-foreground/5", cfg.cover)}
      >
        {thumbs.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-foreground/35 text-xs">
            Пустая доска
          </div>
        ) : (
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 p-1">
            {thumbs.map((t, i) => (
              <div key={t.id} className={cn(
                "relative overflow-hidden rounded-sm bg-foreground/10",
                thumbs.length === 1 && "col-span-2 row-span-2",
                thumbs.length === 2 && i === 0 && "row-span-2",
                thumbs.length === 2 && i === 1 && "row-span-2",
                thumbs.length === 3 && i === 0 && "row-span-2",
              )}>
                <img src={t.src} alt="" className="absolute inset-0 w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
        {more > 0 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-background/85 backdrop-blur px-2 py-0.5 text-[11px] font-medium">
            +{more}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(space.id);
          }}
          className={cn(
            "absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-background/85 backdrop-blur border border-border opacity-0 group-hover:opacity-100 transition-opacity",
            space.favorite && "opacity-100",
          )}
          title={space.favorite ? "Убрать из избранного" : "В избранное"}
        >
          <Star
            className={cn("w-3.5 h-3.5", space.favorite ? "fill-accent text-accent" : "text-foreground/70")}
          />
        </button>
      </Link>
      <div className="p-3 flex items-center gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium truncate">{space.title}</p>
          <p className="text-[11px] text-foreground/55 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> {relativeTime(space.createdAt)} · {space.assets.length} ассетов
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── empty / loading ───────────────────────── */

function EmptyState({
  section,
  onCreate,
}: {
  section: Section;
  onCreate: () => void;
}) {
  const isTrash = section === "trash";
  return (
    <Panel className="p-10 lg:p-14 flex flex-col items-center text-center">
      <span
        className="inline-flex items-center justify-center w-14 h-14 rounded-tile mb-4"
        style={{ background: "var(--gradient-warm-soft)" }}
      >
        <FolderKanban className="w-6 h-6 text-accent" />
      </span>
      <h2 className="text-[18px] font-semibold">
        {isTrash ? "Корзина пуста" : section === "favorites" ? "Нет избранных" : "Пока нет проектов"}
      </h2>
      <p className="mt-1.5 text-[13.5px] text-foreground/65 max-w-md">
        {isTrash
          ? "Удалённые пространства появляются здесь и могут быть восстановлены."
          : "Создай первое пространство, это холст, на котором собираются все связанные генерации."}
      </p>
      {!isTrash && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-1.5 h-10 px-4 rounded-tile bg-accent text-accent-foreground text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Создать пространство
        </button>
      )}
    </Panel>
  );
}

function LoadingGrid({ size }: { size: TileSize }) {
  const cfg = TILE_CFG[size];
  return (
    <div className={cn("grid gap-3", cfg.grid)}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-tile border border-border bg-foreground/[0.03] overflow-hidden animate-pulse">
          <div className={cn(cfg.cover, "bg-foreground/5")} />
          <div className="p-3">
            <div className="h-3 w-3/4 bg-foreground/10 rounded mb-2" />
            <div className="h-2 w-1/2 bg-foreground/8 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── modal ───────────────────────── */

function CreateSpaceModal({ onClose, onCreated }: { onClose: () => void; onCreated: (s: Space) => void }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    const s = createSpace(title.trim());
    onCreated(s);
  };

  return (
    <ModalShell onClose={onClose} title="Новое пространство">
      <label className="text-xs text-foreground/60">Название</label>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Например: Лукбук · весна"
        className="mt-1 w-full h-10 px-3 rounded-tile bg-foreground/[0.04] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-3 rounded-tile text-sm text-foreground/70 hover:bg-foreground/5"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!title.trim() || busy}
          className="h-9 px-4 rounded-tile bg-accent text-accent-foreground text-sm font-medium inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Создать
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ onClose, title, children }: { onClose: () => void; title: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-tile border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-foreground/60 hover:bg-foreground/10 hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

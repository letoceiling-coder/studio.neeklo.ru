// /app/moodboards, список пользовательских и пресетных мудбордов.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Palette,
  Plus,
  Search,
  ArrowUpDown,
  Sparkles,
  ImageIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useMoodboards,
  createMoodboard,
  type Moodboard,
} from "@/lib/moodboard-store";

export const Route = createFileRoute("/app/moodboards")({
  head: () => ({
    meta: [
      { title: "Мудборды, neeklo" },
      {
        name: "description",
        content:
          "Создавай и собирай мудборды для единого визуального стиля генераций.",
      },
    ],
  }),
  component: MoodboardsPage,
});

type SortKey = "recent" | "name" | "size";

function MoodboardsPage() {
  const { items, presets, loading } = useMoodboards();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = s
      ? items.filter(
          (m) =>
            m.title.toLowerCase().includes(s) ||
            (m.description ?? "").toLowerCase().includes(s),
        )
      : items;
    const sorted = [...base];
    if (sort === "name") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "size")
      sorted.sort((a, b) => b.images.length - a.images.length);
    else sorted.sort((a, b) => b.updatedAt - a.updatedAt);
    return sorted;
  }, [items, q, sort]);

  const filteredPresets = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return presets;
    return presets.filter(
      (m) =>
        m.title.toLowerCase().includes(s) ||
        (m.description ?? "").toLowerCase().includes(s),
    );
  }, [presets, q]);

  const isEmpty = !loading && items.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* header */}
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <span
              className="inline-flex items-center justify-center w-11 h-11 rounded-tile text-accent-foreground shrink-0"
              style={{ background: "var(--gradient-warm)" }}
            >
              <Palette className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <h1 className="text-[20px] sm:text-[22px] font-semibold leading-tight">
                Мудборды
              </h1>
              <p className="text-[13px] text-muted-foreground mt-0.5 max-w-xl">
                Собирай референсы, палитры и кадры в одном месте, каждая
                генерация будет в одном визуальном языке.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="btn-primary inline-flex items-center gap-2 h-10 px-4 rounded-tile text-[13px] font-semibold shrink-0"
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            Создать мудборд
          </button>
        </div>

        {/* search + sort */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"
              strokeWidth={2}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск мудбордов"
              className="w-full h-10 pl-9 pr-3 rounded-tile border border-border bg-surface-1 text-[13px] outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div className="inline-flex items-center gap-1 h-10 px-2 rounded-tile border border-border bg-surface-1">
            <ArrowUpDown
              className="w-3.5 h-3.5 text-muted-foreground"
              strokeWidth={2}
            />
            {(
              [
                { id: "recent", label: "Недавние" },
                { id: "name", label: "Имя" },
                { id: "size", label: "Размер" },
              ] as const
            ).map((opt) => {
              const active = sort === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSort(opt.id)}
                  aria-pressed={active}
                  className={`h-7 px-2.5 rounded-md text-[12px] font-medium transition-studio ${
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                  }`}
                  style={
                    active ? { background: "var(--gradient-warm-soft)" } : undefined
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* user grid */}
      <section>
        <h2 className="text-[11px] uppercase tracking-wide text-muted-foreground/80 mb-2">
          Мои мудборды
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <NewMoodboardCard onClick={() => setCreateOpen(true)} />
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
            : filtered.map((m) => <MoodboardCard key={m.id} board={m} />)}
        </div>
        {isEmpty && (
          <div className="mt-3 rounded-tile border border-dashed border-border bg-surface-1 px-4 py-5 text-center">
            <div className="text-[13px] font-medium">Пока нет мудбордов</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">
              Создай первый, или возьми готовый из пресетов ниже.
            </div>
          </div>
        )}
      </section>

      {/* presets */}
      <section>
        <h2 className="text-[11px] uppercase tracking-wide text-muted-foreground/80 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent" strokeWidth={2} />
          Пресет-мудборды
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {filteredPresets.map((m) => (
            <MoodboardCard key={m.id} board={m} preset />
          ))}
        </div>
      </section>

      {createOpen && (
        <CreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={(b) => {
            toast.success("Мудборд создан", { description: b.title });
            setCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ─── cards ─── */

function NewMoodboardCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative rounded-tile border border-dashed border-border bg-surface-1 hover:border-accent/60 hover:bg-surface-2 transition-studio aspect-[4/5] flex flex-col items-center justify-center gap-2 text-center p-4"
    >
      <span
        className="inline-flex items-center justify-center w-11 h-11 rounded-full text-accent-foreground"
        style={{ background: "var(--gradient-warm)" }}
      >
        <Plus className="w-5 h-5" strokeWidth={2.2} />
      </span>
      <span className="text-[13px] font-semibold">Новый</span>
      <span className="text-[11.5px] text-muted-foreground">
        Создать пустой мудборд
      </span>
    </button>
  );
}

function MoodboardCard({ board, preset }: { board: Moodboard; preset?: boolean }) {
  const tiles = board.images.slice(0, 4);
  return (
    <Link
      to="/app/moodboards/$id"
      params={{ id: board.id }}
      className="group relative rounded-tile border border-border bg-card overflow-hidden hover:border-foreground/25 hover:shadow-elegant transition-studio"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        {tiles.length === 0 ? (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${board.gradient} opacity-80`}
          />
        ) : (
          <div className="grid grid-cols-2 grid-rows-2 gap-px bg-border absolute inset-0">
            {Array.from({ length: 4 }).map((_, i) => {
              const t = tiles[i];
              return t ? (
                <img
                  key={t.id}
                  src={t.src}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  key={`empty-${i}`}
                  className={`bg-gradient-to-br ${board.gradient} opacity-60`}
                />
              );
            })}
          </div>
        )}
        {preset && (
          <span
            className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10.5px] font-semibold text-accent-foreground"
            style={{ background: "var(--gradient-warm)" }}
          >
            <Sparkles className="w-3 h-3" strokeWidth={2.2} /> Пресет
          </span>
        )}
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11px] font-medium bg-black/60 text-white tabular-nums">
          <ImageIcon className="w-3 h-3" strokeWidth={2} />
          {board.images.length}
        </span>
      </div>
      <div className="p-2.5">
        <div className="text-[13px] font-semibold truncate">{board.title}</div>
        {board.description && (
          <div className="text-[11.5px] text-muted-foreground line-clamp-2 mt-0.5">
            {board.description}
          </div>
        )}
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-tile border border-border bg-card overflow-hidden">
      <div className="aspect-[4/5] bg-surface-2 animate-pulse" />
      <div className="p-2.5 space-y-1.5">
        <div className="h-3.5 w-2/3 rounded bg-surface-2 animate-pulse" />
        <div className="h-2.5 w-1/2 rounded bg-surface-2 animate-pulse" />
      </div>
    </div>
  );
}

/* ─── create modal ─── */

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (b: Moodboard) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-3"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-tile border border-border bg-card p-4 sm:p-5 shadow-elegant"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-[15px] font-semibold">Новый мудборд</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">
              Дай ему имя, потом загрузишь до 250 изображений.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-2 text-muted-foreground"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const created = createMoodboard({ title, description: desc });
            onCreated(created);
          }}
          className="flex flex-col gap-3"
        >
          <label className="flex flex-col gap-1">
            <span className="text-[11.5px] font-medium text-muted-foreground">
              Название
            </span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Осенний бьюти-релиз"
              className="h-10 rounded-tile border border-border bg-surface-1 px-3 text-[13px] outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11.5px] font-medium text-muted-foreground">
              Описание (необязательно)
            </span>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="Кратко: что внутри и для каких задач"
              className="resize-none rounded-tile border border-border bg-surface-1 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-3 rounded-tile text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-2"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary inline-flex items-center gap-2 h-10 px-4 rounded-tile text-[13px] font-semibold"
            >
              <Plus className="w-4 h-4" strokeWidth={2.2} />
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

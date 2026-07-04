// Глобальная палитра Cmd+K: вкладки, фильтры, результаты с превью.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X, SlidersHorizontal, FileSearch, Loader2 } from "lucide-react";
import {
  searchAll,
  countsByKind,
  EMPTY_FILTERS,
  ALL_FOLDERS,
  type SearchFilters,
  type SearchKind,
  type SearchResult,
} from "@/lib/search-index";

type TabKey = "all" | SearchKind;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all",       label: "Всё" },
  { key: "asset",     label: "Ассеты" },
  { key: "project",   label: "Проекты" },
  { key: "moodboard", label: "Мудборды" },
  { key: "tool",      label: "Инструменты" },
];

type Props = { open: boolean; onClose: () => void };

export function GlobalSearch({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debounced, setDebounced] = useState("");

  // Сброс при каждом открытии
  useEffect(() => {
    if (open) {
      setQuery(""); setDebounced(""); setTab("all");
      setFilters(EMPTY_FILTERS); setShowFilters(false);
    }
  }, [open]);

  // Дебаунс + индикатор загрузки
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const id = window.setTimeout(() => {
      setDebounced(query);
      setLoading(false);
    }, 180);
    return () => window.clearTimeout(id);
  }, [query, open]);

  // ESC
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const counts = useMemo(() => countsByKind(debounced, filters), [debounced, filters]);
  const results = useMemo(() => searchAll(debounced, tab, filters), [debounced, tab, filters]);

  if (!open) return null;

  const handlePick = (r: SearchResult) => {
    onClose();
    navigate({ to: r.to });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-3"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Глобальный поиск"
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md" />
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Поле ввода */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
          {loading ? (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" strokeWidth={1.8} />
          ) : (
            <Search className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
          )}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по студии: ассеты, проекты, мудборды, инструменты…"
            className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-pressed={showFilters}
            className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] border transition-colors ${
              showFilters ? "bg-surface-2 border-border text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.8} />
            Фильтры
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2"
          >
            <X className="w-4 h-4" strokeWidth={1.8} />
          </button>
        </div>

        {/* Вкладки */}
        <div className="flex items-center gap-1 px-3 pt-2 overflow-x-auto">
          {TABS.map((t) => {
            const c = counts[t.key];
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium whitespace-nowrap transition-colors ${
                  active ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-surface-2/60"
                }`}
              >
                {t.label}
                <span className="tabular-nums text-[11px] text-muted-foreground/80">{c}</span>
              </button>
            );
          })}
        </div>

        {/* Фильтры */}
        {showFilters && (
          <div className="px-3 pt-2 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-border">
            <FilterSelect
              label="Тип"
              value={filters.type}
              onChange={(v) => setFilters((f) => ({ ...f, type: v as SearchFilters["type"] }))}
              options={[
                ["all", "Все"], ["photo", "Фото"], ["video", "Видео"], ["3d", "3D"],
              ]}
            />
            <FilterSelect
              label="Дата"
              value={filters.date}
              onChange={(v) => setFilters((f) => ({ ...f, date: v as SearchFilters["date"] }))}
              options={[
                ["any", "Любая"], ["today", "Сегодня"], ["week", "Неделя"], ["month", "Месяц"],
              ]}
            />
            <FilterSelect
              label="Папка"
              value={filters.folder}
              onChange={(v) => setFilters((f) => ({ ...f, folder: v }))}
              options={[["all", "Все"], ...ALL_FOLDERS.map((n) => [n, n] as [string, string])]}
            />
            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              Тег
              <input
                value={filters.tag}
                onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}
                placeholder="напр. reels"
                className="h-8 px-2 rounded-md bg-surface-2 border border-border text-[12.5px] text-foreground outline-none focus:ring-2 focus:ring-accent/40"
              />
            </label>
          </div>
        )}

        {/* Результаты */}
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {loading && results.length === 0 ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground text-[13px]">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={1.8} />
              Ищем…
            </div>
          ) : results.length === 0 ? (
            <EmptyState query={debounced} />
          ) : (
            <ul className="flex flex-col">
              {results.map((r) => (
                <li key={`${r.kind}_${r.id}`}>
                  <button
                    type="button"
                    onClick={() => handlePick(r)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
                  >
                    <ResultPreview r={r} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[13.5px] font-medium text-foreground truncate">{r.title}</span>
                        {r.subtitle && (
                          <span className="text-[10.5px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground border border-border/70 shrink-0">
                            {r.subtitle}
                          </span>
                        )}
                      </span>
                      {(r.meta || r.folder) && (
                        <span className="block text-[11.5px] text-muted-foreground truncate">
                          {[r.meta, r.folder].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground/70 hidden sm:inline truncate max-w-[160px]">{r.to}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultPreview({ r }: { r: SearchResult }) {
  if (r.kind === "tool" && r.icon) {
    const Icon = r.icon;
    return (
      <span
        className="w-10 h-10 rounded-lg border border-border bg-surface-2 flex items-center justify-center text-accent shrink-0"
        aria-hidden="true"
      >
        <Icon className="w-4.5 h-4.5" strokeWidth={1.8} />
      </span>
    );
  }
  return (
    <span
      className={`w-10 h-10 rounded-lg overflow-hidden border border-border shrink-0 bg-gradient-to-br ${r.gradient ?? "from-zinc-700 to-zinc-900"}`}
      aria-hidden="true"
    >
      {r.cover && (
        <img
          src={r.cover}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover opacity-90"
        />
      )}
    </span>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string; value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 px-2 rounded-md bg-surface-2 border border-border text-[12.5px] text-foreground outline-none focus:ring-2 focus:ring-accent/40"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-center px-6">
      <span className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center mb-3">
        <FileSearch className="w-5 h-5 text-muted-foreground" strokeWidth={1.6} />
      </span>
      <div className="text-[14px] font-medium text-foreground">Ничего не нашли</div>
      <div className="text-[12.5px] text-muted-foreground mt-1 max-w-sm">
        {query ? <>По запросу «{query}» нет совпадений. Попробуйте другой запрос или сбросьте фильтры.</> : "Попробуйте ввести название проекта, ассета или тег."}
      </div>
    </div>
  );
}

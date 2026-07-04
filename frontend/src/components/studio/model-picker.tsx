// ModelPickerModal — выбор медиа-модели карточками (ТЗ §6).
// Табы-категории, поиск, бейджи возможностей, стоимость, ETA, причины недоступности.
import { useMemo, useState } from "react";
import { Check, Search, X, Zap, Crown, Clock, Coins, Lock, Sparkles } from "lucide-react";
import {
  modelsForKind,
  modelAvailability,
  modelAccentLine,
  formatEta,
  formatCost,
  CAPABILITY_LABEL,
  CATEGORY_LABEL,
  type MediaModel,
  type MediaKind,
  type ModelCategory,
  type ModelContext,
} from "@/lib/media-models";

type TabId = "all" | ModelCategory;

function tabsForKind(kind: MediaKind): { id: TabId; label: string }[] {
  const base: { id: TabId; label: string }[] = [{ id: "all", label: "Все" }];
  base.push({ id: "recommended", label: CATEGORY_LABEL.recommended });
  base.push({ id: kind === "image" ? "image" : "video", label: kind === "image" ? "Изображения" : "Видео" });
  base.push({ id: "fast", label: CATEGORY_LABEL.fast });
  base.push({ id: "quality", label: CATEGORY_LABEL.quality });
  if (kind === "image") base.push({ id: "economy", label: CATEGORY_LABEL.economy });
  base.push({ id: "premium", label: CATEGORY_LABEL.premium });
  return base;
}

export function ModelPickerModal({
  open,
  kind,
  selectedId,
  ctx,
  onSelect,
  onClose,
}: {
  open: boolean;
  kind: MediaKind;
  selectedId: string;
  ctx: ModelContext;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<TabId>("all");
  const [query, setQuery] = useState("");
  const tabs = useMemo(() => tabsForKind(kind), [kind]);

  const models = useMemo(() => {
    const all = modelsForKind(kind);
    const q = query.trim().toLowerCase();
    return all.filter((m) => {
      const inTab = tab === "all" || m.categories.includes(tab as ModelCategory);
      const inQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q);
      return inTab && inQuery;
    });
  }, [kind, tab, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-border">
          <div>
            <h2 className="text-[15px] font-semibold">Выберите модель</h2>
            <p className="text-[12px] text-muted-foreground">
              {kind === "image" ? "Модели для изображений" : "Модели для видео"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="inline-flex items-center justify-center w-9 h-9 rounded-tile border border-border hover:bg-surface-2"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* search */}
        <div className="px-4 sm:px-5 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Найти модель"
              className="w-full h-10 pl-9 pr-3 rounded-tile border border-border bg-surface-1 text-[13px] outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
        </div>

        {/* tabs */}
        <div className="px-4 sm:px-5 pt-3 pb-1 flex gap-1.5 overflow-x-auto">
          {tabs.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={active}
                className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-medium transition-studio ${
                  active
                    ? "text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground border border-border bg-surface-1"
                }`}
                style={active ? { background: "var(--gradient-warm)" } : undefined}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* cards */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {models.length === 0 && (
            <div className="col-span-full py-10 text-center text-[13px] text-muted-foreground">
              Ничего не найдено
            </div>
          )}
          {models.map((m) => (
            <ModelCard
              key={m.id}
              model={m}
              ctx={ctx}
              selected={m.id === selectedId}
              onSelect={() => {
                onSelect(m.id);
                onClose();
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ModelCard({
  model,
  ctx,
  selected,
  onSelect,
}: {
  model: MediaModel;
  ctx: ModelContext;
  selected: boolean;
  onSelect: () => void;
}) {
  const { available, reason } = modelAvailability(model, ctx);
  const accentLine = modelAccentLine(model);

  const goToBilling = () => {
    if (typeof window !== "undefined") {
      window.location.href = `/app/billing?tier=${model.tier}`;
    }
  };

  return (
    <div
      className={`relative flex flex-col rounded-tile border bg-surface-1 overflow-hidden transition-studio ${
        selected ? "border-accent" : "border-border"
      } ${available ? "" : "opacity-80"}`}
      style={selected ? { boxShadow: "var(--shadow-warm)" } : undefined}
    >
      {/* акцентная линия по тарифу (ТЗ §4.2) */}
      {accentLine && <div className="h-1 w-full shrink-0" style={{ background: accentLine }} />}

      {/* preview */}
      <div className={`relative h-20 bg-gradient-to-br ${model.previewGradient}`}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {model.capabilities.includes("fast") && (
            <Badge icon={Zap} label="Fast" />
          )}
          {model.capabilities.includes("pro") && (
            <Badge icon={Crown} label="Pro" />
          )}
          {model.isNew && <Badge icon={Sparkles} label="NEW" />}
          {model.tier === "premium" && <Badge icon={Crown} label="PREMIUM" />}
        </div>
        {selected && (
          <span className="absolute top-2 right-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent text-accent-foreground">
            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-3 flex-1">
        <div>
          <div className="text-[13.5px] font-semibold leading-tight">{model.name}</div>
          <div className="text-[12px] text-muted-foreground leading-snug mt-0.5">
            {model.description}
          </div>
        </div>

        {/* meta */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" strokeWidth={1.8} /> {formatCost(model)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" strokeWidth={1.8} /> {formatEta(model.etaSeconds)}
          </span>
          {model.durations && <span>{model.durations.join("/")} сек</span>}
          {model.resolutions && <span>{model.resolutions.join("/")}</span>}
        </div>

        {/* capability badges */}
        <div className="flex flex-wrap gap-1">
          {model.capabilities
            .filter((c) => c !== "fast" && c !== "pro")
            .map((c) => (
              <span
                key={c}
                className="inline-flex items-center px-1.5 h-5 rounded text-[10px] font-medium border border-border bg-card text-muted-foreground"
              >
                {CAPABILITY_LABEL[c]}
              </span>
            ))}
        </div>

        {/* limits */}
        {model.limits && model.limits.length > 0 && (
          <div className="text-[11px] text-muted-foreground/80">{model.limits.join(" · ")}</div>
        )}

        {/* action / reason */}
        <div className="mt-auto pt-1">
          {available ? (
            <button
              type="button"
              onClick={onSelect}
              className={`w-full h-9 rounded-tile text-[12.5px] font-semibold transition-studio ${
                selected
                  ? "border border-accent text-accent bg-accent/5"
                  : "btn-primary"
              }`}
            >
              {selected ? "Выбрана" : "Выбрать"}
            </button>
          ) : (
            <button
              type="button"
              onClick={goToBilling}
              title="Открыть тарифы"
              className="inline-flex items-center gap-1.5 w-full justify-center h-9 rounded-tile border border-border bg-surface-2 hover:bg-surface-3 hover:border-accent/50 text-[12px] text-muted-foreground transition-studio"
            >
              <Lock className="w-3.5 h-3.5" strokeWidth={1.8} /> {reason}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({ icon: Icon, label }: { icon: typeof Zap; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-black/45 backdrop-blur-sm text-white text-[10px] font-semibold">
      <Icon className="w-3 h-3" strokeWidth={2} /> {label}
    </span>
  );
}

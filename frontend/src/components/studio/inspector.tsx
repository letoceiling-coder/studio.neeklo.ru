// GenerationInspector, правый инспектор инструмента генерации.
// Вкладки: Промпт (textarea + улучшить + счётчик, слайдеры, пикер модели),
// Настройки (формат, стиль, сид, варианты). Поддерживает locked-модели с Upgrade.
import { Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  Search,
  Star,
  Lock,
  Check,
  RotateCcw,
  Sparkles,
  Wand2,
  Shuffle,
  Crown,
} from "lucide-react";
import { Panel, SegmentedTabs, SliderRow } from "./primitives";
import { cn } from "@/lib/utils";

export type InspectorModel = {
  id: string;
  label: string;
  desc: string;
  tag?: string;
  /** Стоимость одной генерации в кредитах. */
  cost: number;
  /** Недоступна на текущем тарифе. */
  locked?: boolean;
};

export type InspectorFormat = { id: string; label: string };

export type GenerationSettings = {
  intensity: number;
  style: number;
  motion: number;
  format: string;
  stylePreset: string;
  seed: string;
  variants: number;
};

export const defaultGenerationSettings: GenerationSettings = {
  intensity: 70,
  style: 50,
  motion: 35,
  format: "1:1",
  stylePreset: "Без стиля",
  seed: "",
  variants: 1,
};

export function GenerationInspector({
  prompt,
  onPromptChange,
  promptMax = 1200,
  onEnhance,
  models,
  selectedModelId,
  onSelectModel,
  favorites,
  onToggleFavorite,
  formats,
  stylePresets,
  settings,
  onSettingsChange,
  footer,
  extraSection,
}: {
  prompt: string;
  onPromptChange: (v: string) => void;
  promptMax?: number;
  onEnhance?: () => void;
  models: InspectorModel[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  formats: InspectorFormat[];
  stylePresets: string[];
  settings: GenerationSettings;
  onSettingsChange: (next: GenerationSettings) => void;
  /** Дополнительный блок снизу (например, действия с результатом). */
  footer?: ReactNode;
  /** Дополнительный раздел во вкладке «Промпт» (например, выбор мудборда). */
  extraSection?: ReactNode;
}) {

  const [tab, setTab] = useState<"prompt" | "settings">("prompt");
  const patch = (p: Partial<GenerationSettings>) => onSettingsChange({ ...settings, ...p });

  return (
    <Panel className="p-3 sm:p-4 flex flex-col gap-4">
      <SegmentedTabs
        size="sm"
        value={tab}
        onChange={(id) => setTab(id as "prompt" | "settings")}
        items={[
          { id: "prompt", label: "Промпт" },
          { id: "settings", label: "Настройки" },
        ]}
      />

      {tab === "prompt" ? (
        <div className="flex flex-col gap-5">
          {/* prompt + enhance + counter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12.5px] font-medium text-muted-foreground">Описание</label>
              <button
                type="button"
                onClick={onEnhance}
                className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11.5px] font-medium text-accent hover:bg-surface-2 transition-studio"
              >
                <Wand2 className="w-3.5 h-3.5" strokeWidth={2} />
                Улучшить
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value.slice(0, promptMax))}
              rows={5}
              placeholder="Опишите кадр: свет, ракурс, атмосферу…"
              className="w-full resize-none rounded-tile border border-border bg-surface-1 px-3 py-2.5 text-[13.5px] leading-relaxed outline-none focus:ring-2 focus:ring-accent/40"
            />
            <div className="mt-1 flex justify-end text-[11px] tabular-nums text-muted-foreground">
              {prompt.length}/{promptMax}
            </div>
          </div>

          {/* sliders */}
          <Group title="Генеративные параметры">
            <SliderWithReset
              label="Интенсивность"
              value={settings.intensity}
              defaultValue={defaultGenerationSettings.intensity}
              suffix="%"
              onChange={(v) => patch({ intensity: v })}
              onReset={() => patch({ intensity: defaultGenerationSettings.intensity })}
            />
            <SliderWithReset
              label="Стиль"
              value={settings.style}
              defaultValue={defaultGenerationSettings.style}
              suffix="%"
              onChange={(v) => patch({ style: v })}
              onReset={() => patch({ style: defaultGenerationSettings.style })}
            />
            <SliderWithReset
              label="Движение"
              value={settings.motion}
              defaultValue={defaultGenerationSettings.motion}
              suffix="%"
              onChange={(v) => patch({ motion: v })}
              onReset={() => patch({ motion: defaultGenerationSettings.motion })}
            />
          </Group>

          {/* model picker */}
          <Group title="Модель">
            <ModelPicker
              models={models}
              selectedId={selectedModelId}
              onSelect={onSelectModel}
              favorites={favorites}
              onToggleFavorite={onToggleFavorite}
            />
          </Group>

          {extraSection}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <Group title="Формат">
            <div className="flex flex-wrap gap-1.5">
              {formats.map((f) => {
                const active = f.id === settings.format;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => patch({ format: f.id })}
                    aria-pressed={active}
                    className={cn(
                      "h-9 px-3 rounded-tile text-[12.5px] font-medium tabular-nums border transition-studio",
                      active
                        ? "border-accent text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-surface-2",
                    )}
                    style={active ? { background: "var(--gradient-warm-soft)" } : undefined}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </Group>

          <Group title="Стиль">
            <div className="flex flex-wrap gap-1.5">
              {stylePresets.map((s) => {
                const active = s === settings.stylePreset;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patch({ stylePreset: s })}
                    aria-pressed={active}
                    className={cn(
                      "h-9 px-3 rounded-tile text-[12.5px] font-medium border transition-studio",
                      active
                        ? "border-accent text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-surface-2",
                    )}
                    style={active ? { background: "var(--gradient-warm-soft)" } : undefined}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Group>

          <Group title="Сид">
            <div className="flex items-center gap-1.5">
              <input
                value={settings.seed}
                onChange={(e) => patch({ seed: e.target.value.replace(/[^0-9]/g, "").slice(0, 10) })}
                inputMode="numeric"
                placeholder="Случайный"
                className="flex-1 min-w-0 h-10 rounded-tile border border-border bg-surface-1 px-3 text-[13px] tabular-nums outline-none focus:ring-2 focus:ring-accent/40"
              />
              <button
                type="button"
                onClick={() => patch({ seed: String(Math.floor(Math.random() * 1_000_000)) })}
                className="inline-flex items-center gap-1 h-10 px-3 rounded-tile border border-border bg-card hover:bg-surface-2 text-[12px] font-medium"
                aria-label="Случайный сид"
              >
                <Shuffle className="w-3.5 h-3.5" strokeWidth={2} />
                Случ.
              </button>
              <button
                type="button"
                onClick={() => patch({ seed: "" })}
                className="inline-flex items-center justify-center h-10 w-10 rounded-tile border border-border bg-card hover:bg-surface-2 text-muted-foreground"
                aria-label="Сбросить сид"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          </Group>

          <Group title="Число вариантов">
            <div className="inline-flex items-center gap-1 p-1 rounded-tile border border-border bg-surface-1/80">
              {[1, 2, 3, 4].map((n) => {
                const active = n === settings.variants;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => patch({ variants: n })}
                    aria-pressed={active}
                    className={cn(
                      "h-9 w-10 rounded-md text-[13px] font-semibold tabular-nums transition-studio",
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-surface-2",
                    )}
                    style={active ? { background: "var(--gradient-warm-soft)" } : undefined}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11.5px] text-muted-foreground">
              Стоимость умножится на число вариантов.
            </p>
          </Group>
        </div>
      )}

      {footer && (
        <div className="border-t border-border pt-3">
          <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground/80 mb-2">Действия</h3>
          {footer}
        </div>
      )}
    </Panel>

  );
}

/* ─── helpers ─── */

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground/80 mb-2">{title}</h3>
      {children}
    </section>
  );
}

function SliderWithReset({
  label,
  value,
  defaultValue,
  suffix,
  onChange,
  onReset,
}: {
  label: string;
  value: number;
  defaultValue: number;
  suffix?: string;
  onChange: (v: number) => void;
  onReset: () => void;
}) {
  const dirty = value !== defaultValue;
  return (
    <div className="relative">
      <SliderRow label={label} value={value} suffix={suffix} onChange={onChange} />
      <button
        type="button"
        onClick={onReset}
        disabled={!dirty}
        aria-label={`Сбросить ${label.toLowerCase()}`}
        className={cn(
          "absolute right-0 top-1.5 inline-flex items-center gap-1 h-6 px-1.5 rounded-md text-[10.5px] font-medium transition-studio",
          dirty ? "text-accent hover:bg-surface-2" : "text-muted-foreground/40 cursor-default",
        )}
      >
        <RotateCcw className="w-3 h-3" strokeWidth={2} />
        Сбросить
      </button>
    </div>
  );
}

function ModelPicker({
  models,
  selectedId,
  onSelect,
  favorites,
  onToggleFavorite,
}: {
  models: InspectorModel[];
  selectedId: string;
  onSelect: (id: string) => void;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s
      ? models.filter((m) => m.label.toLowerCase().includes(s) || m.desc.toLowerCase().includes(s))
      : models;
    // фавориты сверху
    return [...list].sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)));
  }, [models, q, favorites]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2"
          strokeWidth={2}
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск моделей"
          className="w-full h-9 pl-7 pr-3 rounded-tile border border-border bg-surface-1 text-[12.5px] outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>
      <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-0.5 -mr-0.5">
        {filtered.length === 0 && (
          <div className="text-[12px] text-muted-foreground px-1 py-3 text-center">
            Ничего не нашлось.
          </div>
        )}
        {filtered.map((m) => {
          const active = m.id === selectedId;
          const fav = favorites.has(m.id);
          return (
            <div
              key={m.id}
              className={cn(
                "group relative rounded-tile border transition-studio",
                active ? "border-accent" : "border-border hover:border-foreground/25 bg-card",
                m.locked && "opacity-90",
              )}
              style={active ? { background: "var(--gradient-warm-soft)" } : undefined}
            >
              <button
                type="button"
                onClick={() => !m.locked && onSelect(m.id)}
                disabled={m.locked}
                className="flex w-full items-start gap-2.5 p-2.5 text-left disabled:cursor-not-allowed"
                aria-pressed={active}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-md text-[10px] font-bold shrink-0",
                    m.locked ? "bg-surface-3 text-muted-foreground" : "text-accent-foreground",
                  )}
                  style={!m.locked ? { background: "var(--gradient-warm)" } : undefined}
                >
                  {m.locked ? <Lock className="w-3.5 h-3.5" strokeWidth={2} /> : (m.tag ?? "AI")}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold truncate">{m.label}</span>
                    {active && <Check className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={2.2} />}
                  </span>
                  <span className="block text-[11.5px] text-muted-foreground line-clamp-2">
                    {m.desc}
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                    <Sparkles className="w-3 h-3 text-accent" strokeWidth={2} />
                    {m.cost} кр / шт
                  </span>
                </span>
              </button>

              {/* favorite toggle */}
              <button
                type="button"
                onClick={() => onToggleFavorite(m.id)}
                aria-label={fav ? "Убрать из избранного" : "В избранное"}
                className={cn(
                  "absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-surface-2 transition-studio",
                  fav ? "text-accent" : "text-muted-foreground opacity-0 group-hover:opacity-100",
                )}
              >
                <Star className="w-3.5 h-3.5" strokeWidth={2} fill={fav ? "currentColor" : "none"} />
              </button>

              {/* locked overlay */}
              {m.locked && (
                <Link
                  to="/app/subscription"
                  className="absolute inset-0 inline-flex items-center justify-end pr-3"
                >
                  <span
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-semibold text-accent-foreground shadow-sm"
                    style={{ background: "var(--gradient-warm)" }}
                  >
                    <Crown className="w-3 h-3" strokeWidth={2.2} />
                    Upgrade
                  </span>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

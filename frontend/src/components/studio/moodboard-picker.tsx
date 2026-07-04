// MoodboardPicker, выбор мудборда внутри инспектора фото-студии.
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, Check, Plus, Shuffle, Sparkles, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useMoodboards,
  useSelectedMoodboard,
  createMoodboard,
  type MoodboardSelectionId,
} from "@/lib/moodboard-store";

export function MoodboardPicker() {
  const [open, setOpen] = useState(false);
  const { items, presets } = useMoodboards();
  const [selected, setSelected] = useSelectedMoodboard();
  const navigate = useNavigate();

  const label = useMemo(() => labelFor(selected, items, presets), [selected, items, presets]);

  const pick = (id: MoodboardSelectionId | null) => {
    setSelected(id);
    setOpen(false);
  };

  return (
    <section>
      <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground/80 mb-2 flex items-center gap-1.5">
        <Palette className="w-3.5 h-3.5 text-accent" strokeWidth={2} />
        Мудборд
      </h3>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-10 rounded-tile border border-border bg-surface-1 px-3 flex items-center justify-between text-[13px] hover:bg-surface-2 transition-studio"
      >
        <span className="truncate">{label ?? "Не выбран"}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} strokeWidth={2} />
      </button>

      {open && (
        <div className="mt-2 rounded-tile border border-border bg-card p-1.5 max-h-72 overflow-y-auto">
          <Row
            icon={<Sparkles className="w-3.5 h-3.5 text-accent" strokeWidth={2} />}
            title="Авто-мудборд"
            subtitle="neeklo подберёт стиль по промпту"
            active={selected === "auto"}
            onClick={() => pick("auto")}
          />
          <Row
            icon={<Shuffle className="w-3.5 h-3.5 text-accent" strokeWidth={2} />}
            title="Случайный"
            subtitle="Каждая генерация, новый из библиотеки"
            active={selected === "random"}
            onClick={() => pick("random")}
          />
          <Row
            icon={<Plus className="w-3.5 h-3.5 text-accent" strokeWidth={2} />}
            title="Создать новый"
            subtitle="Открыть редактор и собрать с нуля"
            onClick={() => {
              const board = createMoodboard({ title: "Новый мудборд" });
              setSelected(board.id);
              setOpen(false);
              navigate({ to: "/app/moodboards/$id", params: { id: board.id } });
            }}
          />

          {items.length > 0 && (
            <>
              <Divider label="Мои" />
              {items.map((m) => (
                <Row
                  key={m.id}
                  cover={m.cover ?? m.images[0]?.src}
                  gradient={m.gradient}
                  title={m.title}
                  subtitle={`${m.images.length} изображений`}
                  active={selected === m.id}
                  onClick={() => pick(m.id)}
                />
              ))}
            </>
          )}

          <Divider label="Пресеты" />
          {presets.map((m) => (
            <Row
              key={m.id}
              cover={m.cover ?? m.images[0]?.src}
              gradient={m.gradient}
              title={m.title}
              subtitle={`${m.images.length} изображений`}
              active={selected === m.id}
              onClick={() => pick(m.id)}
            />
          ))}

          {selected && (
            <button
              type="button"
              onClick={() => pick(null)}
              className="w-full mt-1 h-8 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-surface-2"
            >
              Снять выбор
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function labelFor(
  value: MoodboardSelectionId | null,
  items: ReturnType<typeof useMoodboards>["items"],
  presets: ReturnType<typeof useMoodboards>["presets"],
) {
  if (!value) return null;
  if (value === "auto") return "Авто-мудборд";
  if (value === "random") return "Случайный";
  const match = [...items, ...presets].find((m) => m.id === value);
  return match?.title ?? null;
}

function Row({
  icon,
  cover,
  gradient,
  title,
  subtitle,
  active,
  onClick,
}: {
  icon?: React.ReactNode;
  cover?: string;
  gradient?: string;
  title: string;
  subtitle?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "w-full flex items-center gap-2.5 p-2 rounded-tile text-left transition-studio",
        active ? "border border-accent" : "border border-transparent hover:bg-surface-2",
      )}
      style={active ? { background: "var(--gradient-warm-soft)" } : undefined}
    >
      <span className="w-9 h-9 rounded-md overflow-hidden shrink-0 border border-border bg-surface-2 flex items-center justify-center">
        {cover ? (
          <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className={cn("w-full h-full bg-gradient-to-br", gradient ?? "from-amber-500 to-rose-400")}>
            {icon && (
              <span className="w-full h-full flex items-center justify-center text-accent-foreground">
                {icon}
              </span>
            )}
          </span>
        )}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-semibold truncate">{title}</span>
        {subtitle && (
          <span className="block text-[11px] text-muted-foreground truncate">{subtitle}</span>
        )}
      </span>
      {active && <Check className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={2.2} />}
    </button>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="px-2 pt-2 pb-1 text-[10.5px] uppercase tracking-wide text-muted-foreground/70">
      {label}
    </div>
  );
}

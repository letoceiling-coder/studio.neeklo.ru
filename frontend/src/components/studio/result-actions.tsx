// ResultActions, единый блок действий с активным результатом генерации.
// Используется и под превью (inline-полоса), и в инспекторе (компактный grid).
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  RefreshCw,
  Film,
  Wand2,
  Archive,
  Save,
  Download,
  ArrowUpRight,
  Globe,
  Bot,
  Layers,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { addMedia, pickGradient, type MediaItem } from "@/lib/media-store";
import { cn } from "@/lib/utils";

export type ResultPayload = {
  /** Заголовок ассета, обычно prompt или описание. */
  title: string;
  /** Превью (file path / dataURL). Опционально. */
  src?: string;
  /** Формат превью, по умолчанию photo. */
  kind?: MediaItem["kind"];
  ratio?: MediaItem["ratio"];
  /** Дополнительный градиент (если нет src). */
  gradient?: string;
};

type Layout = "row" | "grid";

export function ResultActions({
  result,
  layout = "row",
  disabled,
  onRegenerate,
  className,
}: {
  result: ResultPayload | null;
  layout?: Layout;
  disabled?: boolean;
  onRegenerate?: () => void;
  className?: string;
}) {
  const navigate = useNavigate();
  const has = !!result && !disabled;

  const save = () => {
    if (!result) return;
    const saved = addMedia({
      kind: result.kind ?? "photo",
      title: result.title.slice(0, 80) || "Без названия",
      ratio: result.ratio ?? "1:1",
      gradient: result.gradient ?? pickGradient(),
      src: result.src,
    });
    toast.success("Сохранено в медиабанк", {
      description: saved.title,
      action: {
        label: "Открыть",
        onClick: () => navigate({ to: "/app/media" }),
      },
    });
  };

  const makeVideo = () => {
    if (!result) return;
    save(); // первый кадр окажется в медиабанке
    toast.message("Открываем видео-студию", { description: "Кадр станет первым в раскадровке" });
    navigate({
      to: "/app/studio/video",
      search: { frame: result.src ?? "", title: result.title } as never,
    });
  };

  const enhance = () => {
    if (!result) return;
    toast.success("Энханс до 4K запущен", { description: "Результат появится в медиабанке через минуту" });
  };

  const compress = () => {
    if (!result) return;
    toast.success("Сжимаем без потерь…");
  };

  // ── Экспорт меню ──
  const [exportOpen, setExportOpen] = useState(false);
  const [useInOpen, setUseInOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const useInRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
      if (useInRef.current && !useInRef.current.contains(e.target as Node)) setUseInOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const exportAs = (fmt: string) => {
    setExportOpen(false);
    toast.success(`Экспорт ${fmt}`, { description: result?.title.slice(0, 60) ?? "" });
  };

  const useIn = (dest: "site" | "assistant" | "factory") => {
    setUseInOpen(false);
    if (!result) return;
    // Сохраняем, чтобы ассет точно был доступен в целевом модуле.
    const saved = addMedia({
      kind: result.kind ?? "photo",
      title: result.title.slice(0, 80) || "Без названия",
      ratio: result.ratio ?? "1:1",
      gradient: result.gradient ?? pickGradient(),
      src: result.src,
    });
    if (dest === "site") {
      toast.success("Передаём в конструктор сайта");
      navigate({ to: "/app/site", search: { asset: saved.id } as never });
    } else if (dest === "assistant") {
      toast.success("Открываем ассистента");
      navigate({ to: "/app/assistant/new", search: { asset: saved.id } as never });
    } else {
      toast.success("Открываем контент-завод");
      navigate({ to: "/app/factory", search: { asset: saved.id } as never });
    }
  };

  // Empty
  if (!result) {
    return (
      <div
        className={cn(
          "rounded-tile border border-dashed border-border bg-surface-1/60 p-4 text-center text-[12.5px] text-muted-foreground",
          className,
        )}
      >
        Действия появятся, когда будет готов первый результат.
      </div>
    );
  }

  const items = [
    { key: "regen",    icon: RefreshCw, label: "Пересоздать",      onClick: () => onRegenerate?.() },
    { key: "video",    icon: Film,      label: "Сделать видео",    onClick: makeVideo },
    { key: "enhance",  icon: Wand2,     label: "Энханс 4K",        onClick: enhance },
    { key: "compress", icon: Archive,   label: "Сжать",            onClick: compress },
    { key: "save",     icon: Save,      label: "Сохранить",        onClick: save, primary: true },
  ];

  const containerCls =
    layout === "grid"
      ? "grid grid-cols-2 gap-1.5"
      : "flex flex-wrap items-center gap-1.5";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className={containerCls}>
        {items.map((it) => (
          <ActionButton
            key={it.key}
            icon={it.icon}
            label={it.label}
            onClick={it.onClick}
            disabled={!has || (it.key === "regen" && !onRegenerate)}
            primary={!!it.primary}
            full={layout === "grid"}
          />
        ))}

        {/* Экспорт с меню */}
        <div ref={exportRef} className={cn("relative", layout === "grid" && "col-span-1")}>
          <ActionButton
            icon={Download}
            label="Экспорт"
            full={layout === "grid"}
            withChevron
            onClick={() => setExportOpen((v) => !v)}
            aria-expanded={exportOpen}
          />
          {exportOpen && (
            <Menu>
              {["PNG", "JPG", "WEBP", "PDF"].map((f) => (
                <MenuItem key={f} onClick={() => exportAs(f)}>
                  Экспорт · <span className="font-semibold ml-1">{f}</span>
                </MenuItem>
              ))}
            </Menu>
          )}
        </div>

        {/* Использовать в */}
        <div ref={useInRef} className={cn("relative", layout === "grid" && "col-span-2")}>
          <ActionButton
            icon={ArrowUpRight}
            label="Использовать в…"
            full={layout === "grid"}
            withChevron
            onClick={() => setUseInOpen((v) => !v)}
            aria-expanded={useInOpen}
            accent
          />
          {useInOpen && (
            <Menu>
              <MenuItem icon={Globe} onClick={() => useIn("site")}>Сайт</MenuItem>
              <MenuItem icon={Bot} onClick={() => useIn("assistant")}>AI-ассистент</MenuItem>
              <MenuItem icon={Layers} onClick={() => useIn("factory")}>Контент-завод</MenuItem>
            </Menu>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── helpers ─── */

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  primary,
  accent,
  full,
  withChevron,
  ...rest
}: {
  icon: typeof RefreshCw;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
  accent?: boolean;
  full?: boolean;
  withChevron?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 h-10 px-3 rounded-tile text-[12.5px] font-medium transition-studio active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed",
        full ? "w-full justify-start" : "justify-center",
        primary
          ? "btn-primary"
          : accent
            ? "border border-accent/40 text-foreground hover:bg-surface-2"
            : "border border-border bg-card/80 hover:bg-surface-2 text-foreground/90 hover:text-foreground",
      )}
      style={accent ? { background: "var(--gradient-warm-soft)" } : undefined}
      {...rest}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.9} />
      <span className="truncate">{label}</span>
      {withChevron && <ChevronDown className="w-3 h-3 ml-auto opacity-70" strokeWidth={2} />}
    </button>
  );
}

function Menu({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute z-40 mt-1.5 right-0 min-w-[200px] rounded-tile border border-border bg-card shadow-2xl p-1.5">
      {children}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  onClick,
  children,
}: {
  icon?: typeof RefreshCw;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 h-10 px-2.5 rounded-lg text-left text-[13px] hover:bg-surface-2"
    >
      {Icon && <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.9} />}
      <span className="flex-1">{children}</span>
    </button>
  );
}

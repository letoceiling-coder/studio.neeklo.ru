import { Link } from "@tanstack/react-router";
import { Sparkles, type LucideIcon } from "lucide-react";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/* ───────────────────────── Panel ─────────────────────────
   Tonal surface with hairline border + 16-radius. Use for any
   self-contained block (settings card, output frame, list).
*/
export const Panel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { raised?: boolean }>(
  ({ className, raised, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(raised ? "panel-raised" : "panel", "transition-studio", className)}
      {...props}
    />
  ),
);
Panel.displayName = "Panel";

/* ───────────────────────── ToolHeader ─────────────────────────
   Icon · title · optional subtitle · optional inline tabs · actions slot.
*/
export type ToolTab = { id: string; label: string };

export function ToolHeader({
  icon: Icon,
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  actions,
  className,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  tabs?: ToolTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4 mb-6", className)}>
      <div className="flex items-start gap-3">
        <span
          className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-tile"
          style={{ background: "var(--gradient-warm-soft)" }}
        >
          <Icon className="w-5 h-5 text-accent" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] lg:text-[26px] font-semibold tracking-tight leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-[13px] text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
      {tabs && tabs.length > 0 && (
        <SegmentedTabs
          items={tabs}
          value={activeTab ?? tabs[0].id}
          onChange={(id) => onTabChange?.(id)}
        />
      )}
    </header>
  );
}

/* ───────────────────────── SegmentedTabs ─────────────────────────
   Pill-track segmented control. Coral accent only on the active item.
*/
export function SegmentedTabs({
  items,
  value,
  onChange,
  className,
  size = "md",
}: {
  items: ToolTab[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-8" : "h-10";
  const pad = size === "sm" ? "px-3 text-[12.5px]" : "px-4 text-[13px]";
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 p-1 rounded-tile border border-border bg-surface-1/80 backdrop-blur",
        className,
      )}
    >
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={cn(
              "inline-flex items-center justify-center rounded-[8px] font-medium transition-studio",
              h,
              pad,
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2",
            )}
            style={active ? { background: "var(--gradient-warm-soft)" } : undefined}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────── IconButton ─────────────────────────
   44×44 minimum tap target; default ghost, accent variant for primary.
*/
type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  variant?: "ghost" | "outline" | "accent";
  size?: "md" | "lg";
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, label, variant = "ghost", size = "md", className, ...props }, ref) => {
    const dim = size === "lg" ? "w-12 h-12" : "w-11 h-11"; // 44–48px
    const skin =
      variant === "accent"
        ? "btn-primary"
        : variant === "outline"
          ? "border border-border bg-card hover:bg-surface-2"
          : "hover:bg-surface-2 text-muted-foreground hover:text-foreground";
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex items-center justify-center rounded-tile transition-studio active:scale-[0.97]",
          dim,
          skin,
          className,
        )}
        {...props}
      >
        <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
      </button>
    );
  },
);
IconButton.displayName = "IconButton";

/* ───────────────────────── CreditPill ─────────────────────────
   Compact balance pill. Optional ring progress, optional link.
*/
export function CreditPill({
  used,
  total,
  to,
  showRing = true,
  className,
}: {
  used: number;
  total: number;
  to?: string;
  showRing?: boolean;
  className?: string;
}) {
  const label = `Кредиты: ${used} из ${total}`;
  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-full border border-border bg-card hover:bg-surface-2 transition-studio",
        className,
      )}
      aria-label={label}
    >
      {showRing ? (
        <CreditRing used={used} total={total} />
      ) : (
        <Sparkles className="w-3.5 h-3.5 text-accent ml-1" strokeWidth={2} />
      )}
      <span className="text-[12px] font-semibold tabular-nums leading-none">
        {used.toLocaleString("ru-RU")}
        <span className="text-muted-foreground font-medium">
          /{total.toLocaleString("ru-RU")}
        </span>
      </span>
    </span>
  );
  if (to) return <Link to={to}>{content}</Link>;
  return content;
}

function CreditRing({ used, total }: { used: number; total: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, used / Math.max(1, total)));
  const off = c * (1 - pct);
  return (
    <span className="relative inline-flex items-center justify-center w-7 h-7">
      <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
        <circle
          cx="12" cy="12" r={r}
          stroke="color-mix(in oklab, var(--foreground) 15%, transparent)"
          strokeWidth="2.5" fill="none"
        />
        <circle
          cx="12" cy="12" r={r}
          stroke="var(--accent)"
          strokeWidth="2.5" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 220ms cubic-bezier(0.2,0.7,0.2,1)" }}
        />
      </svg>
    </span>
  );
}

/* ───────────────────────── SliderRow ─────────────────────────
   Label · value · native range with warm accent track.
*/
export function SliderRow({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  suffix,
  hint,
  className,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
  hint?: string;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, ((value - min) / Math.max(1, max - min)) * 100));
  return (
    <div className={cn("py-2", className)}>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <label className="text-[13px] font-medium text-foreground">{label}</label>
        <span className="text-[12.5px] tabular-nums text-muted-foreground">
          {value}
          {suffix ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="studio-slider w-full"
        style={{ ["--pct" as never]: `${pct}%` }}
      />
      {hint && <p className="mt-1.5 text-[11.5px] text-muted-foreground">{hint}</p>}
      <style>{`
        .studio-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(to right, var(--accent) 0%, var(--accent) var(--pct), color-mix(in oklab, var(--foreground) 10%, transparent) var(--pct), color-mix(in oklab, var(--foreground) 10%, transparent) 100%);
          outline: none;
        }
        .studio-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid var(--accent);
          box-shadow: 0 2px 8px color-mix(in oklab, var(--accent) 40%, transparent);
          cursor: pointer;
          transition: transform 150ms ease;
        }
        .studio-slider::-webkit-slider-thumb:hover { transform: scale(1.08); }
        .studio-slider::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: #fff; border: 2px solid var(--accent);
          box-shadow: 0 2px 8px color-mix(in oklab, var(--accent) 40%, transparent);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────── OutputActionButton ─────────────────────────
   Compact ghost-on-glass action used in output toolbars
   (Скачать, Поделиться, Сохранить, Повторить).
*/
type OutputActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  hideLabelOnMobile?: boolean;
};

export const OutputActionButton = forwardRef<HTMLButtonElement, OutputActionButtonProps>(
  ({ icon: Icon, label, hideLabelOnMobile = false, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 h-11 px-3 rounded-tile border border-border bg-card/80 backdrop-blur",
        "text-[12.5px] font-medium text-foreground/90 hover:text-foreground hover:bg-surface-2",
        "transition-studio active:scale-[0.97] min-w-11 justify-center",
        className,
      )}
      {...props}
    >
      <Icon className="w-4 h-4" strokeWidth={1.9} />
      <span className={cn(hideLabelOnMobile && "hidden sm:inline")}>{label}</span>
    </button>
  ),
);
OutputActionButton.displayName = "OutputActionButton";

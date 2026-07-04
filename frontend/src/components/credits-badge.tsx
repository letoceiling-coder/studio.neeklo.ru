import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, Clock, Crown, ChevronRight, Check } from "lucide-react";
import {
  useFreeCredits,
  useTimeUntilFreeReset,
  useCreditsMode,
  creditNoun,
  DAILY_FREE_LIMIT,
  FREE_PERKS,
} from "@/lib/mock-credits";

function MiniRing({ used, total }: { used: number; total: number }) {
  const pct = Math.max(0, Math.min(1, total > 0 ? used / total : 0));
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r={r} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2.5" />
      <circle
        cx="11" cy="11" r={r} fill="none"
        stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        transform="rotate(-90 11 11)"
      />
    </svg>
  );
}

/**
 * Бейдж кредитов в топбаре. Единственный источник числа, useFreeCredits.
 * Клик открывает мини-модалку: что бесплатно, когда обновится, CTA.
 */
export function CreditsBadge({ onUseNow }: { onUseNow?: () => void }) {
  const left = useFreeCredits();
  const { label: refreshLabel } = useTimeUntilFreeReset();
  const mode = useCreditsMode();
  const isFree = mode === "free";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const used = Math.max(0, DAILY_FREE_LIMIT - left);
  const empty = left === 0;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          isFree
            ? `Бесплатных генераций сегодня: ${left} из ${DAILY_FREE_LIMIT}. Обновятся через ${refreshLabel}.`
            : `Осталось ${left} ${creditNoun(left)}.`
        }
        aria-expanded={open}
        className="inline-flex items-center gap-2 h-10 sm:h-9 pl-1.5 pr-2.5 sm:pr-3 rounded-full border border-border bg-card hover:bg-surface-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <MiniRing used={used} total={DAILY_FREE_LIMIT} />
        <span className="hidden sm:inline-flex flex-col items-start leading-tight">
          {isFree ? (
            <>
              <span className="text-[12px] font-semibold tabular-nums">
                {left}
                <span className="text-muted-foreground font-medium">/{DAILY_FREE_LIMIT}</span>
                <span className="ml-1 text-muted-foreground font-medium">бесплатно</span>
              </span>
              <span className="text-[10.5px] text-muted-foreground inline-flex items-center gap-0.5 tabular-nums">
                <Clock className="w-2.5 h-2.5" strokeWidth={2} />
                через {refreshLabel}
              </span>
            </>
          ) : (
            <span className="text-[12px] font-semibold tabular-nums">
              {left}
              <span className="ml-1 text-muted-foreground font-medium">{creditNoun(left)}</span>
            </span>
          )}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Бесплатные генерации"
          className="absolute right-0 mt-2 w-[300px] rounded-2xl border border-border bg-card p-4 z-[60] animate-in fade-in slide-in-from-top-1 duration-150"
          style={{ boxShadow: "0 24px 60px -16px rgba(0,0,0,0.55)" }}
        >
          <div className="flex items-start gap-3">
            <span
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--gradient-warm-soft)" }}
            >
              <Sparkles className="w-5 h-5 text-accent" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <div className="text-[15px] font-bold tracking-tight">
                {isFree
                  ? empty
                    ? "Бесплатные на сегодня закончились"
                    : `${left} из ${DAILY_FREE_LIMIT} бесплатных сегодня`
                  : `Осталось ${left} ${creditNoun(left)}`}
              </div>
              {isFree && (
                <div className="mt-0.5 text-[12px] text-muted-foreground inline-flex items-center gap-1 tabular-nums">
                  <Clock className="w-3 h-3" strokeWidth={2} />
                  Обновятся через {refreshLabel}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground mb-2">
              Что можно бесплатно
            </div>
            <ul className="space-y-1.5">
              {FREE_PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2 text-[12.5px]">
                  <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" strokeWidth={2.4} />
                  <span className="leading-snug">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={empty}
              onClick={() => {
                setOpen(false);
                onUseNow?.();
              }}
              className="btn-primary inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg text-[13px] font-semibold disabled:opacity-40 disabled:pointer-events-none"
              style={{ boxShadow: empty ? undefined : "var(--shadow-warm)" }}
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.2} />
              Использовать сейчас
            </button>
            <Link
              to="/app/billing"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-between h-10 px-3 rounded-lg border border-border bg-surface-1 hover:bg-surface-2 transition-colors text-[12.5px] font-medium"
            >
              <span className="inline-flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-accent" strokeWidth={2.2} />
                Увеличить лимит
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

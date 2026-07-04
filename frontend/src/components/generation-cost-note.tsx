import { Link } from "@tanstack/react-router";
import { Sparkles, Clock, Crown, BellRing } from "lucide-react";
import {
  useFreeCredits,
  useTimeUntilFreeReset,
  useCreditsMode,
  creditNoun,
  snoozePaywallUntilTomorrow,
} from "@/lib/mock-credits";
import { toast } from "sonner";

/**
 * Маленькая строка над/под кнопкой генерации.
 *  - есть кредиты: «Будет использована 1 бесплатная генерация · осталось N»
 *  - кредитов нет: «Бесплатные на сегодня закончились, новые завтра»
 *    + три действия: Пополнить, Напомнить завтра, Тарифы
 *
 * Единый источник, useFreeCredits. Никакого локального стейта по кредитам.
 */
export function GenerationCostNote({
  cost = 1,
  className = "",
}: {
  cost?: number;
  className?: string;
}) {
  const left = useFreeCredits();
  const { label } = useTimeUntilFreeReset();
  const mode = useCreditsMode();
  const isFree = mode === "free";

  if (left >= cost) {
    return (
      <div
        className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground ${className}`}
        role="status"
      >
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-accent" strokeWidth={2.4} />
          Спишется {cost} {creditNoun(cost)}
        </span>
        <span className="text-border">·</span>
        <span className="tabular-nums">осталось {left} {creditNoun(left)}</span>
        {isFree && (
          <>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="w-3 h-3" strokeWidth={2} />
              Free обновится через {label}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-border bg-surface-1 p-3 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        <span
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "var(--gradient-warm-soft)" }}
        >
          <Sparkles className="w-3.5 h-3.5 text-accent" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold leading-snug">
            Бесплатные на сегодня закончились, новые завтра
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground inline-flex items-center gap-1 tabular-nums">
            <Clock className="w-3 h-3" strokeWidth={2} />
            Обновятся через {label}
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Link
          to="/app/billing"
          className="btn-primary inline-flex items-center gap-1 h-8 px-3 rounded-lg text-[11.5px] font-semibold"
        >
          <Sparkles className="w-3 h-3" strokeWidth={2.4} />
          Пополнить
        </Link>
        <button
          type="button"
          onClick={() => {
            snoozePaywallUntilTomorrow();
            toast.success("Напомним завтра, когда лимит обновится");
          }}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border bg-card hover:bg-surface-2 text-[11.5px] font-medium transition-colors"
        >
          <BellRing className="w-3 h-3" strokeWidth={2.2} />
          Напомнить завтра
        </button>
        <Link
          to="/app/billing"
          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border bg-card hover:bg-surface-2 text-[11.5px] font-medium transition-colors"
        >
          <Crown className="w-3 h-3 text-accent" strokeWidth={2.2} />
          Тарифы
        </Link>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, X, Check, Crown, Clock, BellRing } from "lucide-react";
import {
  onPaywall,
  snoozePaywallUntilTomorrow,
  useTimeUntilFreeReset,
  type PaywallReason,
} from "@/lib/mock-credits";
import { toast } from "sonner";
import {
  PLANS,
  getCurrentPlan,
  setCurrentPlan,
  isUnlimited,
  getPlanPricePerMonth,
  formatRub,
  type PlanId,
  type BillingCycle,
} from "@/lib/plans";

// Пейволл «You are out of credits» с выбором тарифа и циклом оплаты.
// Единый источник цен, src/lib/plans.ts. Источник кредитов, mock-credits.
export function PaywallModal() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<PaywallReason>("credits");
  const [cycle, setCycle] = useState<BillingCycle>("month");
  const [selected, setSelected] = useState<PlanId>("pro");
  const { label: refreshLabel } = useTimeUntilFreeReset();

  useEffect(
    () =>
      onPaywall((r) => {
        const cur = getCurrentPlan();
        const next: PlanId = cur === "free" ? "pro" : cur === "start" ? "pro" : cur === "pro" ? "studio" : "business";
        setSelected(next);
        setReason(r);
        setOpen(true);
      }),
    [],
  );


  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const offered = PLANS.filter((p) => p.id !== "free");

  async function confirm() {
    try {
      const { startCheckout } = await import("@/lib/api/billing");
      const { confirmationUrl } = await startCheckout(selected, cycle, "tbank");
      window.location.href = confirmationUrl;
      return;
    } catch {
      // гость/офлайн — мягкий локальный фолбэк
      setCurrentPlan(selected);
      setOpen(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 sm:px-5 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div
        className="relative w-full max-w-[640px] max-h-[92dvh] overflow-y-auto rounded-2xl bg-card border border-border p-6 sm:p-7 animate-in zoom-in-95 duration-150"
        style={{ boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)" }}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Закрыть"
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-1 transition-colors"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>

        <div className="text-center">
          <div
            className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--gradient-warm)", boxShadow: "var(--shadow-warm)" }}
          >
            <Sparkles className="w-5 h-5" style={{ color: "var(--accent-foreground)" }} strokeWidth={2.25} />
          </div>
          <h2 id="paywall-title" className="mt-4 text-[19px] sm:text-[20px] font-bold tracking-[-0.01em] leading-tight">
            {reason === "daily"
              ? "Бесплатные на сегодня закончились"
              : "Кредиты закончились"}
          </h2>
          <p className="mt-1.5 text-[13.5px] text-muted-foreground leading-snug">
            {reason === "daily"
              ? "Новые 3 бесплатные генерации придут завтра. Можно пополнить сейчас или подождать."
              : "Выбери тариф, чтобы продолжить генерировать без пауз."}
          </p>
          {reason === "daily" && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground tabular-nums">
              <Clock className="w-3.5 h-3.5" strokeWidth={2} />
              Обновятся через {refreshLabel}
            </div>
          )}
        </div>

        {reason === "daily" && (
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Link
              to="/app/billing"
              onClick={() => setOpen(false)}
              className="btn-primary inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-lg text-[13px] font-semibold"
              style={{ boxShadow: "var(--shadow-warm)" }}
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.2} />
              Пополнить
            </Link>
            <button
              type="button"
              onClick={() => {
                snoozePaywallUntilTomorrow();
                toast.success("Напомним завтра, когда лимит обновится");
                setOpen(false);
              }}
              className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-lg border border-border bg-card hover:bg-surface-2 text-[13px] font-medium transition-colors"
            >
              <BellRing className="w-3.5 h-3.5" strokeWidth={2.2} />
              Напомнить завтра
            </button>
            <Link
              to="/app/billing"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-lg border border-border bg-card hover:bg-surface-2 text-[13px] font-medium transition-colors"
            >
              <Crown className="w-3.5 h-3.5 text-accent" strokeWidth={2.2} />
              Тарифы
            </Link>
          </div>
        )}



        {/* Cycle toggle */}
        <div className="mt-5 flex justify-center">
          <div className="inline-flex items-center p-1 rounded-full border border-border bg-surface-1 text-[12.5px]">
            <button
              type="button"
              onClick={() => setCycle("month")}
              className={`h-8 px-3.5 rounded-full font-medium transition-colors ${cycle === "month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Месяц
            </button>
            <button
              type="button"
              onClick={() => setCycle("year")}
              className={`h-8 px-3.5 rounded-full font-medium transition-colors inline-flex items-center gap-1.5 ${cycle === "year" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Год
              <span className="text-[10px] uppercase tracking-wide text-accent font-semibold">−17%</span>
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {offered.map((p) => {
            const active = selected === p.id;
            const price = getPlanPricePerMonth(p.id, cycle);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                className={`text-left rounded-xl border p-3.5 transition-all relative ${
                  active
                    ? "border-accent bg-[color:color-mix(in_oklab,var(--accent)_8%,var(--card))]"
                    : "border-border bg-surface-1 hover:border-border-strong"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold">{p.name}</span>
                  {p.highlight && <Crown className="w-3.5 h-3.5 text-accent" strokeWidth={2.4} />}
                </div>
                <div className="mt-1 text-[17px] font-bold tracking-[-0.01em] leading-none">
                  {formatRub(price)}
                </div>
                <div className="text-[10.5px] text-muted-foreground">/ {p.priceNote}</div>
                <div className="mt-2 text-[11.5px] text-muted-foreground tabular-nums">
                  {isUnlimited(p.monthlyCredits) ? "∞" : p.monthlyCredits.toLocaleString("ru-RU")} кредитов
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {p.concurrency.image} фото · {p.concurrency.video} видео
                </div>
                {active && (
                  <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-[color:var(--accent-foreground)]" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={confirm}
            className="btn-primary inline-flex items-center justify-center h-11 px-4 text-[14px] flex-1"
            style={{ boxShadow: "var(--shadow-warm)" }}
          >
            Подключить {PLANS.find((p) => p.id === selected)?.name}
          </button>
          <Link
            to="/app/billing"
            onClick={() => setOpen(false)}
            className="btn-secondary inline-flex items-center justify-center h-11 px-4 text-[13.5px]"
          >
            Сравнить тарифы
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-3 w-full text-center text-[12.5px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Позже
        </button>
      </div>
    </div>
  );
}

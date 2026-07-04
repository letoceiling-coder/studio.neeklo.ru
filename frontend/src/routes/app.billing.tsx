// /app/billing, управление подпиской. Единый источник: src/lib/plans.ts.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, X as XIcon, CreditCard, Crown, Download, ArrowLeft } from "lucide-react";
import {
  PLANS,
  useCurrentPlan,
  getPlan,
  setCurrentPlan,
  isUnlimited,
  getPlanPricePerMonth,
  formatRub,
  type PlanId,
  type BillingCycle,
  type PlanCapabilityValue,
} from "@/lib/plans";
import { useFreeCredits } from "@/lib/mock-credits";


export const Route = createFileRoute("/app/billing")({
  head: () => ({
    meta: [
      { title: "Биллинг, neeklo" },
      { name: "description", content: "Тарифы, кредиты, доступ к моделям и история платежей." },
    ],
  }),
  component: BillingPage,
});

type Payment = {
  id: string;
  date: string;
  plan: string;
  amount: string;
  method: "YuKassa" | "CloudPayments";
  status: "Оплачен" | "Возврат";
};

const PAYMENTS: Payment[] = [
  { id: "INV-00128", date: "12.06.2026", plan: "Про",   amount: "990 ₽",   method: "YuKassa",       status: "Оплачен" },
  { id: "INV-00112", date: "12.05.2026", plan: "Про",   amount: "990 ₽",   method: "YuKassa",       status: "Оплачен" },
  { id: "INV-00097", date: "12.04.2026", plan: "Про",   amount: "990 ₽",   method: "CloudPayments", status: "Оплачен" },
  { id: "INV-00081", date: "12.03.2026", plan: "Старт", amount: "490 ₽",   method: "CloudPayments", status: "Оплачен" },
  { id: "INV-00065", date: "12.02.2026", plan: "Старт", amount: "490 ₽",   method: "YuKassa",       status: "Возврат" },
];

type CompareRow = {
  key: keyof import("@/lib/plans").PlanCapabilities | "credits" | "concurImg" | "concurVid";
  label: string;
  group: "Лимиты" | "Возможности" | "Контент" | "Лицензия";
};

const ROWS: CompareRow[] = [
  { key: "credits",    label: "Кредитов в месяц",          group: "Лимиты" },
  { key: "concurImg",  label: "Фото · параллельно",        group: "Лимиты" },
  { key: "concurVid",  label: "Видео · параллельно",       group: "Лимиты" },
  { key: "photo",      label: "Фото-генерация",            group: "Контент" },
  { key: "video",      label: "Видео-генерация",           group: "Контент" },
  { key: "threeD",     label: "3D и сцены",                group: "Контент" },
  { key: "lipsync",    label: "Липсинк",                   group: "Возможности" },
  { key: "lora",       label: "LoRA / кастом-модели",      group: "Возможности" },
  { key: "realtime",   label: "Realtime-холст",            group: "Возможности" },
  { key: "commercial", label: "Коммерческая лицензия",     group: "Лицензия" },
];

function BillingPage() {
  const currentId = useCurrentPlan();
  const current = getPlan(currentId);
  const creditsLeft = useFreeCredits();
  const [cycle, setCycle] = useState<BillingCycle>("month");
  const [toast, setToast] = useState<string | null>(null);

  const cap = current.monthlyCredits;
  const used = Math.max(0, cap - creditsLeft);
  const totalCap = isUnlimited(cap) ? "∞" : String(cap);
  const percent = isUnlimited(cap) ? 4 : Math.round((used / Math.max(1, cap)) * 100);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function switchPlan(id: PlanId) {
    if (id === currentId) return;
    const next = getPlan(id);
    if (id === "free") {
      setCurrentPlan("free");
      flash("Подписка отключена");
      return;
    }
    flash("Готовим оплату…");
    try {
      const { startCheckout } = await import("@/lib/api/billing");
      const { confirmationUrl } = await startCheckout(id, cycle, "tbank");
      window.location.href = confirmationUrl;
    } catch {
      // гость/офлайн — мягко переключаем локально, без падения UI
      setCurrentPlan(id);
      flash(`Тариф «${next.name}» выбран`);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex justify-center">
      <div className="w-full app-screen-wide flex flex-col min-h-dvh px-5 lg:px-8 pt-8 lg:pt-12 app-pad-tab">
        <header className="mb-7 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-[13.5px] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            На главную
          </Link>
          <h1 className="text-[18px] font-semibold tracking-tight">Биллинг</h1>
          <div className="w-24" />
        </header>

        {/* CURRENT PLAN */}
        <section
          className="rounded-2xl gradient-border-warm p-6 lg:p-7"
          style={{ boxShadow: "var(--shadow-warm)" }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11.5px] uppercase tracking-[0.12em] text-accent font-semibold">Текущий тариф</div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-[28px] lg:text-[32px] font-bold tracking-[-0.02em] leading-none">{current.name}</span>
                {current.highlight && <Crown className="w-4 h-4 text-accent" strokeWidth={2.5} />}
              </div>
              <div className="mt-1.5 text-[13.5px] text-muted-foreground">
                {current.priceLabel} / {current.priceNote} · Следующее списание 12.07.2026
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="#plans" className="btn-primary inline-flex items-center justify-center h-10 px-4 text-[13.5px]" style={{ boxShadow: "var(--shadow-warm)" }}>
                Сменить тариф
              </a>
              {currentId !== "free" && (
                <button
                  type="button"
                  onClick={() => flash("Подписка останется активной до конца периода.")}
                  className="btn-secondary inline-flex items-center justify-center h-10 px-4 text-[13.5px]"
                >
                  Отменить
                </button>
              )}
            </div>
          </div>

          {/* USAGE BAR */}
          <div className="mt-6">
            <div className="flex items-end justify-between mb-2">
              <span className="text-[13px] text-muted-foreground">Кредиты в этом месяце</span>
              <span className="text-[13px] font-medium tabular-nums">{used} / {totalCap}</span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-1 overflow-hidden border border-border">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.min(100, percent)}%`,
                  background: "var(--gradient-warm)",
                  boxShadow: "0 0 12px color-mix(in oklab, var(--accent) 50%, transparent)",
                }}
              />
            </div>
            {creditsLeft === 0 && (
              <p className="mt-2 text-[12.5px] text-accent">
                Лимит исчерпан. {currentId === "free" ? "Подключи тариф, чтобы продолжить." : "Пополни кредиты или дождись следующего периода."}
              </p>
            )}
          </div>

          {/* PAYMENT METHOD */}
          <div className="mt-6 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-border bg-surface-1">
              <CreditCard className="w-3.5 h-3.5" /> YuKassa
            </span>
            <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-border bg-surface-1">
              <CreditCard className="w-3.5 h-3.5" /> CloudPayments
            </span>
            <span>· Оплата по-русски, без VPN</span>
          </div>
        </section>

        {/* COMPARE PLANS */}
        <section id="plans" className="mt-10 scroll-mt-20">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight">Сменить тариф</h2>
              <p className="text-[12.5px] text-muted-foreground mt-1">
                Кредиты тратятся на любую генерацию: фото, видео, ассистент, сайт.
              </p>
            </div>
            <CycleToggle value={cycle} onChange={setCycle} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {PLANS.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                cycle={cycle}
                isCurrent={p.id === currentId}
                onSelect={() => switchPlan(p.id)}
              />
            ))}
          </div>
        </section>

        {/* COMPARE TABLE */}
        <section className="mt-10">
          <h2 className="text-[17px] font-semibold tracking-tight mb-4">Возможности по тарифам</h2>
          <CompareTable currentId={currentId} />
        </section>

        {/* PAYMENT HISTORY */}
        <section className="mt-10">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-[17px] font-semibold tracking-tight">История платежей</h2>
            <button
              type="button"
              onClick={() => flash("Выгрузка PDF подготовлена.")}
              className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground"
            >
              <Download className="w-3.5 h-3.5" /> Выгрузить
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1.2fr_0.9fr_0.7fr_1fr_0.8fr_auto] gap-4 px-5 py-3 text-[11.5px] uppercase tracking-[0.08em] text-muted-foreground border-b border-border bg-surface-1/40">
              <span>Дата</span><span>Номер</span><span>Тариф</span><span>Метод</span><span>Статус</span><span className="text-right">Сумма</span>
            </div>
            <ul className="divide-y divide-border">
              {PAYMENTS.map((p) => (
                <li key={p.id} className="grid sm:grid-cols-[1.2fr_0.9fr_0.7fr_1fr_0.8fr_auto] gap-x-4 gap-y-1 px-5 py-4 text-[13px] items-center hover:bg-surface-1/30 transition-colors">
                  <span className="font-medium">{p.date}</span>
                  <span className="text-muted-foreground tabular-nums">{p.id}</span>
                  <span>{p.plan}</span>
                  <span className="text-muted-foreground inline-flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" /> {p.method}
                  </span>
                  <span>
                    <span className={p.status === "Оплачен"
                      ? "inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11.5px] font-medium border border-accent/40 text-accent bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)]"
                      : "inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11.5px] font-medium border border-border text-muted-foreground bg-surface-1"}>
                      {p.status}
                    </span>
                  </span>
                  <span className="text-right font-semibold tabular-nums">{p.amount}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 text-[11.5px] text-muted-foreground">
            Платежи проводятся через YuKassa и CloudPayments. Закрывающие документы приходят на email.
          </div>
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl border border-border bg-card text-[13px] shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ──────── sub-components ──────── */

function CycleToggle({ value, onChange }: { value: BillingCycle; onChange: (v: BillingCycle) => void }) {
  return (
    <div className="inline-flex items-center p-1 rounded-full border border-border bg-surface-1 text-[12.5px]">
      <button
        type="button"
        onClick={() => onChange("month")}
        className={`h-8 px-3.5 rounded-full font-medium transition-colors ${value === "month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
      >
        Месяц
      </button>
      <button
        type="button"
        onClick={() => onChange("year")}
        className={`h-8 px-3.5 rounded-full font-medium transition-colors inline-flex items-center gap-1.5 ${value === "year" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
      >
        Год
        <span className="text-[10.5px] uppercase tracking-wide text-accent font-semibold">−17%</span>
      </button>
    </div>
  );
}

function PlanCard({
  plan, cycle, isCurrent, onSelect,
}: { plan: import("@/lib/plans").Plan; cycle: BillingCycle; isCurrent: boolean; onSelect: () => void }) {
  const price = getPlanPricePerMonth(plan.id, cycle);
  const priceLabel = price === 0 ? "0 ₽" : formatRub(price);
  return (
    <div
      className={
        isCurrent
          ? "rounded-2xl bg-card border-2 border-accent/60 p-5 flex flex-col"
          : plan.highlight
            ? "rounded-2xl bg-card border border-accent/40 p-5 flex flex-col shadow-[0_10px_30px_-15px_color-mix(in_oklab,var(--accent)_60%,transparent)]"
            : "rounded-2xl bg-card border border-border p-5 flex flex-col hover:border-border-strong transition-colors"
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-[13.5px] font-semibold">{plan.name}</span>
        {isCurrent ? (
          <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-accent">Текущий</span>
        ) : plan.highlight ? (
          <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-accent inline-flex items-center gap-1"><Crown className="w-3 h-3" /> Хит</span>
        ) : null}
      </div>
      <div className="mt-1 text-[22px] font-bold tracking-[-0.02em] leading-none">{priceLabel}</div>
      <div className="text-[11.5px] text-muted-foreground">
        / {plan.priceNote}{cycle === "year" && plan.price > 0 ? " · при оплате за год" : ""}
      </div>
      <div className="mt-3 text-[11.5px] text-muted-foreground">{plan.tagline}</div>

      <div className="mt-3 inline-flex items-baseline gap-1 text-[13px]">
        <span className="font-semibold tabular-nums">{isUnlimited(plan.monthlyCredits) ? "∞" : plan.monthlyCredits.toLocaleString("ru-RU")}</span>
        <span className="text-muted-foreground text-[11.5px]">кредитов / мес</span>
      </div>
      <div className="text-[11.5px] text-muted-foreground tabular-nums">
        {plan.concurrency.image} фото · {plan.concurrency.video} видео параллельно
      </div>
      <div className="text-[11.5px] text-muted-foreground">
        Модели тира 0–{plan.rank}
      </div>

      <ul className="mt-3.5 space-y-1.5 flex-1">
        {plan.features.slice(0, 4).map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-[12px] leading-snug text-muted-foreground">
            <Check className="w-3 h-3 mt-0.5 text-accent shrink-0" strokeWidth={2.5} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onSelect}
        disabled={isCurrent}
        className={
          isCurrent
            ? "mt-4 inline-flex items-center justify-center h-9 rounded-lg border border-border bg-surface-1 text-[12.5px] font-medium opacity-60 cursor-default"
            : plan.highlight
              ? "btn-primary mt-4 inline-flex items-center justify-center h-9 text-[12.5px]"
              : "mt-4 inline-flex items-center justify-center h-9 rounded-lg border border-border bg-surface-1 hover:bg-surface-2 text-[12.5px] font-medium transition-colors"
        }
      >
        {isCurrent ? "Активен" : plan.id === "free" ? "Перейти на Free" : "Выбрать"}
      </button>
    </div>
  );
}

function CompareTable({ currentId }: { currentId: PlanId }) {
  const grouped = useMemo(() => {
    const map = new Map<string, CompareRow[]>();
    for (const r of ROWS) {
      const arr = map.get(r.group) ?? [];
      arr.push(r);
      map.set(r.group, arr);
    }
    return [...map.entries()];
  }, []);
  const colTpl = "grid-cols-[1.4fr_repeat(5,minmax(0,1fr))]";
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* header */}
      <div className={`hidden md:grid ${colTpl} gap-2 px-5 py-3 text-[11.5px] uppercase tracking-[0.08em] text-muted-foreground border-b border-border bg-surface-1/40`}>
        <span>Возможность</span>
        {PLANS.map((p) => (
          <span key={p.id} className={`text-center ${p.id === currentId ? "text-accent font-semibold" : ""}`}>
            {p.name}
            {p.id === currentId && <span className="block text-[9.5px] text-accent/80">Текущий</span>}
          </span>
        ))}
      </div>

      {grouped.map(([group, rows]) => (
        <div key={group}>
          <div className="px-5 py-2 bg-surface-1/30 text-[11px] uppercase tracking-[0.1em] text-muted-foreground/80 border-b border-border">
            {group}
          </div>
          {rows.map((r) => (
            <div key={r.label} className={`grid md:${colTpl} gap-2 px-5 py-3 border-b border-border last:border-b-0 text-[12.5px] items-center`}>
              <span className="text-foreground/90 md:font-medium">{r.label}</span>
              {PLANS.map((p) => (
                <span
                  key={p.id}
                  className={`flex items-center md:justify-center justify-between gap-2 ${p.id === currentId ? "text-accent" : "text-foreground/85"}`}
                >
                  <span className="md:hidden text-[11px] uppercase tracking-wide text-muted-foreground">{p.name}</span>
                  <CellValue value={resolveCell(p, r)} />
                </span>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function resolveCell(p: import("@/lib/plans").Plan, row: CompareRow): PlanCapabilityValue {
  if (row.key === "credits") return isUnlimited(p.monthlyCredits) ? "∞" : p.monthlyCredits.toLocaleString("ru-RU");
  if (row.key === "concurImg") return String(p.concurrency.image);
  if (row.key === "concurVid") return p.concurrency.video === 0 ? false : String(p.concurrency.video);
  return p.capabilities[row.key];
}

function CellValue({ value }: { value: PlanCapabilityValue }) {
  if (value === true) return <Check className="w-4 h-4 text-accent" strokeWidth={2.4} />;
  if (value === false) return <XIcon className="w-3.5 h-3.5 text-muted-foreground/50" strokeWidth={2} />;
  return <span className="tabular-nums">{value}</span>;
}

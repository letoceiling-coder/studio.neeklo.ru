import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  User as UserIcon,
  CreditCard,
  BarChart3,
  Ticket,
  Users as UsersIcon,
  Pencil,
  Check,
  Globe,
  Moon,
  Sun,
  Sparkles,
  Copy,
  Wallet,
  Plus,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { getMockUser } from "@/lib/mock-auth";
import { useFreeCredits, resetFreeCredits, addFreeCredits } from "@/lib/mock-credits";
import { useCurrentPlan, getPlan, PLANS, setCurrentPlan, isUnlimited, type PlanId } from "@/lib/plans";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Профиль · neeklo" }] }),
  component: ProfilePage,
});

type SectionId = "personal" | "subscription" | "usage" | "promo" | "referrals";

const SECTIONS: { id: SectionId; label: string; icon: typeof UserIcon }[] = [
  { id: "personal", label: "Личные данные", icon: UserIcon },
  { id: "subscription", label: "Подписка", icon: CreditCard },
  { id: "usage", label: "Использование", icon: BarChart3 },
  { id: "promo", label: "Промокод", icon: Ticket },
  { id: "referrals", label: "Рефералы", icon: UsersIcon },
];

function ProfilePage() {
  const [section, setSection] = useState<SectionId>("personal");

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1180px] px-5 lg:px-8 pt-8 pb-24 app-pad-tab">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Хаб
        </Link>

        <header className="mb-7">
          <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-1.5">
            Аккаунт
          </div>
          <h1 className="text-[30px] lg:text-[34px] leading-[1.05] font-bold tracking-[-0.02em]">
            Профиль и настройки
          </h1>
        </header>

        {/* Mobile/tablet tabs */}
        <div className="lg:hidden -mx-5 px-5 mb-5 overflow-x-auto no-scrollbar">
          <div className="inline-flex gap-1.5 p-1 rounded-full bg-card border border-border">
            {SECTIONS.map((s) => {
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className={[
                    "h-9 px-3.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors inline-flex items-center gap-1.5",
                    active
                      ? "bg-accent/15 text-accent"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  <s.icon className="w-3.5 h-3.5" strokeWidth={2} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-8">
          {/* Desktop side nav */}
          <aside className="hidden lg:block">
            <nav className="sticky top-6 flex flex-col gap-0.5">
              {SECTIONS.map((s) => {
                const active = section === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSection(s.id)}
                    className={[
                      "group flex items-center gap-3 h-11 rounded-xl px-3 text-[13.5px] font-medium transition-colors text-left",
                      active
                        ? "bg-card border border-border text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface-2 border border-transparent",
                    ].join(" ")}
                  >
                    <s.icon
                      className="w-[17px] h-[17px] shrink-0"
                      strokeWidth={1.75}
                      style={active ? { color: "var(--accent)" } : undefined}
                    />
                    <span className="truncate">{s.label}</span>
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Section content */}
          <div className="min-w-0">
            {section === "personal" && <PersonalSection />}
            {section === "subscription" && <SubscriptionSection />}
            {section === "usage" && <UsageSection />}
            {section === "promo" && <PromoSection />}
            {section === "referrals" && <ReferralsSection />}

            <DangerZone />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================== */
/* Personal                                                        */
/* ============================================================== */

function PersonalSection() {
  const [user, setUser] = useState<ReturnType<typeof getMockUser>>(null);
  const [name, setName] = useState("Анна Ковалёва");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [lang, setLang] = useState<"RU" | "EN">("RU");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [autopub, setAutopub] = useState(true);

  useEffect(() => {
    const u = getMockUser();
    setUser(u);
    if (u?.name) {
      setName(u.name);
      setDraft(u.name);
    }
  }, []);

  function saveName() {
    const v = draft.trim();
    if (!v) return;
    setName(v);
    setEditing(false);
    toast.success("Имя обновлено");
    void import("@/lib/api/profile").then(({ updateProfile }) =>
      updateProfile({ name: v }).catch(() => {}),
    );
  }

  const initials = useMemo(() => {
    const parts = name.split(/\s+/).filter(Boolean);
    if (!parts.length) return "N";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [name]);

  return (
    <Panel>
      <PanelHeader title="Личные данные" subtitle="Базовая информация и предпочтения интерфейса" />

      {/* Identity */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-7">
        <div className="relative">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-[28px] font-bold tracking-tight border border-border"
            style={{ backgroundImage: "var(--gradient-warm-soft)" }}
          >
            {initials}
          </div>
          <button
            type="button"
            onClick={() => toast("Загрузка аватара скоро", { description: "Мок-режим" })}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Сменить аватар"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-10 px-3 rounded-lg bg-surface-2 border border-border text-[15px] font-semibold flex-1 outline-none focus:border-accent/60"
                autoFocus
              />
              <button
                type="button"
                onClick={saveName}
                className="h-10 px-4 rounded-lg text-[12.5px] font-semibold"
                style={{ backgroundImage: "var(--gradient-warm)", color: "var(--accent-foreground)" }}
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="text-[20px] font-bold tracking-tight truncate">{name}</div>
              <button
                type="button"
                onClick={() => { setDraft(name); setEditing(true); }}
                className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors px-2 h-7 rounded-md hover:bg-surface-2"
              >
                <Pencil className="w-3 h-3" /> Изменить
              </button>
            </div>
          )}
          <div className="text-[13px] text-muted-foreground font-mono mt-1 truncate">
            {user?.email || "guest@neeklo.app"}
          </div>
        </div>
      </div>

      {/* Segment */}
      <SubSection title="Твой сегмент">
        <div className="flex flex-wrap gap-1.5">
          <Tag>Услуги · локальный бизнес</Tag>
          <Tag>Задача: Контент-завод</Tag>
          <Tag>30–100 заявок/мес</Tag>
          <Tag>Telegram + Avito</Tag>
        </div>
        <Link
          to="/onboarding"
          className="inline-flex items-center gap-1 mt-3 text-[12px] text-accent hover:underline"
        >
          Пройти онбординг заново
        </Link>
      </SubSection>

      {/* Preferences */}
      <SubSection title="Предпочтения">
        <div className="rounded-2xl bg-surface-2 border border-border overflow-hidden">
          <PrefRow icon={<Globe className="w-4 h-4 text-muted-foreground" />} label="Язык">
            <Segmented value={lang} onChange={setLang} options={["RU", "EN"]} />
          </PrefRow>
          <PrefRow
            icon={theme === "dark"
              ? <Moon className="w-4 h-4 text-muted-foreground" />
              : <Sun className="w-4 h-4 text-muted-foreground" />}
            label="Тема"
          >
            <Segmented
              value={theme === "dark" ? "Ночь" : "День"}
              onChange={(v) => setTheme(v === "Ночь" ? "dark" : "light")}
              options={["День", "Ночь"]}
            />
          </PrefRow>
          <PrefRow
            icon={<Sparkles className="w-4 h-4 text-muted-foreground" />}
            label="Авто-публикация результатов в Примеры"
            sub="Лучшие работы будут показаны в публичной витрине"
            last
          >
            <Switch checked={autopub} onChange={setAutopub} />
          </PrefRow>
        </div>
      </SubSection>
    </Panel>
  );
}

/* ============================================================== */
/* Subscription                                                    */
/* ============================================================== */

function SubscriptionSection() {
  const planId = useCurrentPlan();
  const plan = getPlan(planId);

  function pick(id: PlanId) {
    if (id === planId) return;
    const next = getPlan(id);
    setCurrentPlan(id);
    resetFreeCredits(next.monthlyCredits);
    toast.success(`Тариф «${next.name}» подключён`);
  }


  return (
    <Panel>
      <PanelHeader title="Подписка" subtitle="Текущий план и история списаний" />

      {/* Current plan card */}
      <div
        className="rounded-2xl p-5 border mb-6"
        style={{
          background: "linear-gradient(135deg, oklch(0.20 0.012 250 / 0.6), oklch(0.16 0.01 250 / 0.6))",
          borderColor: planId === "free" ? "var(--border)" : "color-mix(in oklab, var(--accent) 45%, transparent)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-1">
              Текущий план
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="text-[24px] font-bold tracking-tight">{plan.name}</div>
              {planId !== "free" && (
                <span className="h-5 px-2 inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400">
                  Активен
                </span>
              )}
            </div>
            <div className="text-[13.5px] text-muted-foreground">{plan.tagline}</div>
          </div>
          <div className="sm:text-right">
            <div className="text-[28px] font-bold tracking-tight leading-none">
              {plan.priceLabel}
              <span className="text-[12px] font-medium text-muted-foreground ml-1">/{plan.priceNote === "навсегда" ? "" : "мес"}</span>
            </div>
            {planId !== "free" && (
              <div className="text-[11.5px] text-muted-foreground mt-1.5">
                Следующее списание · 27 июля
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-card/70 border border-border px-3.5 py-2.5">
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Способ оплаты</div>
            <div className="text-[13px] font-medium mt-0.5">YuKassa · карта •• 4242</div>
          </div>
          <div className="rounded-xl bg-card/70 border border-border px-3.5 py-2.5">
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Чек</div>
            <div className="text-[13px] font-medium mt-0.5">Электронный · на email</div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href="#plans"
            onClick={(e) => { e.preventDefault(); document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" }); }}
            className="h-10 px-4 rounded-full text-[13px] font-semibold inline-flex items-center"
            style={{ backgroundImage: "var(--gradient-warm)", color: "var(--accent-foreground)" }}
          >
            Сменить план
          </a>
          <Link
            to="/app/billing"
            className="h-10 px-4 rounded-full text-[13px] font-semibold inline-flex items-center bg-surface-2 border border-border text-foreground hover:border-accent/40 transition-colors"
          >
            Открыть биллинг
          </Link>
        </div>
      </div>

      {/* Plans compare */}
      <div id="plans">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-3">
          Сравнение планов
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {PLANS.map((p) => {
            const current = p.id === planId;
            const featured = p.highlight && !current;
            return (
              <div
                key={p.id}
                className="relative rounded-2xl bg-card border p-4 flex flex-col"
                style={{
                  borderColor: current
                    ? "color-mix(in oklab, var(--accent) 55%, transparent)"
                    : featured
                      ? "color-mix(in oklab, var(--accent) 35%, transparent)"
                      : "var(--border)",
                }}
              >
                {p.highlight && (
                  <span
                    className="absolute -top-2 left-4 px-2 h-5 inline-flex items-center rounded-full text-[10px] font-semibold"
                    style={{ backgroundImage: "var(--gradient-warm)", color: "var(--accent-foreground)" }}
                  >
                    Популярный
                  </span>
                )}
                <div className="text-[13.5px] font-semibold">{p.name}</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-[20px] font-bold tracking-tight">{p.priceLabel}</span>
                  <span className="text-[11px] text-muted-foreground">/{p.priceNote === "навсегда" ? "навсегда" : "мес"}</span>
                </div>
                <ul className="mt-3 space-y-1.5 flex-1">
                  {p.features.slice(0, 4).map((f) => (
                    <li key={f} className="text-[12px] text-muted-foreground flex gap-1.5">
                      <Check className="w-3 h-3 mt-0.5 shrink-0 text-accent" strokeWidth={2.5} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => pick(p.id)}
                  disabled={current}
                  className={[
                    "mt-4 h-9 rounded-full text-[12.5px] font-semibold transition-colors",
                    current
                      ? "bg-surface-2 border border-border text-muted-foreground cursor-default"
                      : p.highlight
                        ? "text-accent-foreground"
                        : "bg-surface-2 border border-border text-foreground hover:border-accent/40",
                  ].join(" ")}
                  style={!current && p.highlight ? { backgroundImage: "var(--gradient-warm)" } : undefined}
                >
                  {current ? "Текущий" : "Выбрать"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

/* ============================================================== */
/* Usage                                                           */
/* ============================================================== */

const USAGE_HISTORY = [
  { date: "27.06", kind: "Видео-ролик", count: 4 },
  { date: "26.06", kind: "Сайт", count: 1 },
  { date: "25.06", kind: "Ответы ассистента", count: 38 },
  { date: "24.06", kind: "Видео-ролик", count: 7 },
  { date: "22.06", kind: "Апскейл фото", count: 12 },
];

const CHARGES = [
  { date: "27.06.2026", item: "Тариф Про · месяц", amount: "990 ₽", status: "Оплачено" },
  { date: "27.05.2026", item: "Тариф Про · месяц", amount: "990 ₽", status: "Оплачено" },
  { date: "12.05.2026", item: "Пополнение 500 кредитов", amount: "490 ₽", status: "Оплачено" },
  { date: "27.04.2026", item: "Тариф Старт · месяц", amount: "490 ₽", status: "Оплачено" },
];

function UsageSection() {
  const credits = useFreeCredits();
  const planId = useCurrentPlan();
  const plan = getPlan(planId);
  const cap = plan.monthlyCredits;
  const unlimited = isUnlimited(cap);
  const used = Math.max(0, cap - credits);
  const pct = unlimited ? 4 : Math.min(100, Math.round((used / Math.max(1, cap)) * 100));
  const totalLabel = unlimited ? "∞" : String(cap);
  const leftLabel = unlimited ? "∞" : String(credits);

  function topup() {
    if (planId === "free") {
      resetFreeCredits(plan.monthlyCredits);
      toast.success(`Кредиты восстановлены: ${plan.monthlyCredits}`);
    } else {
      resetFreeCredits(plan.monthlyCredits);
      toast.success("Кредиты пополнены до месячного лимита");
    }
  }

  return (
    <Panel>
      <PanelHeader title="Использование" subtitle="Кредиты, история и списания" />

      {/* Credits big */}
      <div className="rounded-2xl bg-surface-2 border border-border p-5 mb-6">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              Остаток кредитов
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-[44px] font-bold tracking-[-0.03em] leading-none">
                {leftLabel}
              </div>
              <div className="text-[13px] text-muted-foreground">из {totalLabel}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={topup}
            className="h-10 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5"
            style={{ backgroundImage: "var(--gradient-warm)", color: "var(--accent-foreground)" }}
          >
            <Plus className="w-4 h-4" /> Пополнить
          </button>
        </div>

        <div className="mt-4 h-2 rounded-full bg-card overflow-hidden border border-border">
          <div
            className="h-full transition-[width] duration-500"
            style={{ width: `${unlimited ? 100 : 100 - pct}%`, backgroundImage: "var(--gradient-warm)" }}
          />
        </div>
        <div className="mt-2 text-[11.5px] text-muted-foreground">
          Использовано {used} из {totalLabel} в этом периоде · план «{plan.name}»
        </div>
      </div>


      {/* History */}
      <SubSection title="История использования (за 7 дней)">
        <div className="rounded-2xl bg-surface-2 border border-border overflow-hidden">
          {USAGE_HISTORY.map((row, i) => (
            <div
              key={i}
              className={[
                "flex items-center justify-between px-4 h-12 text-[13px]",
                i < USAGE_HISTORY.length - 1 ? "border-b border-border" : "",
              ].join(" ")}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[11.5px] text-muted-foreground font-mono w-12 shrink-0">{row.date}</span>
                <span className="truncate">{row.kind}</span>
              </div>
              <span className="font-semibold tabular-nums">−{row.count}</span>
            </div>
          ))}
        </div>
      </SubSection>

      {/* Charges table */}
      <SubSection title="Списания">
        <div className="rounded-2xl bg-surface-2 border border-border overflow-hidden">
          <div className="hidden sm:grid grid-cols-[110px_minmax(0,1fr)_110px_110px] px-4 h-10 items-center text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">
            <div>Дата</div>
            <div>Назначение</div>
            <div className="text-right">Сумма</div>
            <div className="text-right">Статус</div>
          </div>
          {CHARGES.map((c, i) => (
            <div
              key={i}
              className={[
                "px-4 py-3 sm:py-0 sm:h-12 sm:grid sm:grid-cols-[110px_minmax(0,1fr)_110px_110px] sm:items-center text-[13px]",
                i < CHARGES.length - 1 ? "border-b border-border" : "",
              ].join(" ")}
            >
              <div className="text-muted-foreground font-mono text-[12px]">{c.date}</div>
              <div className="truncate font-medium">{c.item}</div>
              <div className="sm:text-right font-semibold tabular-nums">{c.amount}</div>
              <div className="sm:text-right">
                <span className="inline-flex items-center h-5 px-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10.5px] font-semibold text-emerald-400">
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </SubSection>
    </Panel>
  );
}

/* ============================================================== */
/* Promo                                                           */
/* ============================================================== */

const PROMO_HISTORY = [
  { code: "WELCOME10", bonus: "+10 кредитов", date: "27.05.2026" },
  { code: "FRIEND20", bonus: "+20 % к пополнению", date: "12.05.2026" },
];

const VALID_CODES: Record<string, { bonus: string; credits: number }> = {
  NEEKLO: { bonus: "+5 пробных кредитов", credits: 5 },
  PRO50: { bonus: "+20 кредитов и −50 % на Про", credits: 20 },
  WELCOME10: { bonus: "+10 кредитов", credits: 10 },
};

function PromoSection() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(PROMO_HISTORY);

  function apply() {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const match = VALID_CODES[c];
      if (match) {
        const total = addFreeCredits(match.credits);
        toast.success(`Промокод применён: ${match.bonus}`, { description: `Баланс: ${total} кредитов` });
        setHistory((h) => [{ code: c, bonus: match.bonus, date: new Date().toLocaleDateString("ru-RU") }, ...h]);
        setCode("");
      } else {
        toast.error("Промокод не найден", { description: "Попробуй NEEKLO, PRO50 или WELCOME10" });
      }
    }, 450);
  }

  return (
    <Panel>
      <PanelHeader title="Промокод" subtitle="Введи код, чтобы получить бонус" />

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          placeholder="Например, NEEKLO"
          className="flex-1 h-11 px-4 rounded-xl bg-surface-2 border border-border text-[14px] outline-none focus:border-accent/60 placeholder:text-muted-foreground/60 uppercase tracking-wide"
        />
        <button
          type="button"
          onClick={apply}
          disabled={busy || !code.trim()}
          className="h-11 px-5 rounded-xl text-[13px] font-semibold disabled:opacity-50"
          style={{ backgroundImage: "var(--gradient-warm)", color: "var(--accent-foreground)" }}
        >
          {busy ? "Проверяем…" : "Применить"}
        </button>
      </div>
      <div className="mt-2 text-[11.5px] text-muted-foreground">
        Подсказка: попробуй <span className="font-mono text-foreground">NEEKLO</span> или <span className="font-mono text-foreground">PRO50</span>
      </div>

      <SubSection title="История бонусов">
        {history.length === 0 ? (
          <EmptyState text="Бонусов пока нет" />
        ) : (
          <div className="rounded-2xl bg-surface-2 border border-border overflow-hidden">
            {history.map((h, i) => (
              <div
                key={i}
                className={[
                  "flex items-center justify-between px-4 h-12 text-[13px]",
                  i < history.length - 1 ? "border-b border-border" : "",
                ].join(" ")}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex items-center h-6 px-2 rounded-md bg-accent/10 border border-accent/30 text-[11px] font-mono font-semibold text-accent">
                    {h.code}
                  </span>
                  <span className="truncate text-muted-foreground">{h.bonus}</span>
                </div>
                <span className="text-[11.5px] text-muted-foreground font-mono shrink-0">{h.date}</span>
              </div>
            ))}
          </div>
        )}
      </SubSection>
    </Panel>
  );
}

/* ============================================================== */
/* Referrals                                                       */
/* ============================================================== */

function ReferralsSection() {
  const [invited] = useState(7);
  const [earned] = useState(1980);
  const link = "https://neeklo.app/r/anna-x7k";

  function copy() {
    navigator.clipboard.writeText(link).then(
      () => toast.success("Ссылка скопирована"),
      () => toast.error("Не удалось скопировать"),
    );
  }
  function withdraw() {
    if (earned < 500) {
      toast.error("Минимум для вывода, 500 ₽");
      return;
    }
    toast.success(`Заявка на вывод ${earned.toLocaleString("ru-RU")} ₽ принята`);
  }

  return (
    <Panel>
      <PanelHeader title="Рефералы" subtitle="Приглашай друзей и получай 20 % от их оплат" />

      {/* Invite link */}
      <div className="rounded-2xl bg-surface-2 border border-border p-4">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-2">
          Личная ссылка
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 h-11 px-4 rounded-xl bg-card border border-border text-[13px] font-mono flex items-center truncate text-muted-foreground">
            {link}
          </div>
          <button
            type="button"
            onClick={copy}
            className="h-11 px-4 rounded-xl text-[13px] font-semibold inline-flex items-center justify-center gap-1.5"
            style={{ backgroundImage: "var(--gradient-warm)", color: "var(--accent-foreground)" }}
          >
            <Copy className="w-4 h-4" /> Копировать
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard
          label="Приглашено"
          value={invited.toString()}
          sub="Из них активных, 5"
          icon={<UsersIcon className="w-4 h-4 text-accent" />}
        />
        <StatCard
          label="Заработано"
          value={`${earned.toLocaleString("ru-RU")} ₽`}
          sub="20 % от оплат рефералов"
          icon={<Wallet className="w-4 h-4 text-accent" />}
          action={
            <button
              type="button"
              onClick={withdraw}
              className="h-9 px-3.5 rounded-full text-[12.5px] font-semibold bg-card border border-accent/40 text-foreground hover:border-accent/70 transition-colors"
            >
              Вывести
            </button>
          }
        />
      </div>

      <SubSection title="Как это работает">
        <ol className="space-y-2 text-[13px] text-muted-foreground">
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-[10px] font-bold text-accent shrink-0 mt-0.5">1</span>
            Делишься ссылкой с друзьями и в соцсетях.
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-[10px] font-bold text-accent shrink-0 mt-0.5">2</span>
            Друг регистрируется и оплачивает любой платный тариф.
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-[10px] font-bold text-accent shrink-0 mt-0.5">3</span>
            Ты получаешь 20 % от каждого его платежа, пожизненно.
          </li>
        </ol>
      </SubSection>
    </Panel>
  );
}

/* ============================================================== */
/* Danger zone + shared primitives                                 */
/* ============================================================== */

function DangerZone() {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [text, setText] = useState("");

  function destroy() {
    try {
      localStorage.removeItem("neeklo.auth.user");
      localStorage.removeItem("neeklo.credits.free");
      localStorage.removeItem("neeklo.plan.current");
    } catch {}
    toast.success("Аккаунт удалён");
    setTimeout(() => navigate({ to: "/login", replace: true }), 600);
  }

  return (
    <div className="mt-8 rounded-2xl border border-rose-500/30 bg-rose-500/[0.04] p-5">
      <div className="flex items-start gap-3">
        <span className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-semibold">Опасная зона</div>
          <div className="text-[12.5px] text-muted-foreground mt-0.5">
            Удаление аккаунта необратимо: пропадут проекты, ассистенты, лиды и история.
          </div>

          {!confirm ? (
            <button
              type="button"
              onClick={() => setConfirm(true)}
              className="mt-4 h-9 px-4 rounded-full text-[12.5px] font-semibold bg-card border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 transition-colors"
            >
              Удалить аккаунт
            </button>
          ) : (
            <div className="mt-4 rounded-xl bg-card border border-rose-500/30 p-4">
              <div className="text-[12.5px] mb-2">
                Чтобы подтвердить, введи <span className="font-mono font-semibold text-rose-300">УДАЛИТЬ</span>:
              </div>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-border text-[13px] outline-none focus:border-rose-500/60"
                placeholder="УДАЛИТЬ"
              />
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => { setConfirm(false); setText(""); }}
                  className="h-9 px-4 rounded-full text-[12.5px] font-semibold bg-surface-2 border border-border text-muted-foreground hover:text-foreground"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={destroy}
                  disabled={text.trim().toUpperCase() !== "УДАЛИТЬ"}
                  className="h-9 px-4 rounded-full text-[12.5px] font-semibold bg-rose-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Удалить навсегда
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* --- shared --- */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-card border border-border p-5 sm:p-6">
      {children}
    </section>
  );
}

function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
      {subtitle && (
        <p className="text-[13px] text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-2.5">
        {title}
      </div>
      {children}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="h-7 px-3 inline-flex items-center rounded-full bg-surface-2 border border-border text-[12px] text-foreground/85">
      {children}
    </span>
  );
}

function PrefRow({
  icon, label, sub, children, last,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  sub?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={[
      "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3",
      last ? "" : "border-b border-border",
    ].join(" ")}>
      <span className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium">{label}</div>
        {sub && <div className="text-[11.5px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: T[] }) {
  return (
    <div className="inline-flex p-0.5 rounded-full bg-card border border-border">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={[
            "h-7 px-3 rounded-full text-[11.5px] font-semibold transition-colors",
            value === o ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        "relative w-11 h-6 rounded-full transition-colors",
        checked ? "" : "bg-card border border-border",
      ].join(" ")}
      style={checked ? { backgroundImage: "var(--gradient-warm)" } : undefined}
    >
      <span
        className={[
          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-foreground shadow-sm transition-transform",
          checked ? "translate-x-5" : "",
        ].join(" ")}
        style={checked ? { background: "var(--accent-foreground)" } : undefined}
      />
    </button>
  );
}

function StatCard({
  label, value, sub, icon, action,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-surface-2 border border-border p-4 flex items-start gap-3">
      <span className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
        <div className="text-[22px] font-bold tracking-tight mt-0.5">{value}</div>
        {sub && <div className="text-[11.5px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 border border-border border-dashed px-4 py-8 text-center text-[13px] text-muted-foreground flex flex-col items-center gap-2">
      <ChevronRight className="w-4 h-4 opacity-40" />
      {text}
    </div>
  );
}

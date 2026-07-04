import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { PLANS, setCurrentPlan, planQuotaLabel, type PlanId } from "@/lib/plans";
import { resetFreeCredits } from "@/lib/mock-credits";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Тарифы neeklo, план для контента, сайта и ассистента" },
      { name: "description", content: "Free, Starter, Pro и Studio. Кредиты на видео, сайты и AI-ассистента. Начни бесплатно, апгрейд в один клик." },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Тарифы neeklo" },
      { property: "og:description", content: "Кредиты на видео, сайты и ассистента. Начни бесплатно." },
      { property: "og:url", content: "/pricing" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Тарифы neeklo" },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: Pricing,
});

function Pricing() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<PlanId>("pro");

  async function confirm() {
    const plan = PLANS.find((p) => p.id === selected)!;
    if (selected !== "free") {
      try {
        const { startCheckout } = await import("@/lib/api/billing");
        const { confirmationUrl } = await startCheckout(selected, "month", "tbank");
        window.location.href = confirmationUrl;
        return;
      } catch {
        // не авторизован/офлайн — ведём в приложение (там логин/биллинг)
      }
    }
    setCurrentPlan(selected);
    resetFreeCredits(plan.monthlyCredits);
    navigate({ to: "/app/billing" });
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex justify-center">
      <div className="w-full max-w-md md:max-w-3xl lg:max-w-6xl flex flex-col min-h-dvh mx-auto px-5 pt-14 pb-32">
        <h1 className="text-[28px] leading-tight font-bold tracking-tight mb-8">
          Выбери план
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
          {PLANS.map((p) => {
            const isActive = selected === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`relative text-left rounded-2xl bg-card p-5 transition-all active:scale-[0.995] ${
                  isActive
                    ? "border-[1.5px] border-accent"
                    : p.highlight
                    ? "border-[1.5px] border-accent/60"
                    : "border border-border/60"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-2.5 left-5 px-2.5 py-1 rounded-full bg-gradient-warm text-accent-foreground text-[10px] font-semibold uppercase tracking-wider">
                    Популярный
                  </span>
                )}

                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-xl font-bold mb-1">{p.name}</div>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-2xl font-bold tracking-tight">{p.priceLabel}</span>
                      <span className="text-xs text-muted-foreground">{p.priceNote}</span>
                    </div>
                    <div className="text-[11.5px] text-muted-foreground mb-4">
                      {planQuotaLabel(p.id)} кредитов в месяц
                    </div>
                    <ul className="flex flex-col gap-2">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-foreground/85 leading-snug">
                          <Check
                            className={`w-4 h-4 mt-0.5 shrink-0 ${
                              isActive || p.highlight ? "text-accent" : "text-muted-foreground"
                            }`}
                            strokeWidth={2.5}
                          />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <span
                    className={`shrink-0 w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
                      isActive ? "border-accent bg-gradient-warm" : "border-border"
                    }`}
                    aria-hidden
                  >
                    {isActive && <span className="w-2 h-2 rounded-full bg-accent-foreground" />}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 flex justify-center pointer-events-none">
        <div className="w-full max-w-md lg:max-w-2xl px-5 pb-8 pt-6 mx-auto bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-auto">
          <button
            type="button"
            onClick={confirm}
            className="w-full h-14 rounded-full bg-gradient-warm text-accent-foreground font-semibold text-base flex items-center justify-center active:scale-[0.99] transition-transform"
          >
            Продолжить
          </button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Можно поменять в любой момент
          </p>
        </div>
      </div>
    </div>
  );
}

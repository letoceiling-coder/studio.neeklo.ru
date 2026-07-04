import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Target, BarChart3, Sparkles } from "lucide-react";
import preset1 from "@/assets/preset-1.jpg";
import preset2 from "@/assets/preset-2.jpg";
import preset3 from "@/assets/preset-3.jpg";

export const Route = createFileRoute("/onboarding-done")({
  head: () => ({
    meta: [
      { title: "Готово, твоё пространство" },
      { name: "description", content: "Итог онбординга и персональный старт." },
    ],
  }),
  component: OnboardingDone,
});

const name = "Анна";
const segment = "Локальный бизнес · кофейня";
const scenario = "Контент-завод";
const volume = "20–50 заявок в месяц";

const recommendations = [
  { id: 1, title: "Утро в кофейне", meta: "Reels · 9:16", cover: preset1 },
  { id: 2, title: "Распаковка зерна", meta: "Reels · 9:16", cover: preset2 },
  { id: 3, title: "Бариста-аватар", meta: "Reels · 9:16", cover: preset3 },
];

function OnboardingDone() {
  return (
    <div className="min-h-dvh bg-background text-foreground flex justify-center">
      <div className="w-full app-screen flex flex-col min-h-dvh px-5 pt-14 app-pad-tab">
        <header className="mb-7">
          <div
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-medium mb-3"
            style={{ color: "var(--accent)" }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Готово
          </div>
          <h1 className="text-[30px] leading-[1.1] font-bold tracking-tight">
            Готово, {name}. Вот твоё пространство
          </h1>
        </header>

        <section
          className="gradient-border-warm rounded-2xl p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <span
            className="inline-flex items-center text-[12px] font-medium px-3 py-1 rounded-full"
            style={{
              background: "color-mix(in oklab, var(--accent) 14%, transparent)",
              color: "var(--accent)",
            }}
          >
            {segment}
          </span>

          <div className="mt-5 flex flex-col gap-4">
            <Row icon={Target} label="Главная задача" value={scenario} />
            <div className="h-px bg-border" />
            <Row icon={BarChart3} label="Объём" value={volume} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-[15px] font-semibold text-muted-foreground mb-3 px-0.5">
            Мы подобрали тебе старт
          </h2>
          <div className="-mx-5 px-5 overflow-x-auto no-scrollbar">
            <div className="flex gap-3 pb-1">
              {recommendations.map((r) => (
                <Link
                  key={r.id}
                  to="/app/create"
                  className="shrink-0 w-[150px] text-left active:scale-[0.98] transition-transform"
                >
                  <div className="rounded-2xl overflow-hidden border border-border bg-card aspect-[3/4]">
                    <img
                      src={r.cover}
                      alt={r.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-2 text-[14px] font-semibold leading-tight">
                    {r.title}
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">
                    {r.meta}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="flex-1" />

        <Link
          to="/app"
          search={{ scenario: "factory" } as never}
          className="mt-8 h-14 rounded-full bg-gradient-warm flex items-center justify-center gap-2 text-[16px] font-semibold"
          style={{
            color: "var(--accent-foreground)",
            boxShadow: "var(--shadow-warm)",
          }}
        >
          Начать
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] text-muted-foreground">{label}</div>
        <div className="text-[15px] font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}

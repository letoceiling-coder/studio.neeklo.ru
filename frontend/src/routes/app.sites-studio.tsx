import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Globe,
  Link2,
  FileText,
  LayoutTemplate,
  ArrowRight,
  Plus,
  Wand2,
  Eye,
  Rocket,
} from "lucide-react";

export const Route = createFileRoute("/app/sites-studio")({
  head: () => ({
    meta: [
      { title: "AI-сайты, Neeklo" },
      {
        name: "description",
        content:
          "Обзор пространства Сайты: создать с нуля, выбрать шаблон, импортировать материалы.",
      },
    ],
  }),
  component: SitesOverview,
});

const STARTERS = [
  {
    to: "/app/site",
    title: "Сайт по ссылке",
    desc: "Перенесём контент с вашего сайта или соцсети",
    icon: Link2,
  },
  {
    to: "/app/site",
    title: "Сайт по описанию",
    desc: "Расскажите о бизнесе, AI соберёт структуру",
    icon: FileText,
  },
  {
    to: "/app/site",
    title: "Сайт по шаблону",
    desc: "Готовый сценарий под вашу нишу",
    icon: LayoutTemplate,
  },
] as const;

const STEPS = [
  { n: "1", t: "Редактор", d: "Соберите экраны и тексты", icon: Wand2, to: "/app/site" },
  { n: "2", t: "Предпросмотр", d: "Проверьте на десктопе и мобайл", icon: Eye, to: "/app/site-preview" },
  { n: "3", t: "Публикация", d: "Домен, SEO, статистика", icon: Rocket, to: "/app/publish" },
];

// Пока сайтов в проекте нет, оставляем пустое состояние.
const MY_SITES: { id: string; name: string; domain: string }[] = [];

function SitesOverview() {
  const hasSites = MY_SITES.length > 0;

  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-10">
      {/* Header */}
      <header className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
          Пространство
        </div>
        <h1 className="text-[26px] sm:text-[32px] lg:text-[40px] font-semibold tracking-tight leading-[1.1]">
          AI-сайты
        </h1>
        <p className="text-[14px] sm:text-[15px] text-muted-foreground max-w-2xl">
          Сборка лендингов, многостраничников и витрин. Медиа и ассистенты, в своих
          пространствах.
        </p>
      </header>

      {/* How to start */}
      <section>
        <SectionHead title="Быстрый старт" hint="Сценарии в один клик" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {STARTERS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.title}
                to={s.to}
                className="group rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-surface-2 transition-colors p-4 flex flex-col gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center border border-border"
                  style={{ background: "var(--gradient-warm-soft)" }}
                >
                  <Icon className="w-[18px] h-[18px] text-accent" strokeWidth={1.8} />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold leading-tight">{s.title}</span>
                  <span className="block text-[12.5px] text-muted-foreground mt-0.5 leading-snug">
                    {s.desc}
                  </span>
                </span>
                <ArrowRight
                  className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors mt-auto"
                  strokeWidth={1.8}
                />
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section
        className="rounded-2xl border border-accent/30 p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-4"
        style={{ background: "var(--gradient-warm-soft)" }}
      >
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-accent font-semibold mb-1">Старт за минуту</div>
          <h2 className="text-[20px] sm:text-[22px] font-semibold leading-tight">
            Соберите первый экран сайта
          </h2>
          <p className="text-[13px] text-muted-foreground mt-1.5">
            AI предложит hero, выгоды и CTA, отредактируете под себя.
          </p>
        </div>
        <Link
          to="/app/site"
          className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl btn-primary text-[14px] font-semibold shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style={{ boxShadow: "var(--shadow-warm)" }}
        >
          <Plus className="w-4 h-4" strokeWidth={2.2} />
          Собрать первый экран сайта
        </Link>
      </section>

      {/* My sites */}
      <section>
        <SectionHead
          title="Мои сайты"
          hint={hasSites ? "Управление и публикация" : "Пока пусто"}
          action={hasSites ? { to: "/app/site", label: "Все сайты" } : undefined}
        />
        {!hasSites ? (
          <EmptySites />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MY_SITES.map((s) => (
              <Link
                key={s.id}
                to="/app/site"
                className="rounded-xl border border-border bg-card hover:border-accent/40 transition-colors p-4 block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Globe className="w-4 h-4 text-accent" strokeWidth={1.8} />
                  <span className="text-[14px] font-semibold truncate">{s.name}</span>
                </div>
                <div className="text-[12px] text-muted-foreground truncate">{s.domain}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Flow steps */}
      <section>
        <SectionHead title="Поток работы" hint="Редактор → Предпросмотр → Публикация" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.n}
                to={s.to}
                className="group rounded-xl border border-border bg-card hover:border-accent/40 transition-colors p-4 block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[12.5px] font-bold text-accent border border-accent/30"
                    style={{ background: "var(--gradient-warm-soft)" }}
                  >
                    {s.n}
                  </span>
                  <Icon className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" strokeWidth={1.8} />
                  <span className="text-[14px] font-semibold ml-auto">{s.t}</span>
                </div>
                <p className="text-[13px] text-muted-foreground leading-snug">{s.d}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function SectionHead({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: { to: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h2 className="text-[18px] sm:text-[20px] font-semibold tracking-tight leading-tight">
          {title}
        </h2>
        {hint && (
          <p className="text-[12.5px] text-muted-foreground mt-0.5 truncate">{hint}</p>
        )}
      </div>
      {action && (
        <Link
          to={action.to}
          className="text-[12.5px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
          {action.label}
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
        </Link>
      )}
    </div>
  );
}

function EmptySites() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
      <div
        className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3 border border-border"
        style={{ background: "var(--gradient-warm-soft)" }}
      >
        <Globe className="w-5 h-5 text-accent" strokeWidth={1.8} />
      </div>
      <h3 className="text-[15px] font-semibold mb-1">Сайтов пока нет</h3>
      <p className="text-[13px] text-muted-foreground max-w-sm mx-auto mb-4">
        Создайте первый, он появится здесь, в Предпросмотре и в Публикации.
      </p>
      <Link
        to="/app/site"
        className="inline-flex items-center gap-2 h-10 px-4 rounded-lg btn-primary text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Plus className="w-4 h-4" strokeWidth={2.1} />
        Создать сайт
      </Link>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Image as ImageIcon, Globe, Bot, Compass, ArrowRight, Sparkles, type LucideIcon } from "lucide-react";
import { TemplatesDrawer } from "@/components/templates-drawer";
import { Panel } from "@/components/studio";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Neeklo Hub, выбор пространства" },
      { name: "description", content: "Медиа-студия, AI-сайты и AI-ассистенты, выбери, с чего начать." },
    ],
  }),
  component: Hub,
});

type Workspace = "media" | "sites" | "assistants";

type SpaceCard = {
  id: Workspace;
  icon: LucideIcon;
  title: string;
  desc: string;
  primary: { label: string; to: string };
  secondary: { label: string; to?: string; action?: "templates" };
};

const SPACES: SpaceCard[] = [
  {
    id: "media",
    icon: ImageIcon,
    title: "Медиа-студия",
    desc: "Фото, видео, аватары и контент из одного промпта",
    primary: { label: "Открыть медиа", to: "/app/media-studio" },
    secondary: { label: "Посмотреть пресеты", action: "templates" },
  },
  {
    id: "sites",
    icon: Globe,
    title: "AI-сайты",
    desc: "Лендинг по ссылке, описанию или шаблону",
    primary: { label: "Открыть сайты", to: "/app/sites-studio" },
    secondary: { label: "Шаблоны", action: "templates" },
  },
  {
    id: "assistants",
    icon: Bot,
    title: "AI-ассистенты",
    desc: "Помощник для заявок, чатов и CRM",
    primary: { label: "Открыть ассистентов", to: "/app/assistants-studio" },
    secondary: { label: "Создать с нуля", to: "/app/assistant/new" },
  },
];

function readRecommendation(): Workspace | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URLSearchParams(window.location.search).get("focus");
    if (url === "media" || url === "sites" || url === "assistants") return url;
    const v = window.localStorage.getItem("neeklo:onboarding-pick");
    if (v === "media" || v === "sites" || v === "assistants") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function Hub() {
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [recommended, setRecommended] = useState<Workspace | null>(null);

  useEffect(() => {
    setRecommended(readRecommendation());
  }, []);

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background text-foreground px-5 lg:px-10 pt-8 lg:pt-14 app-pad-tab">
      <div className="max-w-[1240px] mx-auto">
        {/* Heading */}
        <header className="mb-8 lg:mb-12 max-w-[760px]">
          <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full border border-accent/30 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-accent">
            <Sparkles className="w-3 h-3" strokeWidth={2} /> Neeklo Hub
          </span>
          <h1 className="mt-3 text-[30px] lg:text-[44px] leading-[1.05] font-bold tracking-tight">
            Что создадим сегодня?
          </h1>
          <p className="mt-3 text-[14.5px] lg:text-[16px] text-muted-foreground">
            Выберите пространство, дальше neeklo подскажет шаги.
          </p>
        </header>

        {/* Three spaces */}
        <section className="grid md:grid-cols-3 gap-4 lg:gap-5 mb-10 lg:mb-14">
          {SPACES.map((s) => (
            <SpaceTile
              key={s.id}
              card={s}
              recommended={recommended === s.id}
              onTemplates={() => setTemplatesOpen(true)}
            />
          ))}
        </section>

        {/* Helper block */}
        <Panel raised className="relative overflow-hidden p-5 lg:p-7 mb-12">
          <div
            className="absolute inset-0 pointer-events-none opacity-80"
            style={{
              background:
                "radial-gradient(60% 100% at 0% 50%, color-mix(in oklab, var(--accent) 14%, transparent) 0%, transparent 60%)",
            }}
          />
          <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            <span
              className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-tile"
              style={{ background: "var(--gradient-warm-soft)" }}
            >
              <Compass className="w-6 h-6 text-accent" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] lg:text-[19px] font-semibold tracking-tight">
                Не знаете с чего начать?
              </h2>
              <p className="text-[13px] lg:text-[13.5px] text-muted-foreground mt-1 max-w-[60ch]">
                Расскажите задачу, помощник подберёт пространство и шаги под вашу цель.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTemplatesOpen(true)}
              className="btn-primary inline-flex items-center gap-1.5 h-11 px-5 rounded-full text-[13px] font-semibold shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              style={{ boxShadow: "var(--shadow-warm)" }}
            >
              Подобрать сценарий
              <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
            </button>
          </div>
        </Panel>
      </div>

      <TemplatesDrawer open={templatesOpen} onOpenChange={setTemplatesOpen} />
    </main>
  );
}

function SpaceTile({
  card,
  recommended,
  onTemplates,
}: {
  card: SpaceCard;
  recommended: boolean;
  onTemplates: () => void;
}) {
  const Icon = card.icon;
  return (
    <article
      className={[
        "panel relative p-6 lg:p-7 flex flex-col gap-5 min-h-[260px] lg:min-h-[300px] transition-studio",
        recommended ? "border-accent/60" : "hover:border-accent/45",
      ].join(" ")}
      style={recommended ? { boxShadow: "var(--shadow-warm)" } : undefined}
    >
      {recommended && (
        <span
          className="absolute top-4 right-4 inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10.5px] uppercase tracking-[0.12em] font-semibold text-accent-foreground"
          style={{ background: "var(--gradient-warm)" }}
        >
          <Sparkles className="w-3 h-3" strokeWidth={2.2} />
          Рекомендуем
        </span>
      )}

      <span
        className="inline-flex items-center justify-center w-14 h-14 rounded-tile"
        style={{ background: "var(--gradient-warm-soft)" }}
      >
        <Icon className="w-7 h-7 text-accent" strokeWidth={1.7} />
      </span>

      <div className="flex-1">
        <h3 className="text-[20px] lg:text-[22px] font-bold tracking-tight">{card.title}</h3>
        <p className="mt-2 text-[13.5px] lg:text-[14px] text-muted-foreground leading-snug">
          {card.desc}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={card.primary.to}
          className="btn-primary inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {card.primary.label}
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.2} />
        </Link>
        {card.secondary.action === "templates" ? (
          <button
            type="button"
            onClick={onTemplates}
            className="inline-flex items-center h-10 px-4 rounded-full border border-border bg-card hover:bg-surface-2 text-[12.5px] font-medium transition-studio focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {card.secondary.label}
          </button>
        ) : card.secondary.to ? (
          <Link
            to={card.secondary.to}
            className="inline-flex items-center h-10 px-4 rounded-full border border-border bg-card hover:bg-surface-2 text-[12.5px] font-medium transition-studio focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {card.secondary.label}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

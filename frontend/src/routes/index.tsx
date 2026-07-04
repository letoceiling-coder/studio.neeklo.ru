import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Globe,
  Bot,
  Factory,
  Play,
  Check,
  Menu,
  X,
  Wand2,
  Send,
  MousePointerClick,
  Upload,
  Rocket,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gift,
  Plus,
  Minus,
  Cpu,
  Image as ImageIcon,
  Film,
  Maximize2,
  Eraser,
  LayoutTemplate,
  MessageSquare,
  BookOpen,
  Database,
  Mic2,
  Sparkles,
  Code2,
  Link2,
  Search,
  Server,
  ShieldOff,
  Wallet,

  type LucideIcon,
} from "lucide-react";
import { getPlan, getPlanPricePerMonth, formatRub, type BillingCycle } from "@/lib/plans";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { nbsp } from "@/lib/typography";
import { BrandLogo } from "@/components/brand-logo";
import preset1 from "@/assets/preset-1.jpg";
import preset2 from "@/assets/preset-2.jpg";
import preset3 from "@/assets/preset-3.jpg";
import preset4 from "@/assets/preset-4.jpg";
import preset5 from "@/assets/preset-5.jpg";
import preset6 from "@/assets/preset-6.jpg";
import exampleNails from "@/assets/example-nails.jpg";
import exampleCoffee from "@/assets/example-coffee.jpg";
import exampleCeramics from "@/assets/example-ceramics.jpg";
import exampleAssistant from "@/assets/example-assistant.jpg";
import { fetchHomeContent } from "@/lib/api/home";
import type { HomeExample } from "@/lib/home-content";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "neeklo, AI-платформа: сайт, ассистент и видео для бизнеса за минуту" },
      {
        name: "description",
        content:
          "Запусти продажи за минуту: AI собирает сайт, ассистента для заявок и до 200 видео из одного фото. Без программистов, публикуем за тебя.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "neeklo, запусти продажи за минуту с AI" },
      {
        property: "og:description",
        content:
          "Сайт, ассистент для заявок и контент-завод из одного фото. Готово за минуту, публикуем за тебя.",
      },
      { property: "og:url", content: "/" },
      { property: "og:locale", content: "ru_RU" },
      { property: "og:image", content: preset1 },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "neeklo, запусти продажи за минуту с AI" },
      { name: "twitter:description", content: "Сайт, ассистент и видео для бизнеса. Без программистов." },
      { name: "twitter:image", content: preset1 },
    ],
    links: [
      { rel: "canonical", href: "/" },
      // LCP hero collage covers, fetch in parallel with the HTML
      { rel: "preload", as: "image", href: preset2, fetchpriority: "high" },
      { rel: "preload", as: "image", href: preset1 },
    ],
  }),
  // Контент главной редактируется из админки; читаем при SSR (с дефолтами как fallback).
  loader: () => fetchHomeContent(),
  component: Landing,
});

const navLinks = [
  { id: "solutions", label: "Решения" },
  { id: "how", label: "Как работает" },
  { id: "examples", label: "Примеры" },
  { id: "pricing", label: "Цены" },
];

const solutions = [
  {
    id: "site",
    title: "AI-сайт",
    benefit: "Готовый лендинг за 3 минуты",
    bullets: ["Свой домен", "SEO из коробки"],
    cover: preset2,
    tag: "Сайт",
  },
  {
    id: "factory",
    title: "Контент-видео",
    benefit: "До 200 вертикальных роликов из одного фото",
    bullets: ["AI-аватары и голоса", "Авто-публикация"],
    cover: preset1,
    tag: "Видео",
  },
  {
    id: "assistant",
    title: "AI-ассистент",
    benefit: "Ловит и квалифицирует заявки 24/7",
    bullets: ["Avito, Telegram, WhatsApp", "Передаёт лида в CRM"],
    cover: preset3,
    tag: "Ассистент",
  },
];


const steps = [
  { n: "01", icon: Wand2, title: "Опиши или загрузи", desc: "Промпт, ссылка или файл" },
  { n: "02", icon: Sparkles, title: "neeklo собирает", desc: "Подбираем модели и блоки" },
  { n: "03", icon: Rocket, title: "Публикуй", desc: "Готовый экран и ссылка" },
];

type ExampleCat = "all" | "sites" | "videos" | "assistants";

const exampleFilters: { id: ExampleCat; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "sites", label: "Сайты" },
  { id: "videos", label: "Видео" },
  { id: "assistants", label: "Ассистенты" },
];

// Дефолтные обложки для примеров по id (локальные ассеты).
// Если в админке для примера задана своя обложка (URL) — используется она.
const DEFAULT_COVERS: Record<string, string> = {
  nails: exampleNails,
  coffee: exampleCoffee,
  studio: exampleCeramics,
  avito: exampleAssistant,
  tg: exampleAssistant,
  unbox: preset1,
  trend: preset1,
  avatar: preset5,
};

type ExampleItem = {
  id: string;
  cat: Exclude<ExampleCat, "all">;
  tag: string;
  title: string;
  meta: string;
  cover: string;
  description: string;
};

/** Превращает редактируемые примеры в готовые к рендеру (с разрешённой обложкой). */
function resolveExamples(items: HomeExample[]): ExampleItem[] {
  return items.map((e) => ({
    id: e.id,
    cat: e.cat,
    tag: e.tag,
    title: e.title,
    meta: e.meta,
    description: e.description,
    cover: e.cover?.trim() || DEFAULT_COVERS[e.id] || preset2,
  }));
}


function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const home = Route.useLoaderData();
  const examplesResolved = resolveExamples(home.examples);

  return (
    <div className="min-h-dvh bg-background text-foreground overflow-x-hidden">
      {/* PROMO BAR */}
      {home.promo.enabled && (
        <Link
          to="/signup"
          className="group relative flex items-center justify-center gap-2 w-full h-11 sm:h-12 px-4 text-[12.5px] sm:text-[13px] font-medium text-foreground border-b border-border hover:brightness-110 transition-all"
          style={{ background: "var(--gradient-warm-soft)" }}
        >
          <Gift className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={2} />
          <span className="truncate text-accent font-semibold">{home.promo.text}</span>
          {home.promo.cta && (
            <span className="inline-flex items-center gap-1 text-accent font-semibold shrink-0">
              {home.promo.cta} <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </Link>
      )}
      {/* NAV */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">

        <div className="mx-auto max-w-7xl px-5 lg:px-8 h-16 flex items-center gap-6">
          <Link to="/" className="flex items-center shrink-0" aria-label="neeklo, на главную">
            <BrandLogo variant="wordmark" height={28} className="block" />
          </Link>


          <nav className="hidden md:flex items-center gap-7 mx-auto">
            {navLinks.map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
                className="text-[13.5px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3 ml-auto">
            <Link to="/login" className="text-[13.5px] text-muted-foreground hover:text-foreground transition-colors">
              Войти
            </Link>
            <Link
              to="/signup"
              className="btn-primary inline-flex items-center gap-1.5 h-10 px-5 text-[13.5px]"
              style={{ boxShadow: "var(--shadow-warm)" }}
            >
              Начать бесплатно
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <button
            type="button"
            aria-label="Меню"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden ml-auto w-10 h-10 -mr-2 rounded-lg flex items-center justify-center hover:bg-surface-2"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background/95">
            <div className="px-5 py-4 flex flex-col gap-1">
              {navLinks.map((l) => (
                <a
                  key={l.id}
                  href={`#${l.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="py-2.5 text-[15px] text-foreground/90"
                >
                  {l.label}
                </a>
              ))}
              <div className="h-px bg-border my-2" />
              <Link to="/login" className="py-2.5 text-[15px] text-muted-foreground">
                Войти
              </Link>
              <Link
                to="/signup"
                className="btn-primary mt-2 inline-flex items-center justify-center h-12 px-5 text-[14.5px]"
              >
                Начать бесплатно
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(60% 50% at 20% 20%, oklch(0.78 0.17 32 / 0.16) 0%, transparent 60%), radial-gradient(50% 40% at 90% 30%, oklch(0.55 0.18 280 / 0.10) 0%, transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8 pt-4 sm:pt-14 lg:pt-24 pb-6 sm:pb-16 lg:pb-28 grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16 items-center">
          <div className="min-w-0">
            <div className="hidden sm:inline-flex items-center gap-2 px-3 h-7 rounded-full border border-border bg-card text-[11.5px] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              {home.hero.badge}
            </div>
            {/* Mobile heading: 2 tight lines */}
            <h1 className="sm:hidden text-[30px] leading-[1.02] font-bold tracking-[-0.02em]">
              Сайт, видео и{"\u00A0"}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-warm)" }}
              >
                ассистент
              </span>
              {" "}за{"\u00A0"}минуту
            </h1>
            {/* Desktop heading */}
            <h1 className="hidden sm:block mt-5 text-[52px] lg:text-[64px] leading-[1.02] font-bold tracking-[-0.025em]">
              {nbsp(home.hero.titlePrefix)}{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-warm)" }}
              >
                {nbsp(home.hero.titleAccent)}
              </span>{" "}
              {nbsp(home.hero.titleSuffix)}
            </h1>
            <p className="mt-2 sm:mt-5 text-[13px] sm:text-[16px] lg:text-[18px] text-muted-foreground max-w-[36rem] leading-snug sm:leading-[1.55]">
              <span className="sm:hidden">Один AI: фото, ссылка или описание.</span>
              <span className="hidden sm:inline">{nbsp(home.hero.subtitle)}</span>
            </p>

            {/* MOBILE: compact results carousel */}
            <div className="sm:hidden mt-3">
              <HeroMobileCarousel />
            </div>

            {/* CTA, mobile */}
            <div className="mt-3 flex flex-col gap-1.5 sm:hidden">
              <Link
                to="/signup"
                className="btn-primary inline-flex items-center justify-center gap-2 w-full rounded-full text-[15px] font-semibold"
                style={{ height: 50, boxShadow: "var(--shadow-warm)" }}
              >
                Создать бесплатно
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#examples"
                className="inline-flex items-center justify-center gap-1.5 h-9 w-full text-[12.5px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Посмотреть примеры
              </a>
            </div>

            {/* CTA, desktop */}
            <div className="mt-8 hidden sm:flex flex-wrap items-center gap-3">
              <Link
                to="/signup"
                className="btn-primary inline-flex items-center gap-2 h-12 px-6 text-[14.5px]"
                style={{ boxShadow: "var(--shadow-warm)" }}
              >
                Начать бесплатно
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#examples"
                className="btn-secondary inline-flex items-center gap-2 h-12 px-6 text-[14.5px]"
              >
                <Play className="w-4 h-4" />
                Посмотреть примеры
              </a>
            </div>

            <div className="mt-8 hidden sm:flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-accent" /> Без карты</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-accent" /> Публикуем за тебя</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-accent" /> Работает с Avito</span>
            </div>
          </div>

          {/* COLLAGE, desktop/tablet only */}
          <div className="hidden sm:block">
            <HeroCollage />
          </div>
        </div>
      </section>

      {/* MODELS SHOWCASE */}
      {home.sections.models && <ModelsShowcase />}


      {/* SOLUTIONS */}
      {home.sections.solutions && (
      <section id="solutions" className="border-t border-border">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-16 lg:py-24">
          <div className="max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/80 font-medium">
              Что можно сделать
            </div>
            <h2 className="mt-3 text-[26px] sm:text-[32px] lg:text-[40px] font-bold tracking-[-0.02em] leading-[1.08]">
              {nbsp("Три формата под одну задачу")}
            </h2>
          </div>

          <div className="mt-8 sm:mt-10">
            {/* mobile: snap carousel; md+: grid */}
            <div className="flex md:grid md:grid-cols-3 gap-4 lg:gap-5 overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-5 px-5 md:mx-0 md:px-0 pb-2 md:pb-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {solutions.map((s) => (
                <Link
                  key={s.id}
                  to="/signup"
                  className="group relative shrink-0 snap-start w-[78%] sm:w-[58%] md:w-auto rounded-3xl overflow-hidden bg-card border border-border flex flex-col transition-all hover:border-accent/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  style={{ boxShadow: "var(--shadow-raised)" }}
                >
                  {/* Live preview */}
                  <div className="relative aspect-[4/5] md:aspect-[3/4] overflow-hidden">
                    <img
                      src={s.cover}
                      alt={s.title}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(10,10,12,0) 35%, rgba(10,10,12,0.55) 65%, rgba(10,10,12,0.92) 100%)",
                      }}
                    />
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-background/70 backdrop-blur text-[10.5px] uppercase tracking-[0.14em] font-semibold border border-white/10 text-foreground/90">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                      {s.tag}
                    </span>

                    {/* Title + benefit overlay */}
                    <div className="absolute left-4 right-4 bottom-4">
                      <h3 className="text-[20px] sm:text-[22px] font-semibold tracking-tight text-white">
                        {nbsp(s.title)}
                      </h3>
                      <p className="mt-1 text-[13px] text-white/75 leading-snug">
                        {nbsp(s.benefit)}
                      </p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 sm:p-5 flex flex-col gap-3.5">
                    <ul className="flex flex-col gap-1.5">
                      {s.bullets.map((b) => (
                        <li key={b} className="flex items-center gap-2 text-[12.5px] text-foreground/80">
                          <Check className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={2.2} />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <span
                      className="btn-primary self-start inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-[13px] font-semibold"
                      style={{ boxShadow: "var(--shadow-warm)" }}
                    >
                      Попробовать
                      <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
      )}


      {/* HOW IT WORKS */}
      {home.sections.how && <HowItWorksSection />}

      {/* EXAMPLES */}
      {home.sections.examples && <ExamplesSection items={examplesResolved} />}

      {/* PROOF STRIP */}
      {home.sections.proof && <ProofStrip />}


      {/* PRICING */}
      {home.sections.pricing && <PricingSection />}

      {/* FAQ */}
      {home.sections.faq && <FaqSection />}


      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-12 lg:py-14 grid gap-8 md:grid-cols-[1.2fr_1fr] items-start">
          <div>
            <div className="flex items-center">
              <BrandLogo variant="wordmark" height={26} />
            </div>

            <p className="mt-4 text-[13.5px] text-muted-foreground max-w-sm leading-snug">
              Сайт, ассистент и видео для бизнеса. За минуту, без программистов.
            </p>
            <div className="mt-4 text-[13px] text-muted-foreground">
              Контакт:{" "}
              <a href="https://t.me/neeekn" target="_blank" rel="noreferrer" className="text-foreground hover:text-accent transition-colors">
                @neeekn
              </a>
            </div>
          </div>
          <nav className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13.5px]">
            <a href="#solutions" className="text-muted-foreground hover:text-foreground transition-colors">Решения</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Цены</a>
            <a href="#examples" className="text-muted-foreground hover:text-foreground transition-colors">Примеры</a>
            <a href="https://t.me/neeekn" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">Контакты</a>
          </nav>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto max-w-7xl px-5 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted-foreground">
            <span>© 2026 neeklo. Все права защищены.</span>
            <span>Сделано в neeklo</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

function HowItWorksSection() {
  const [active, setActive] = useState(0);
  const hoveredRef = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (hoveredRef.current) return;
      setActive((a) => (a + 1) % steps.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section id="how" className="border-t border-border bg-surface-1/30 overflow-hidden">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-16 lg:py-24">
        <div className="max-w-xl">
          <div className="text-[11.5px] uppercase tracking-[0.12em] text-accent font-semibold">Как это работает</div>
          <h2 className="mt-3 text-[28px] sm:text-[36px] lg:text-[44px] font-bold tracking-[-0.02em] leading-[1.08]">
            {nbsp("От идеи до результата")}
          </h2>
        </div>

        {/* Desktop: flow + preview */}
        <div className="mt-12 hidden lg:grid grid-cols-12 gap-10 items-center">
          <div className="col-span-7"
            onMouseEnter={() => { hoveredRef.current = true; }}
            onMouseLeave={() => { hoveredRef.current = false; }}
          >
            <FlowHorizontal active={active} onPick={setActive} />
          </div>
          <div className="col-span-5">
            <FlowPreview step={active} />
          </div>
        </div>

        {/* Mobile / Tablet: column with vertical connector */}
        <div className="mt-10 lg:hidden">
          <FlowVertical active={active} onPick={setActive} />
        </div>
      </div>
    </section>
  );
}

function FlowHorizontal({ active, onPick }: { active: number; onPick: (n: number) => void }) {
  const progress = steps.length === 1 ? 0 : active / (steps.length - 1);
  return (
    <div className="relative">
      {/* connector track */}
      <div className="absolute left-0 right-0 top-7 h-px"
        style={{ background: "linear-gradient(90deg, transparent, var(--border-strong) 8%, var(--border-strong) 92%, transparent)" }}
      />
      {/* connector progress */}
      <div className="absolute left-0 top-7 h-px transition-all duration-700 ease-out"
        style={{
          width: `${Math.max(6, progress * 100)}%`,
          background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--accent) 70%, transparent) 30%, var(--accent))",
        }}
      />
      {/* moving dot */}
      <div
        className="absolute top-7 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full transition-all duration-700 ease-out"
        style={{
          left: `${progress * 100}%`,
          background: "var(--accent)",
          boxShadow: "0 0 0 4px color-mix(in oklab, var(--accent) 25%, transparent), 0 0 20px color-mix(in oklab, var(--accent) 60%, transparent)",
        }}
      />

      <div className="grid grid-cols-3 gap-6 relative">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === active;
          return (
            <button
              key={s.n}
              type="button"
              onMouseEnter={() => onPick(i)}
              onFocus={() => onPick(i)}
              onClick={() => onPick(i)}
              className="group text-left flex flex-col items-start"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300"
                style={{
                  background: isActive ? "var(--gradient-warm-soft)" : "var(--surface-2)",
                  border: `1px solid ${isActive ? "color-mix(in oklab, var(--accent) 50%, transparent)" : "var(--border)"}`,
                  boxShadow: isActive ? "0 8px 24px -10px color-mix(in oklab, var(--accent) 50%, transparent)" : "none",
                }}
              >
                <Icon className={"w-6 h-6 transition-colors " + (isActive ? "text-accent" : "text-muted-foreground")} strokeWidth={1.8} />
              </div>
              <div className="mt-5 text-[10.5px] font-mono tracking-[0.18em] text-muted-foreground/70">{s.n}</div>
              <div className={"mt-1.5 text-[18px] font-semibold tracking-tight transition-colors " + (isActive ? "text-foreground" : "text-foreground/85")}>
                {nbsp(s.title)}
              </div>
              <div className="mt-1 text-[13.5px] text-muted-foreground leading-snug">{nbsp(s.desc)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FlowVertical({ active, onPick }: { active: number; onPick: (n: number) => void }) {
  return (
    <div className="relative">
      {/* vertical track */}
      <div className="absolute left-[27px] top-4 bottom-4 w-px"
        style={{ background: "linear-gradient(180deg, transparent, var(--border-strong) 8%, var(--border-strong) 92%, transparent)" }}
      />
      <div className="absolute left-[27px] top-4 w-px transition-all duration-700 ease-out"
        style={{
          height: `calc(${steps.length === 1 ? 0 : (active / (steps.length - 1)) * 100}% - 1rem)`,
          background: "linear-gradient(180deg, color-mix(in oklab, var(--accent) 70%, transparent), var(--accent))",
        }}
      />

      <ul className="space-y-6">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === active;
          return (
            <li key={s.n}>
              <button
                type="button"
                onClick={() => onPick(i)}
                className="w-full text-left flex items-start gap-4"
              >
                <div
                  className="relative z-10 shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300"
                  style={{
                    background: isActive ? "var(--gradient-warm-soft)" : "var(--surface-2)",
                    border: `1px solid ${isActive ? "color-mix(in oklab, var(--accent) 50%, transparent)" : "var(--border)"}`,
                    boxShadow: isActive ? "0 8px 24px -10px color-mix(in oklab, var(--accent) 50%, transparent)" : "none",
                  }}
                >
                  <Icon className={"w-6 h-6 transition-colors " + (isActive ? "text-accent" : "text-muted-foreground")} strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="text-[10.5px] font-mono tracking-[0.18em] text-muted-foreground/70">{s.n}</div>
                  <div className="mt-1 text-[17px] font-semibold tracking-tight">{nbsp(s.title)}</div>
                  <div className="mt-0.5 text-[13.5px] text-muted-foreground leading-snug">{nbsp(s.desc)}</div>
                </div>
              </button>
              <div className="ml-[72px] mt-3">
                <FlowPreview step={i} compact />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FlowPreview({ step, compact }: { step: number; compact?: boolean }) {
  return (
    <div
      className={"relative rounded-2xl border border-border bg-card overflow-hidden " + (compact ? "" : "shadow-[0_30px_80px_-40px_rgba(0,0,0,0.6)]")}
      style={{ aspectRatio: compact ? "16/9" : "5/4" }}
    >
      {/* soft glow */}
      <div className="absolute inset-0 opacity-60 pointer-events-none"
        style={{ background: "radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, var(--accent) 14%, transparent), transparent 60%)" }}
      />
      <div className="absolute inset-0">
        {step === 0 && <PreviewPrompt />}
        {step === 1 && <PreviewBuilding />}
        {step === 2 && <PreviewReady />}
      </div>
    </div>
  );
}

function PreviewPrompt() {
  return (
    <div className="h-full w-full p-4 sm:p-5 flex flex-col">
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground/70">Шаг 01 · Промпт</div>
      <div className="mt-3 flex-1 rounded-xl border border-border bg-surface-2/60 p-3.5 flex flex-col">
        <div className="text-[13px] leading-snug text-foreground/90">
          <span className="text-muted-foreground">/</span> Сделай сайт для кофейни на углу, тёмная тема, меню и адрес
          <span className="ml-0.5 inline-block w-[7px] h-[15px] align-[-2px] bg-accent animate-pulse" />
        </div>
        <div className="mt-auto pt-3 flex items-center gap-2">
          <span className="h-6 px-2 rounded-md bg-card border border-border text-[11px] text-muted-foreground">кофейня</span>
          <span className="h-6 px-2 rounded-md bg-card border border-border text-[11px] text-muted-foreground">тёмная</span>
          <span className="ml-auto h-7 px-3 rounded-lg text-[11.5px] font-semibold text-accent-foreground inline-flex items-center"
            style={{ background: "var(--gradient-warm)" }}>
            Создать
          </span>
        </div>
      </div>
    </div>
  );
}

function PreviewBuilding() {
  const bars = [
    { label: "Структура", pct: 100 },
    { label: "Тексты", pct: 86 },
    { label: "Картинки", pct: 64 },
    { label: "Стиль", pct: 42 },
  ];
  return (
    <div className="h-full w-full p-4 sm:p-5 flex flex-col">
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground/70">Шаг 02 · Сборка</div>
      <div className="mt-3 flex-1 rounded-xl border border-border bg-surface-2/60 p-3.5 flex flex-col gap-2.5">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-foreground/90">{b.label}</span>
              <span className="text-muted-foreground/70 font-mono">{b.pct}%</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-card overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${b.pct}%`, background: "var(--gradient-warm)" }}
              />
            </div>
          </div>
        ))}
        <div className="mt-auto text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          neeklo подбирает модели
        </div>
      </div>
    </div>
  );
}

function PreviewReady() {
  return (
    <div className="h-full w-full p-4 sm:p-5 flex flex-col">
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground/70">Шаг 03 · Готово</div>
      <div className="mt-3 flex-1 rounded-xl border border-border bg-background overflow-hidden flex flex-col">
        <div className="h-6 border-b border-border bg-surface-2 flex items-center gap-1 px-2">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
          <span className="ml-2 text-[10px] font-mono text-muted-foreground/80 truncate">coffee-na-uglu.neeklo.app</span>
        </div>
        <div className="flex-1 p-3 flex flex-col gap-2">
          <div className="h-2 w-1/2 rounded bg-foreground/80" />
          <div className="h-2 w-2/3 rounded bg-foreground/30" />
          <div className="mt-2 grid grid-cols-3 gap-2 flex-1">
            <div className="rounded-md" style={{ background: "var(--gradient-warm-soft)" }} />
            <div className="rounded-md bg-surface-2" />
            <div className="rounded-md bg-surface-2" />
          </div>
          <div className="mt-auto flex items-center gap-2">
            <span className="h-5 px-2 rounded-md text-[10px] font-semibold text-accent-foreground inline-flex items-center"
              style={{ background: "var(--gradient-warm)" }}>
              Опубликовано
            </span>
            <span className="text-[10.5px] text-muted-foreground">за 58 секунд</span>
          </div>
        </div>
      </div>
    </div>
  );
}


function HeroMobileCarousel() {
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const stepWidth = () => {
    const el = scrollerRef.current;
    if (!el) return 0;
    const card = el.querySelector<HTMLElement>("[data-slide]");
    return card ? card.offsetWidth + 12 : el.clientWidth * 0.7;
  };

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / Math.max(1, stepWidth()));
    if (i !== active) setActive(Math.min(2, Math.max(0, i)));
  };

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.min(2, Math.max(0, i));
    el.scrollTo({ left: clamped * stepWidth(), behavior: "smooth" });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(active + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(active - 1);
    }
  };

  return (
    <div className="relative -mx-5">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="group"
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar px-5 gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl"
        style={{ scrollbarWidth: "none" }}
        aria-label="Примеры результатов, листайте свайпом или стрелками"
      >
        {/* Video reel, autoplay muted loop with poster */}
        <div data-slide className="snap-start shrink-0 w-[150px]">
          <div
            className="relative h-[220px] rounded-xl overflow-hidden border border-border bg-card"
            style={{ boxShadow: "var(--shadow-popover)" }}
          >
            <video
              className="absolute inset-0 w-full h-full object-cover"
              src="/hero-reel.mp4"
              poster={preset1}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 45%, rgba(10,10,12,0.85) 100%)" }} />
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-background/80 backdrop-blur text-[9.5px] font-medium border border-border">
              <span className="w-1 h-1 rounded-full" style={{ background: "var(--accent)" }} />
              9:16
            </span>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-9 h-9 rounded-full bg-white/95 text-black flex items-center justify-center shadow-lg">
                <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />
              </div>
            </div>
            <div className="absolute bottom-2 left-2.5 right-2.5">
              <div className="text-white text-[11.5px] font-semibold leading-tight truncate">Reels из фото</div>
            </div>
          </div>
        </div>

        {/* Site in phone frame */}
        <div data-slide className="snap-start shrink-0 w-[150px]">
          <div
            className="relative h-[220px] rounded-xl overflow-hidden border border-border bg-card"
            style={{ boxShadow: "var(--shadow-popover)" }}
          >
            <div className="h-5 flex items-center gap-1 px-2 bg-surface-2 border-b border-border">
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <span className="ml-1 text-[8px] text-muted-foreground font-mono truncate">studio.neeklo.app</span>
            </div>
            <div className="relative" style={{ height: "calc(100% - 20px)" }}>
              <img src={preset2} alt="Сайт" loading="eager" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(10,10,12,0.85) 100%)" }} />
              <div className="absolute bottom-2 left-2.5 right-2.5">
                <div className="text-white text-[11.5px] font-semibold leading-tight truncate">Студия керамики</div>
                <div className="text-[9.5px] text-white/70 mt-0.5 truncate">Опубликован за 3 мин</div>
              </div>
            </div>
          </div>
        </div>

        {/* Assistant chat */}
        <div data-slide className="snap-start shrink-0 w-[150px]">
          <div
            className="relative h-[220px] rounded-xl overflow-hidden border border-border bg-card p-2.5 flex flex-col"
            style={{ boxShadow: "var(--shadow-popover)" }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-full bg-gradient-warm flex items-center justify-center">
                <Bot className="w-3 h-3" style={{ color: "var(--accent-foreground)" }} strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <div className="text-[10.5px] font-semibold leading-none truncate">Менеджер Avito</div>
                <div className="text-[8.5px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" /> онлайн
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-1 overflow-hidden">
              <div className="self-start max-w-[92%] rounded-lg rounded-bl-sm bg-surface-2 px-2 py-1 text-[9.5px] leading-snug">
                Подскажите адрес?
              </div>
              <div className="self-end max-w-[92%] rounded-lg rounded-br-sm bg-gradient-warm text-[9.5px] leading-snug px-2 py-1" style={{ color: "var(--accent-foreground)" }}>
                Тверская 7
              </div>
              <div className="self-start max-w-[95%] rounded-lg rounded-bl-sm bg-surface-2 px-2 py-1 text-[9.5px] leading-snug">
                Запишу на 18:00?
              </div>
            </div>
            <div className="mt-1.5 inline-flex items-center gap-1 self-start px-1.5 h-4 rounded-full bg-surface-2 border border-border text-[8.5px] text-muted-foreground">
              <span className="w-1 h-1 rounded-full bg-emerald-400" /> Заявка в CRM
            </div>
          </div>
        </div>
      </div>

      {/* Arrows + dots */}
      <div className="mt-2 flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label="Предыдущий слайд"
          onClick={() => goTo(active - 1)}
          disabled={active === 0}
          className="w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center text-foreground/80 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.2} />
        </button>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              type="button"
              aria-label={`Слайд ${i + 1}`}
              aria-current={active === i}
              onClick={() => goTo(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: active === i ? 16 : 6,
                background: active === i ? "var(--accent)" : "color-mix(in oklab, var(--foreground) 25%, transparent)",
              }}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Следующий слайд"
          onClick={() => goTo(active + 1)}
          disabled={active === 2}
          className="w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center text-foreground/80 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}


function HeroCollage() {
  return (
    <div className="relative w-full max-w-[560px] mx-auto aspect-[5/5] lg:aspect-[1/1]">
      {/* Site preview card */}
      <div
        className="absolute left-0 top-[6%] w-[62%] rounded-2xl overflow-hidden border border-border bg-card floaty-card floaty-a"
        style={{ boxShadow: "var(--shadow-popover)" }}
      >
        <div className="h-7 flex items-center gap-1.5 px-3 bg-surface-2 border-b border-border">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
          <span className="ml-3 text-[10px] text-muted-foreground font-mono truncate">studio.neeklo.app</span>
        </div>
        <div className="relative aspect-[4/3]">
          <img fetchPriority="high" decoding="async" src={preset2} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 30%, rgba(10,10,12,0.7) 100%)" }} />
          <div className="absolute bottom-3 left-3 right-3">
            <div className="text-white text-[13px] font-semibold leading-tight">Студия керамики</div>
            <div className="text-[10px] text-white/70 mt-0.5">Лендинг • опубликован</div>
          </div>
        </div>
      </div>

      {/* Video reel card */}
      <div
        className="absolute right-0 top-0 w-[42%] rounded-2xl overflow-hidden border border-border bg-card floaty-card floaty-b"
        style={{ boxShadow: "var(--shadow-popover)" }}
      >
        <div className="relative aspect-[9/14]">
          <img fetchPriority="high" decoding="async" src={preset1} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(10,10,12,0.8) 100%)" }} />
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 h-5 rounded-full bg-background/80 backdrop-blur text-[9px] font-medium border border-border">
            <span className="w-1 h-1 rounded-full" style={{ background: "var(--accent)" }} />
            9:16
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-white/95 text-black flex items-center justify-center">
              <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
            </div>
          </div>
          <div className="absolute bottom-2.5 left-2.5 right-2.5">
            <div className="text-white text-[11px] font-semibold leading-tight">Распаковка №14</div>
            <div className="text-[9px] text-white/70 mt-0.5">2.1K просмотров</div>
          </div>
        </div>
      </div>

      {/* Chat assistant card */}
      <div
        className="absolute left-[8%] bottom-0 w-[64%] rounded-2xl overflow-hidden border border-border bg-card p-3.5 floaty-card floaty-c"
        style={{ boxShadow: "var(--shadow-popover)" }}
      >

        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-gradient-warm flex items-center justify-center">
            <Bot className="w-3.5 h-3.5" style={{ color: "var(--accent-foreground)" }} strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold leading-none">Менеджер Avito</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> онлайн
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="self-start max-w-[80%] rounded-xl rounded-bl-sm bg-surface-2 px-3 py-1.5 text-[11.5px]">
            Здравствуйте! Подскажите адрес?
          </div>
          <div className="self-end max-w-[80%] rounded-xl rounded-br-sm bg-gradient-warm text-[11.5px] px-3 py-1.5" style={{ color: "var(--accent-foreground)" }}>
            Москва, Тверская 7
          </div>
          <div className="self-start max-w-[85%] rounded-xl rounded-bl-sm bg-surface-2 px-3 py-1.5 text-[11.5px]">
            Записал. Когда удобно, сегодня в 18:00?
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-full bg-surface-2 border border-border px-3 py-1.5">
          <Wand2 className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="flex-1 text-[11px] text-muted-foreground truncate">Подбираю время…</span>
          <span className="w-6 h-6 rounded-full bg-gradient-warm flex items-center justify-center">
            <Send className="w-3 h-3" style={{ color: "var(--accent-foreground)" }} />
          </span>
        </div>
      </div>

      <style>{`
        .floaty-card {
          will-change: transform;
          transform: translate3d(0,0,0);
          backface-visibility: hidden;
          animation: floaty 9s ease-in-out infinite;
        }
        .floaty-b { animation-duration: 11s; animation-delay: -2.5s; }
        .floaty-c { animation-duration: 13s; animation-delay: -5s; }
        @keyframes floaty {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -6px, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .floaty-card { animation: none; }
        }
      `}</style>

    </div>
  );
}

function ExamplesSection({ items }: { items: ExampleItem[] }) {
  const [filter, setFilter] = useState<ExampleCat>("all");
  const [active, setActive] = useState<ExampleItem | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const visible = filter === "all" ? items : items.filter((e) => e.cat === filter);

  const onTabsKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = exampleFilters.findIndex((f) => f.id === filter);
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % exampleFilters.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + exampleFilters.length) % exampleFilters.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = exampleFilters.length - 1;
    else return;
    e.preventDefault();
    setFilter(exampleFilters[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="examples" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 pt-20 lg:pt-32 pb-16 lg:pb-24">

        <div className="max-w-2xl">
          <div className="text-[11.5px] uppercase tracking-[0.12em] text-accent font-semibold">Примеры</div>
          <h2 className="mt-3 text-[28px] sm:text-[36px] lg:text-[44px] font-bold tracking-[-0.02em] leading-[1.08]">
            {nbsp("Живые примеры, созданные в neeklo")}
          </h2>
        </div>

        {/* Filter chips */}
        <div
          role="tablist"
          aria-label="Фильтр примеров по категориям"
          onKeyDown={onTabsKeyDown}
          className="-mx-5 lg:-mx-8 mt-7 mb-6 overflow-x-auto no-scrollbar"
        >
          <div className="flex gap-2 px-5 lg:px-8 w-max">
            {exampleFilters.map((f, i) => {
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  ref={(el) => { tabRefs.current[i] = el; }}
                  type="button"
                  role="tab"
                  id={`examples-tab-${f.id}`}
                  aria-selected={isActive}
                  aria-controls="examples-panel"
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setFilter(f.id)}
                  className={[
                    "shrink-0 min-h-11 h-11 px-5 rounded-full text-[13.5px] font-medium transition-colors border",
                    "focus-visible:outline-none",
                    isActive
                      ? "bg-accent/15 text-accent border-accent/45"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border-strong",
                  ].join(" ")}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Masonry creator grid */}
        <div
          id="examples-panel"
          role="tabpanel"
          aria-labelledby={`examples-tab-${filter}`}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5"
        >
          {visible.map((e, idx) => (
            <CreatorCard key={e.id} item={e} eager={idx < 3} onOpen={() => setActive(e)} />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link to="/signup" className="inline-flex items-center gap-1.5 text-[14px] text-accent hover:text-accent/80 transition-colors">
            Смотреть все примеры
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <ExampleLightbox item={active} onClose={() => setActive(null)} />
    </section>
  );
}

/** Single masonry card. Renders varying chrome and heights per category. */
function CreatorCard({
  item,
  eager,
  onOpen,
}: {
  item: ExampleItem;
  eager: boolean;
  onOpen: () => void;
}) {
  const aspect =
    item.cat === "videos" ? "aspect-[4/5]"
    : item.cat === "sites" ? "aspect-[4/5]"
    : "aspect-[4/5]";



  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Открыть пример: ${item.title}`}
      className={[
        "group relative block w-full overflow-hidden rounded-2xl border border-border bg-card text-left",
        "transition-transform hover:-translate-y-0.5 focus-visible:outline-none cursor-pointer",
        aspect,
      ].join(" ")}
      style={{ boxShadow: "var(--shadow-raised)" }}
    >
      {item.cat === "videos" && <VideoMedia poster={item.cover} alt={item.title} />}
      {item.cat === "sites" && <SiteMedia src={item.cover} alt={item.title} eager={eager} />}
      {item.cat === "assistants" && <AssistantMedia title={item.title} />}

      {/* gradient veil for legibility */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, transparent 50%, rgba(10,10,12,0.9) 100%)" }}
      />

      {/* type badge */}
      <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-background/80 backdrop-blur text-[11px] font-medium border border-border">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
        {item.tag}
      </span>

      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-white text-[15px] font-semibold leading-tight truncate">{nbsp(item.title)}</div>
          <div className="text-[11.5px] text-white/70 mt-1 truncate">{item.meta}</div>
        </div>
        <span className="w-10 h-10 rounded-full bg-white/95 text-black flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </button>
  );
}

function VideoMedia({ poster, alt }: { poster: string; alt: string }) {
  return (
    <video
      className="absolute inset-0 w-full h-full object-cover"
      src="/hero-reel.mp4"
      poster={poster}
      aria-label={alt}
      muted
      loop
      autoPlay
      playsInline
      preload="metadata"
    />
  );
}

function SiteMedia({ src, alt, eager }: { src: string; alt: string; eager: boolean }) {
  return (
    <div className="absolute inset-3 rounded-xl overflow-hidden border border-border bg-surface-2 flex flex-col">
      <div className="h-7 shrink-0 flex items-center gap-1.5 px-3 bg-surface-3 border-b border-border">
        <span className="w-2 h-2 rounded-full bg-[oklch(0.68_0.16_25)]" />
        <span className="w-2 h-2 rounded-full bg-[oklch(0.82_0.14_85)]" />
        <span className="w-2 h-2 rounded-full bg-[oklch(0.72_0.14_150)]" />
        <span className="mx-auto h-4 px-3 rounded-full bg-background/70 border border-border text-[9.5px] text-muted-foreground inline-flex items-center max-w-[60%] truncate">
          neeklo.app
        </span>
      </div>
      <div className="relative flex-1">
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "top center" }}
        />
      </div>
    </div>
  );
}

function AssistantMedia({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 p-4 sm:p-5 flex flex-col gap-2.5 bg-surface-1">
      <div className="flex items-center gap-2.5 pb-2.5 border-b border-border">
        <div className="w-8 h-8 rounded-full grid place-items-center text-[12px] font-semibold text-accent-foreground" style={{ background: "var(--gradient-warm)" }}>
          AI
        </div>
        <div className="min-w-0">
          <div className="text-[12.5px] font-semibold leading-tight truncate">{title}</div>
          <div className="text-[10.5px] text-muted-foreground inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.72_0.14_150)]" />
            онлайн
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 text-[12px] leading-snug overflow-hidden">
        <div className="self-start max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md bg-surface-2 border border-border text-foreground/90">
          Здравствуйте, ещё актуально?
        </div>
        <div className="self-end max-w-[85%] px-3 py-2 rounded-2xl rounded-br-md text-accent-foreground" style={{ background: "var(--gradient-warm)" }}>
          Да, свободно завтра в 14:00. Записать?
        </div>
        <div className="self-start max-w-[75%] px-3 py-2 rounded-2xl rounded-bl-md bg-surface-2 border border-border text-foreground/90">
          Да, запишите
        </div>
        <div className="self-end max-w-[60%] px-3 py-2 rounded-2xl rounded-br-md text-accent-foreground inline-flex items-center gap-1.5" style={{ background: "var(--gradient-warm)" }}>
          <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
          <span className="w-1 h-1 rounded-full bg-current animate-pulse" style={{ animationDelay: "120ms" }} />
          <span className="w-1 h-1 rounded-full bg-current animate-pulse" style={{ animationDelay: "240ms" }} />
        </div>
      </div>
    </div>
  );
}


/** Image with device chrome: browser for sites, phone for assistants, plain card for videos. */
function FramedScreenshot({
  cat,
  src,
  alt,
  onLoad,
  loaded,
  eager = false,
}: {
  cat: Exclude<ExampleCat, "all">;
  src: string;
  alt: string;
  onLoad?: () => void;
  loaded: boolean;
  eager?: boolean;
}) {
  const img = (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      onLoad={onLoad}
      className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
      style={{
        objectPosition: cat === "sites" ? "top center" : "center",
        opacity: loaded ? 1 : 0,
      }}
    />
  );


  if (cat === "sites") {
    // Browser chrome
    return (
      <div className="absolute inset-3 rounded-xl overflow-hidden border border-border bg-surface-2 flex flex-col">
        <div className="h-7 shrink-0 flex items-center gap-1.5 px-3 bg-surface-3 border-b border-border">
          <span className="w-2 h-2 rounded-full bg-[oklch(0.68_0.16_25)]" />
          <span className="w-2 h-2 rounded-full bg-[oklch(0.82_0.14_85)]" />
          <span className="w-2 h-2 rounded-full bg-[oklch(0.72_0.14_150)]" />
          <span className="mx-auto h-4 px-3 rounded-full bg-background/70 border border-border text-[9.5px] text-muted-foreground inline-flex items-center max-w-[60%] truncate">
            neeklo.app
          </span>
        </div>
        <div className="relative flex-1">{img}</div>
      </div>
    );
  }

  if (cat === "assistants") {
    // Phone chrome
    return (
      <div className="absolute inset-x-0 inset-y-2 flex items-center justify-center">
        <div className="relative h-[94%] aspect-[9/19] rounded-[28px] border border-border-strong bg-surface-3 p-1.5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-14 h-3 rounded-b-xl bg-background z-10" />
          <div className="relative w-full h-full rounded-[22px] overflow-hidden bg-surface-1">
            {img}
          </div>
        </div>
      </div>
    );
  }

  // Plain (videos)
  return <>{img}</>;
}

function ExampleLightbox({
  item,
  onClose,
}: {
  item: ExampleItem | null;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);
  // reset loaded when item changes
  const key = item?.id ?? "none";

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setDrag(Math.min(dy, 240));
  };
  const onTouchEnd = () => {
    if (drag > 80) onClose();
    setDrag(0);
    startY.current = null;
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-5xl p-0 overflow-hidden bg-card border-border"
        onOpenAutoFocus={() => {
          setLoaded(false);
          setDrag(0);
        }}
        style={{
          transform: drag ? `translate(-50%, calc(-50% + ${drag}px))` : undefined,
          transition: drag ? "none" : undefined,
          opacity: drag ? 1 - drag / 320 : undefined,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {item && (
          <div key={key} className="grid md:grid-cols-[1.4fr_1fr]">
            <div className="relative bg-background min-h-[280px] md:min-h-[460px] aspect-[4/5] md:aspect-auto">
              {/* swipe handle on mobile */}
              <div
                aria-hidden
                className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/30 z-10"
              />
              <div
                aria-hidden
                className="absolute inset-0 skeleton"
                style={{ opacity: loaded ? 0 : 1, borderRadius: 0, border: 0, transition: "opacity 200ms" }}
              />
              <FramedScreenshot
                cat={item.cat}
                src={item.cover}
                alt={item.title}
                loaded={loaded}
                onLoad={() => setLoaded(true)}
                eager
              />
            </div>
            <div className="p-6 md:p-8 flex flex-col gap-4">
              <DialogHeader>
                <span className="inline-flex self-start items-center gap-1.5 px-2.5 h-7 rounded-full bg-accent/15 text-accent text-[11px] font-semibold border border-accent/30">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                  {item.tag}
                </span>
                <DialogTitle className="mt-3 text-[22px] font-semibold tracking-tight leading-snug">
                  {nbsp(item.title)}
                </DialogTitle>
                <DialogDescription className="text-[13px] text-muted-foreground">
                  {item.meta}
                </DialogDescription>
              </DialogHeader>
              <p className="text-[14px] text-foreground/85 leading-relaxed">
                {nbsp(item.description)}
              </p>
              <div className="mt-auto flex flex-col sm:flex-row gap-2 pt-2">
                <Link
                  to="/signup"
                  onClick={onClose}
                  className="btn-primary inline-flex items-center justify-center gap-2 h-11 px-5 text-[14px]"
                  style={{ boxShadow: "var(--shadow-warm)" }}
                >
                  Сделать такой же
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary inline-flex items-center justify-center h-11 px-5 text-[14px]"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}



type CompareValue = boolean | string | number;

type CompareRow = {
  label: string;
  values: Record<"free" | "start" | "pro", CompareValue>;
  highlight?: boolean;
};

const COMPARE_ROWS: CompareRow[] = [
  {
    label: "Кредиты в месяц",
    values: { free: 30, start: 300, pro: 1200 },
    highlight: true,
  },
  {
    label: "Опубликованные сайты",
    values: { free: "Черновик", start: 1, pro: 3 },
  },
  {
    label: "Видео-генерации",
    values: { free: "1 в месяц", start: 10, pro: 25 },
  },
  {
    label: "AI-ассистент для заявок",
    values: { free: "Тест", start: 1, pro: 3 },
  },
  {
    label: "Свой домен",
    values: { free: false, start: false, pro: true },
  },
  {
    label: "SEO из коробки",
    values: { free: false, start: true, pro: true },
  },
  {
    label: "Без водяного знака",
    values: { free: false, start: true, pro: true },
  },
  {
    label: "Приоритетная генерация",
    values: { free: false, start: false, pro: true },
  },
  {
    label: "Поддержка",
    values: { free: "База", start: "База", pro: "Приоритет" },
  },
  {
    label: "Коммерческое использование",
    values: { free: false, start: true, pro: true },
  },
];

const PRICING_TIERS: { id: "free" | "start" | "pro"; name: string; cta: string; tagline: string }[] = [
  { id: "free", name: "Free", cta: "Попробовать бесплатно", tagline: "Чтобы попробовать без карты" },
  { id: "start", name: "Start", cta: "Начать", tagline: "Соло-проект, один сайт" },
  { id: "pro", name: "Pro", cta: "Выбрать Pro", tagline: "Малый бизнес, всё включено" },
];

const CREDIT_PACKS = [
  { credits: 100, price: 290 },
  { credits: 300, price: 790 },
  { credits: 1000, price: 2290 },
];

function CompareCell({ value, highlight }: { value: CompareValue; highlight?: boolean }) {
  if (value === true) {
    return (
      <span
        className="inline-flex w-5 h-5 rounded-full items-center justify-center"
        style={{ background: highlight ? "var(--gradient-warm-soft)" : "color-mix(in oklab, var(--accent) 14%, transparent)" }}
      >
        <Check className="w-3 h-3 text-accent" strokeWidth={2.6} />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex w-5 h-5 rounded-full items-center justify-center bg-surface-2 text-muted-foreground/70">
        <Minus className="w-3 h-3" strokeWidth={2.6} />
      </span>
    );
  }
  return (
    <span
      className={
        "text-[13.5px] " +
        (highlight ? "text-foreground font-semibold" : "text-foreground/85")
      }
    >
      {value}
    </span>
  );
}

function PricingSection() {
  const [cycle, setCycle] = useState<BillingCycle>("month");
  const [activeTier, setActiveTier] = useState<"free" | "start" | "pro">("pro");
  const [compareOpen, setCompareOpen] = useState(false);

  const activePlan = activeTier === "free" ? null : getPlan(activeTier);
  const activePerMonth = activePlan ? getPlanPricePerMonth(activePlan.id, cycle) : 0;

  return (
    <section id="pricing" className="border-t border-border bg-surface-1/30">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-16 lg:py-24">
        {/* Header */}
        <div className="max-w-2xl">
          <div className="text-[11.5px] uppercase tracking-[0.12em] text-accent font-semibold">Цены</div>
          <h2 className="mt-3 text-[26px] sm:text-[34px] lg:text-[40px] font-bold tracking-[-0.02em] leading-[1.08]">
            {nbsp("Простые тарифы, понятные возможности")}
          </h2>
          <p className="mt-3 text-[14px] lg:text-[15.5px] text-muted-foreground">
            Попробуй бесплатно. Подключай тариф, когда нужен сайт, видео и ассистент без ограничений.
          </p>
        </div>

        {/* Cycle toggle */}
        <div className="mt-6 inline-flex items-center p-1 rounded-full border border-border bg-card">
          <button
            type="button"
            onClick={() => setCycle("month")}
            className={
              "h-9 px-4 rounded-full text-[13px] font-medium transition-colors min-w-[88px] " +
              (cycle === "month" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")
            }
          >
            Месяц
          </button>
          <button
            type="button"
            onClick={() => setCycle("year")}
            className={
              "h-9 px-4 rounded-full text-[13px] font-medium transition-colors inline-flex items-center gap-1.5 min-w-[88px] justify-center " +
              (cycle === "year" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")
            }
          >
            Год
            <span
              className={
                "text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full " +
                (cycle === "year" ? "bg-background/15 text-background" : "bg-accent/15 text-accent")
              }
            >
              −17%
            </span>
          </button>
        </div>

        {/* === MOBILE / TABLET: tabs + comparison table === */}
        <div className="mt-8 lg:hidden">
          {/* Tier tabs */}
          <div
            role="tablist"
            aria-label="Выбор тарифа"
            className="flex gap-1 p-1 rounded-full border border-border bg-card w-full"
          >
            {PRICING_TIERS.map((t) => {
              const active = t.id === activeTier;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTier(t.id)}
                  className={
                    "flex-1 min-w-0 h-11 rounded-full text-[13.5px] font-semibold transition-all px-3 " +
                    (active
                      ? (t.id === "pro"
                          ? "btn-primary"
                          : "bg-foreground text-background")
                      : "text-muted-foreground hover:text-foreground")
                  }
                  style={active && t.id === "pro" ? { boxShadow: "var(--shadow-warm)" } : undefined}
                >
                  {t.name}
                </button>
              );
            })}
          </div>

          {/* Selected tier header: price + CTA, no card */}
          <div className="mt-6 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                  {PRICING_TIERS.find((t) => t.id === activeTier)?.name}
                </span>
                {activeTier === "pro" && (
                  <span
                    className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap"
                    style={{ background: "var(--gradient-warm)", color: "var(--accent-foreground)" }}
                  >
                    <Crown className="w-3 h-3" strokeWidth={2.5} />
                    Популярный
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-[30px] font-bold tracking-[-0.02em] leading-none">
                  {activePlan ? formatRub(activePerMonth) : "0 ₽"}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {activePlan ? "/ мес" : "навсегда"}
                </span>
              </div>
              <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                {PRICING_TIERS.find((t) => t.id === activeTier)?.tagline}
              </p>
            </div>
          </div>

          {/* Comparison table: feature | selected tier value */}
          <div
            className={
              "mt-5 rounded-2xl border " +
              (activeTier === "pro"
                ? "border-accent/40"
                : "border-border")
            }
            style={
              activeTier === "pro"
                ? { boxShadow: "0 0 0 1px color-mix(in oklab, var(--accent) 18%, transparent), 0 20px 60px -40px color-mix(in oklab, var(--accent) 60%, transparent)" }
                : undefined
            }
          >
            <div className="grid grid-cols-[minmax(0,1fr)_104px] text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground/80 font-semibold border-b border-border">
              <div className="px-4 py-3">Возможности</div>
              <div
                className={
                  "px-3 py-3 text-center border-l " +
                  (activeTier === "pro" ? "border-accent/30 text-accent" : "border-border")
                }
              >
                {PRICING_TIERS.find((t) => t.id === activeTier)?.name}
              </div>
            </div>
            {COMPARE_ROWS.map((row, i) => {
              const v = row.values[activeTier];
              return (
                <div
                  key={row.label}
                  className={
                    "grid grid-cols-[minmax(0,1fr)_104px] items-center text-[13px] " +
                    (i % 2 === 1 ? "bg-surface-2/25 " : "") +
                    (i < COMPARE_ROWS.length - 1 ? "border-b border-border/70" : "")
                  }
                >
                  <div className="px-4 py-3.5 text-foreground/85 leading-snug pr-2">{row.label}</div>
                  <div
                    className={
                      "px-2 py-3.5 flex items-center justify-center text-center min-w-0 border-l " +
                      (activeTier === "pro" ? "border-accent/30" : "border-border")
                    }
                  >
                    <CompareCell
                      value={v}
                      highlight={activeTier === "pro" && (row.highlight ?? false)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <Link
            to="/signup"
            className={
              (activeTier === "pro" ? "btn-primary " : "btn-secondary ") +
              "mt-5 w-full inline-flex items-center justify-center gap-2 h-12 rounded-full text-[14.5px] font-semibold"
            }
            style={activeTier === "pro" ? { boxShadow: "var(--shadow-warm)" } : undefined}
          >
            {PRICING_TIERS.find((t) => t.id === activeTier)?.cta}
          </Link>
        </div>

        {/* === DESKTOP: full-width comparison table === */}
        <div className="mt-12 hidden lg:block">
          <div className="relative rounded-3xl border border-border bg-card overflow-hidden">
            {/* Header row: plan names + prices */}
            <div className="relative grid grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(0,1fr))] border-b border-border">
              <div className="px-6 pt-8 pb-6">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80 font-semibold">
                  Сравнение
                </div>
                <div className="mt-2 text-[14px] text-muted-foreground">
                  Возможности по тарифам
                </div>
              </div>
              {PRICING_TIERS.map((t) => {
                const isPro = t.id === "pro";
                const plan = t.id === "free" ? null : getPlan(t.id);
                const perMonth = plan ? getPlanPricePerMonth(plan.id, cycle) : 0;
                return (
                  <div
                    key={t.id}
                    className={
                      "relative px-5 pt-8 pb-6 flex flex-col min-w-0 border-l " +
                      (isPro ? "border-accent/40 border-r" : "border-border")
                    }
                    style={
                      isPro
                        ? {
                            background:
                              "linear-gradient(180deg, color-mix(in oklab, var(--accent) 10%, transparent) 0%, transparent 70%)",
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-[15px] font-semibold text-foreground">{t.name}</span>
                      {isPro && (
                        <span
                          className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap"
                          style={{ background: "var(--gradient-warm)", color: "var(--accent-foreground)" }}
                        >
                          <Crown className="w-3 h-3" strokeWidth={2.5} />
                          Популярный
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[12.5px] text-muted-foreground truncate">{t.tagline}</div>
                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="text-[28px] font-bold tracking-[-0.02em] leading-none">
                        {plan ? formatRub(perMonth) : "0 ₽"}
                      </span>
                      <span className="text-[12px] text-muted-foreground">
                        {plan ? "/ мес" : "навсегда"}
                      </span>
                    </div>
                    <div className="mt-1 min-h-[16px] text-[11.5px] text-muted-foreground">
                      {plan && cycle === "year" ? `${formatRub(perMonth * 12)} сразу` : ""}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison rows */}
            <div className="relative">
              {COMPARE_ROWS.map((row, i) => (
                <div
                  key={row.label}
                  className={
                    "grid grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(0,1fr))] items-center " +
                    (i % 2 === 1 ? "bg-surface-2/25" : "") +
                    (i < COMPARE_ROWS.length - 1 ? " border-b border-border/60" : "")
                  }
                >
                  <div className="px-6 py-4 text-[13.5px] text-foreground/85">{row.label}</div>
                  {PRICING_TIERS.map((t) => {
                    const isPro = t.id === "pro";
                    return (
                      <div
                        key={t.id}
                        className={
                          "px-4 py-4 flex items-center justify-center text-center min-w-0 border-l " +
                          (isPro ? "border-accent/40 border-r" : "border-border")
                        }
                        style={
                          isPro
                            ? { background: "color-mix(in oklab, var(--accent) 4%, transparent)" }
                            : undefined
                        }
                      >
                        <CompareCell
                          value={row.values[t.id]}
                          highlight={isPro && (row.highlight ?? false)}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer row: CTAs */}
            <div className="relative grid grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(0,1fr))] border-t border-border">
              <div className="px-6 py-6" />
              {PRICING_TIERS.map((t) => {
                const isPro = t.id === "pro";
                return (
                  <div
                    key={t.id}
                    className={
                      "px-4 py-6 min-w-0 border-l " +
                      (isPro ? "border-accent/40 border-r" : "border-border")
                    }
                    style={
                      isPro
                        ? { background: "color-mix(in oklab, var(--accent) 4%, transparent)" }
                        : undefined
                    }
                  >
                    <Link
                      to="/signup"
                      className={
                        (isPro ? "btn-primary " : "btn-secondary ") +
                        "w-full inline-flex items-center justify-center gap-2 h-11 rounded-full text-[13.5px] font-semibold px-3"
                      }
                      style={isPro ? { boxShadow: "var(--shadow-warm)" } : undefined}
                    >
                      <span className="truncate">{t.cta}</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top-up credit packs strip */}
        <div className="mt-8 rounded-2xl border border-border bg-card/70 p-5 lg:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="text-[14px] lg:text-[15px] font-semibold text-foreground">
                Кончились кредиты, докупи пакетом без смены тарифа
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {CREDIT_PACKS.map((p) => (
                  <span
                    key={p.credits}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border bg-background text-[12.5px] text-foreground/85"
                  >
                    <span className="font-semibold">{p.credits}</span>
                    <span className="text-muted-foreground">за {p.price} ₽</span>
                  </span>
                ))}
              </div>
            </div>
            <Link
              to="/signup"
              className="btn-secondary inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-[13.5px] font-semibold whitespace-nowrap"
            >
              <Plus className="w-4 h-4" strokeWidth={2.4} />
              Докупить кредиты
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}


const MODEL_LOGOS: { name: string; mark: React.ReactNode }[] = [
  {
    name: "OpenAI GPT",
    mark: (
      <span className="inline-flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
          <path d="M22.28 9.84a5.43 5.43 0 0 0-.47-4.45 5.49 5.49 0 0 0-5.92-2.63 5.49 5.49 0 0 0-9.31 1.99 5.49 5.49 0 0 0-3.67 2.66 5.5 5.5 0 0 0 .68 6.44 5.43 5.43 0 0 0 .47 4.45 5.49 5.49 0 0 0 5.92 2.63 5.49 5.49 0 0 0 9.31-1.99 5.49 5.49 0 0 0 3.67-2.66 5.5 5.5 0 0 0-.68-6.44ZM13.26 20.6a4.07 4.07 0 0 1-2.61-.94l.13-.07 4.33-2.5a.7.7 0 0 0 .36-.62v-6.1l1.83 1.06v5.06a4.07 4.07 0 0 1-4.04 4.11Zm-8.73-3.73a4.07 4.07 0 0 1-.49-2.74l.13.08 4.33 2.5a.71.71 0 0 0 .71 0l5.29-3.05v2.11l-4.39 2.53a4.08 4.08 0 0 1-5.58-1.43Zm-1.14-9.46a4.06 4.06 0 0 1 2.13-1.79v5.15a.7.7 0 0 0 .35.62l5.27 3.04-1.83 1.06-4.39-2.53a4.08 4.08 0 0 1-1.53-5.55Zm15.05 3.5L13.17 7.85l1.83-1.05 4.39 2.53a4.08 4.08 0 0 1-.62 7.39v-5.15a.7.7 0 0 0-.33-.66Zm1.82-2.73-.13-.08-4.32-2.51a.71.71 0 0 0-.72 0L9.81 8.65V6.54l4.39-2.53a4.08 4.08 0 0 1 6.06 4.22ZM8.81 11.18l-1.83-1.06V5.06a4.08 4.08 0 0 1 6.69-3.14l-.13.07L9.21 4.5a.7.7 0 0 0-.36.62Zm1-2.14L12.17 7.6l2.36 1.36v2.72l-2.36 1.36-2.36-1.36Z"/>
        </svg>
        <span>OpenAI</span>
      </span>
    ),
  },
  { name: "Anthropic Claude", mark: <span className="font-serif italic tracking-tight">Claude</span> },
  { name: "Google Gemini", mark: (
      <span className="inline-flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
          <path d="M12 0c.85 5.39 5.61 10.15 12 12-6.39 1.85-11.15 6.61-12 12-.85-5.39-5.61-10.15-12-12C6.39 10.15 11.15 5.39 12 0Z"/>
        </svg>
        <span>Gemini</span>
      </span>
    ) },
  { name: "Nano Banana", mark: <span>Nano Banana</span> },
  { name: "Veo", mark: <span className="font-bold tracking-[0.02em]">Veo</span> },
  { name: "Kling", mark: <span className="tracking-[0.04em]">KLING</span> },
  { name: "Midjourney", mark: (
      <span className="inline-flex items-center gap-2">
        <svg viewBox="0 0 32 24" className="w-6 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M3 21c1-9 4-15 9-18 1 7 1 12 0 18M14 21c1-8 4-13 9-16 1 6 1 11 0 16"/>
        </svg>
        <span>Midjourney</span>
      </span>
    ) },
  { name: "Flux", mark: <span className="font-semibold tracking-[0.08em]">FLUX</span> },
  { name: "ElevenLabs", mark: (
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex items-end gap-[2px] h-4">
          <span className="w-[3px] h-2 bg-current rounded-sm" />
          <span className="w-[3px] h-4 bg-current rounded-sm" />
        </span>
        <span>ElevenLabs</span>
      </span>
    ) },
];

function ModelsShowcase() {
  const items = [...MODEL_LOGOS, ...MODEL_LOGOS];
  return (
    <section
      id="models"
      className="relative border-t border-border overflow-hidden"
      aria-label="Работает на лучших AI-моделях"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-8 sm:py-10">
        <div className="text-center">
          <div className="text-[10.5px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground/80 font-medium">
            Работает на лучших AI-моделях
          </div>
        </div>

        <div
          className="neeklo-marquee relative mt-5 overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
          }}
        >
          <ul
            role="list"
            className="neeklo-marquee-track flex items-center gap-10 sm:gap-14 w-max"
          >
            {items.map((logo, i) => (
              <li
                key={`${logo.name}-${i}`}
                aria-label={logo.name}
                className="shrink-0 inline-flex items-center text-[15px] sm:text-[16px] font-medium text-foreground/55 hover:text-foreground/90 transition-colors h-7"
              >
                {logo.mark}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}




const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Сколько стоит и есть ли бесплатный старт?",
    a: "Регистрация бесплатная: 3 медиа-генерации, черновик сайта и тест ассистента сразу после входа. Дополнительно, ежедневный бонус кредитов. Платные тарифы начинаются с минимального пакета и видны на странице «Цены».",
  },
  {
    q: "Нужна ли карта для регистрации?",
    a: "Нет. Карта не нужна, чтобы попробовать. Оплату подключаешь только когда хочешь увеличить лимиты или опубликовать на своём домене.",
  },
  {
    q: "Какие данные нужны, чтобы собрать сайт?",
    a: "Достаточно ссылки на старый сайт, короткого описания или пары фото. neeklo сам подберёт структуру, тексты и обложки, ты только подтверждаешь.",
  },
  {
    q: "Работает ли ассистент с Avito, Telegram и WhatsApp?",
    a: "Да. Ассистент подключается к Avito, Telegram и WhatsApp, ловит сообщения, отвечает по базе знаний и передаёт горячего лида в CRM.",
  },
  {
    q: "Откуда берётся контент для видео?",
    a: "Из твоего фото, текста или ссылки. AI-аватары и голоса нарезают до 200 вертикальных роликов и публикуют по расписанию.",
  },
  {
    q: "Можно ли подключить свой домен?",
    a: "Да, на платном тарифе. Привязываешь домен в пару кликов, DNS правим сами, SSL подключается автоматически.",
  },
  {
    q: "Как считаются кредиты?",
    a: "Каждое действие (генерация фото, видео, текста сайта, ответ ассистента) стоит определённое количество кредитов. Текущий баланс и расход видны в шапке студии и в разделе «Использование».",
  },
  {
    q: "Можно ли отменить подписку?",
    a: "Да, в любой момент. Отмена не сжигает уже оплаченные кредиты, ими пользуешься до конца оплаченного периода.",
  },
];

function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-t border-border">
      <div className="mx-auto max-w-4xl px-5 lg:px-8 py-16 lg:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-[11.5px] uppercase tracking-[0.12em] text-accent font-semibold">FAQ</div>
          <h2 className="mt-3 text-[28px] sm:text-[36px] lg:text-[44px] font-bold tracking-[-0.02em] leading-[1.08]">
            {nbsp("Частые вопросы")}
          </h2>
          <p className="mt-4 text-[15px] lg:text-[16px] text-muted-foreground">
            {nbsp("Если ответа нет, напиши в Telegram, отвечаем лично.")}
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-4 text-left px-5 lg:px-7 py-4 lg:py-5 hover:bg-surface-2/40 transition-colors"
                >
                  <span className="flex-1 text-[15px] lg:text-[16.5px] font-medium tracking-tight">
                    {nbsp(item.q)}
                  </span>
                  <span
                    className="shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center"
                    style={{ background: isOpen ? "var(--gradient-warm-soft)" : "transparent" }}
                  >
                    {isOpen ? (
                      <Minus className="w-4 h-4 text-accent" strokeWidth={2} />
                    ) : (
                      <Plus className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                    )}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 lg:px-7 pb-5 lg:pb-6 -mt-1">
                    <p className="text-[14px] lg:text-[15px] text-muted-foreground leading-[1.6] max-w-3xl">
                      {nbsp(item.a)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProofStrip() {
  const items: { icon: LucideIcon; label: string }[] = [
    { icon: Code2, label: "Без кода" },
    { icon: Link2, label: "Свой домен" },
    { icon: Search, label: "SEO из коробки" },
    { icon: Server, label: "Публикация на наших серверах" },
    { icon: ShieldOff, label: "Без водяного знака на платных" },
    { icon: Wallet, label: "Оплата в рублях" },
  ];

  return (
    <section aria-label="Преимущества" className="border-t border-border bg-surface-1/40">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-5 lg:py-6">
        {/* Mobile: horizontal swipe row */}
        <ul
          className="flex sm:hidden gap-x-5 gap-y-2 overflow-x-auto no-scrollbar -mx-5 px-5 snap-x"
        >
          {items.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="shrink-0 snap-start inline-flex items-center gap-2 text-[12.5px] text-muted-foreground"
            >
              <Icon className="w-3.5 h-3.5 text-foreground/70 shrink-0" strokeWidth={1.8} />
              <span className="whitespace-nowrap">{label}</span>
            </li>
          ))}
        </ul>

        {/* Tablet+ : flex row, wraps to two lines if needed */}
        <ul className="hidden sm:flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5 lg:gap-x-10">
          {items.map(({ icon: Icon, label }, i) => (
            <li key={label} className="inline-flex items-center gap-2.5 text-[13px] text-muted-foreground">
              <Icon className="w-4 h-4 text-foreground/70 shrink-0" strokeWidth={1.7} />
              <span>{label}</span>
              {i < items.length - 1 && (
                <span aria-hidden className="hidden lg:inline-block w-1 h-1 rounded-full bg-border-strong/70 ml-3" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}


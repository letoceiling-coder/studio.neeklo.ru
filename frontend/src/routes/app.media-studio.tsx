import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Film,
  Sparkles,
  Eraser,
  ArrowRight,
  Image as ImageIcon,
  Play,
  BookOpen,
  Plus,
  Megaphone,
  Maximize2,
  FileArchive,
  Repeat,
} from "lucide-react";
import { useMediaList } from "@/lib/media-store";
import p1 from "@/assets/preset-1.jpg";
import p2 from "@/assets/preset-2.jpg";
import p3 from "@/assets/preset-3.jpg";
import p4 from "@/assets/preset-4.jpg";

export const Route = createFileRoute("/app/media-studio")({
  head: () => ({
    meta: [
      { title: "Медиа-студия, Neeklo" },
      {
        name: "description",
        content:
          "Обзор медиа-пространства: быстрый старт, популярные пресеты, недавние результаты и подсказки.",
      },
    ],
  }),
  component: MediaOverview,
});

const QUICK = [
  {
    to: "/app/studio/video",
    title: "Сделать видео из фото",
    desc: "Оживите снимок коротким роликом",
    icon: Film,
  },
  {
    to: "/app/studio/image",
    title: "Создать рекламный креатив",
    desc: "Цепляющая картинка под пост или таргет",
    icon: Megaphone,
  },
  {
    to: "/app/studio/enhancer",
    title: "Улучшить качество фото",
    desc: "Апскейл, чистка артефактов, до 4K",
    icon: Sparkles,
  },
  {
    to: "/app/tools/remove-bg",
    title: "Удалить фон",
    desc: "Чистый вырез объекта",
    icon: Eraser,
  },
  {
    to: "/app/tools/upscale",
    title: "Сжать файл",
    desc: "Меньше веса без потери качества",
    icon: FileArchive,
  },
  {
    to: "/app/factory",
    title: "20 Reels из одного сценария",
    desc: "Серия вертикалок пакетом",
    icon: Repeat,
  },
] as const;

const PRESETS = [
  { id: "1", cover: p1, title: "Neon Dance", meta: "Reels · 9:16" },
  { id: "2", cover: p2, title: "Unbox Drop", meta: "Reels · 9:16" },
  { id: "3", cover: p3, title: "Avatar Glow", meta: "Shorts · 9:16" },
  { id: "4", cover: p4, title: "Pastel Flat", meta: "Carousel · 4:5" },
];

const HOW = [
  { n: "1", t: "Опишите идею", d: "Текст, картинка-референс или пресет, что угодно." },
  { n: "2", t: "Выберите студию", d: "Фото, видео, энхансер, аватары, под вашу задачу." },
  { n: "3", t: "Получите результат", d: "Сохраните в Медиатеку, поделитесь или сделайте новую вариацию." },
];

function MediaOverview() {
  const { items } = useMediaList();
  const recent = items.slice(0, 6);

  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-10">
      {/* Header */}
      <header className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
          Пространство
        </div>
        <h1 className="text-[26px] sm:text-[32px] lg:text-[40px] font-semibold tracking-tight leading-[1.1]">
          Медиа-студия
        </h1>
        <p className="text-[14px] sm:text-[15px] text-muted-foreground max-w-2xl">
          Здесь всё для изображений, видео и контента. Сайты и ассистенты, в других
          пространствах.
        </p>
      </header>

      {/* CTA */}
      <section
        className="rounded-2xl border border-accent/30 p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-4"
        style={{ background: "var(--gradient-warm-soft)" }}
      >
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-accent font-semibold mb-1">Создать медиа</div>
          <h2 className="text-[20px] sm:text-[22px] font-semibold leading-tight">
            С чего начнём?
          </h2>
          <p className="text-[13px] text-muted-foreground mt-1.5">
            Откройте фото-студию, самый быстрый путь к первому результату.
          </p>
        </div>
        <Link
          to="/app/studio/image"
          className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl btn-primary text-[14px] font-semibold shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style={{ boxShadow: "var(--shadow-warm)" }}
        >
          <Plus className="w-4 h-4" strokeWidth={2.2} />
          Создать медиа
        </Link>
      </section>

      {/* Quick start */}
      <section>
        <SectionHead title="Быстрый старт" hint="Сценарии в один клик" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.to}
                to={q.to}
                className="group rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-surface-2 transition-colors p-4 flex items-start gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-border"
                  style={{ background: "var(--gradient-warm-soft)" }}
                >
                  <Icon className="w-[18px] h-[18px] text-accent" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold leading-tight">
                    {q.title}
                  </span>
                  <span className="block text-[12.5px] text-muted-foreground mt-0.5">
                    {q.desc}
                  </span>
                </span>
                <ArrowRight
                  className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors mt-1 shrink-0"
                  strokeWidth={1.8}
                />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Popular presets */}
      <section>
        <SectionHead
          title="Популярные пресеты"
          hint="Готовые сценарии завода"
          action={{ to: "/app/factory", label: "Все пресеты" }}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {PRESETS.map((p) => (
            <Link
              key={p.id}
              to="/app/factory"
              className="group rounded-xl overflow-hidden border border-border bg-card hover:border-accent/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <div className="aspect-[3/4] overflow-hidden bg-surface-2">
                <img
                  src={p.cover}
                  alt={p.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <div className="p-3">
                <div className="text-[13px] font-semibold leading-tight truncate">{p.title}</div>
                <div className="text-[11.5px] text-muted-foreground mt-0.5 truncate">{p.meta}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent results */}
      <section>
        <SectionHead
          title="Недавние результаты"
          hint="Из вашей Медиатеки"
          action={{ to: "/app/media", label: "Открыть медиатеку" }}
        />
        {recent.length === 0 ? (
          <EmptyRecent />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {recent.map((m) => (
              <Link
                key={m.id}
                to="/app/media"
                className="group block rounded-xl overflow-hidden border border-border bg-card hover:border-accent/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className={`aspect-square relative bg-gradient-to-br ${m.gradient}`}>
                  {m.src ? (
                    <img
                      src={m.src}
                      alt={m.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/90">
                      {m.kind === "video" ? <Play className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <div className="text-[11.5px] font-medium leading-tight truncate">
                    {m.title}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* How to */}
      <section>
        <SectionHead title="Как пользоваться" hint="Три шага до результата" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {HOW.map((s) => (
            <div key={s.n} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[12.5px] font-bold text-accent border border-accent/30"
                  style={{ background: "var(--gradient-warm-soft)" }}
                >
                  {s.n}
                </span>
                <span className="text-[14px] font-semibold">{s.t}</span>
              </div>
              <p className="text-[13px] text-muted-foreground leading-snug">{s.d}</p>
            </div>
          ))}
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

function EmptyRecent() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
      <div
        className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3 border border-border"
        style={{ background: "var(--gradient-warm-soft)" }}
      >
        <ImageIcon className="w-5 h-5 text-accent" strokeWidth={1.8} />
      </div>
      <h3 className="text-[15px] font-semibold mb-1">Пока пусто</h3>
      <p className="text-[13px] text-muted-foreground max-w-sm mx-auto mb-4">
        Создайте первое изображение или видео, оно появится здесь и в Медиатеке.
      </p>
      <Link
        to="/app/studio/image"
        className="inline-flex items-center gap-2 h-10 px-4 rounded-lg btn-primary text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <BookOpen className="w-4 h-4" strokeWidth={1.9} />
        Создать первый
      </Link>
    </div>
  );
}

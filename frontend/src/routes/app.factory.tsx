import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Wrench } from "lucide-react";
import p1 from "@/assets/preset-1.jpg";
import p2 from "@/assets/preset-2.jpg";
import p3 from "@/assets/preset-3.jpg";
import p4 from "@/assets/preset-4.jpg";
import p5 from "@/assets/preset-5.jpg";
import p6 from "@/assets/preset-6.jpg";


export const Route = createFileRoute("/app/factory")({
  head: () => ({
    meta: [
      { title: "Контент-завод, пресеты" },
      { name: "description", content: "Лента готовых пресетов для коротких видео." },
    ],
  }),
  component: Factory,
});

const filters = ["Все", "Тренды", "Аватары", "Карусели", "Распаковка"];

type Preset = {
  id: string;
  cover: string;
  title: string;
  meta: string;
  badge?: "TREND" | "NEW";
};

const presets: Preset[] = [
  { id: "1", cover: p1, title: "Neon Dance", meta: "Reels · 9:16 · 12 сек", badge: "TREND" },
  { id: "2", cover: p2, title: "Unbox Drop", meta: "Reels · 9:16 · 8 сек", badge: "NEW" },
  { id: "3", cover: p3, title: "Avatar Glow", meta: "Shorts · 9:16 · 10 сек", badge: "TREND" },
  { id: "4", cover: p4, title: "Pastel Flat", meta: "Carousel · 4:5 · 6 кадров" },
  { id: "5", cover: p5, title: "Street Tokyo", meta: "Reels · 9:16 · 15 сек", badge: "NEW" },
  { id: "6", cover: p6, title: "Splash Drink", meta: "Reels · 9:16 · 7 сек" },
];

function Factory() {
  const [active, setActive] = useState("Все");

  return (
    <div className="min-h-dvh bg-background text-foreground flex justify-center">
      <div className="w-full app-screen flex flex-col min-h-dvh px-5 pt-14 app-pad-tab">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg"
                style={{ background: "var(--gradient-warm)", boxShadow: "var(--shadow-warm)" }}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent-foreground)" }} strokeWidth={2.25} />
              </span>
              <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-accent">Витрина пресетов</span>
            </div>
            <h1 className="text-[30px] leading-[1.05] font-bold tracking-[-0.02em]">
              Контент-завод
            </h1>
            <p className="mt-1.5 text-[13.5px] text-muted-foreground max-w-[28ch]">
              Готовые шаблоны видео. Выбери, получи серию роликов.
            </p>
          </div>
          <Link to="/app/tools" className="shrink-0 inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full bg-card border border-border text-muted-foreground hover:border-accent/40 transition-colors">
            <Wrench className="w-3.5 h-3.5" /> Инструменты
          </Link>
        </header>



        <div className="-mx-5 px-5 mb-5 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 w-max">
            {filters.map((f) => {
              const isActive = active === f;
              return (
                <button
                  key={f}
                  onClick={() => setActive(f)}
                  className={[
                    "px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors border",
                    isActive
                      ? "bg-foreground text-background border-transparent"
                      : "bg-card text-muted-foreground border-border hover:text-foreground",
                  ].join(" ")}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        <section className="grid grid-cols-2 gap-3">
          {presets.map((p) => (
            <Link
              key={p.id}
              to="/app/create"
              className="group flex flex-col gap-2"
            >
              <div className="relative overflow-hidden rounded-2xl bg-card aspect-[9/14]">
                <img
                  src={p.cover}
                  alt={p.title}
                  loading="lazy"
                  width={576}
                  height={1024}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {p.badge && (
                  <span
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-gradient-warm"
                    style={{ color: "var(--accent-foreground)" }}
                  >
                    {p.badge}
                  </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
              </div>
              <div className="px-0.5">
                <div className="text-[14px] font-semibold leading-tight">{p.title}</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">{p.meta}</div>
              </div>
            </Link>
          ))}
        </section>

      </div>

      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30">
        <Link
          to="/app/create"
          className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-gradient-warm font-semibold text-[14px]"
          style={{ color: "var(--accent-foreground)", boxShadow: "var(--shadow-warm)" }}
        >
          <Sparkles className="w-4 h-4" />
          Сделать своё
        </Link>
      </div>
    </div>
  );
}


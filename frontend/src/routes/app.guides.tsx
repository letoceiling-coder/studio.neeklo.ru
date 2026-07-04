import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Video,
  Globe,
  Bot,
  Sparkles,
  Image as ImageIcon,
  Plug,
  Coins,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/app/guides")({
  head: () => ({
    meta: [
      { title: "Гайды, neeklo" },
      {
        name: "description",
        content: "Короткие сценарии: как сделать видео, сайт, ассистента и не сжечь кредиты.",
      },
    ],
  }),
  component: GuidesPage,
});

type Guide = {
  id: string;
  title: string;
  desc: string;
  icon: typeof Video;
  steps: string[];
  visual: { kind: "video" | "site" | "assistant" | "prompt" | "photo" | "channel" | "credits" };
  cta: { label: string; to: string };
};

const GUIDES: Guide[] = [
  {
    id: "first-video",
    title: "Как создать первое видео",
    desc: "Из одного фото, готовый ролик за минуту",
    icon: Video,
    steps: [
      "Откройте видео-студию",
      "Загрузите фото или выберите из медиабанка",
      "Опишите движение одной строкой",
      "Нажмите Сгенерировать, ролик ляжет в медиабанк",
    ],
    visual: { kind: "video" },
    cta: { label: "Попробовать сейчас", to: "/app/studio/video" },
  },
  {
    id: "site-from-link",
    title: "Как сделать сайт по ссылке",
    desc: "Вставьте ссылку, получите первый экран",
    icon: Globe,
    steps: [
      "Откройте раздел Сайты",
      "Вставьте ссылку на конкурента или свою страницу",
      "Дождитесь черновика и подправьте тексты",
      "Опубликуйте на поддомене neeklo",
    ],
    visual: { kind: "site" },
    cta: { label: "Попробовать сейчас", to: "/app/sites-studio" },
  },
  {
    id: "create-assistant",
    title: "Как создать ассистента",
    desc: "Ответы 24/7 и заявки прямо в CRM",
    icon: Bot,
    steps: [
      "Выберите сценарий: Avito, заявки или база знаний",
      "Загрузите PDF, ссылку на сайт или прайс",
      "Проверьте в тестовом чате",
      "Подключите канал, лиды поедут в CRM",
    ],
    visual: { kind: "assistant" },
    cta: { label: "Попробовать сейчас", to: "/app/assistants-studio" },
  },
  {
    id: "good-prompt",
    title: "Как написать хороший промпт",
    desc: "Чем точнее запрос, тем меньше попыток",
    icon: Sparkles,
    steps: [
      "Назовите объект и действие",
      "Добавьте стиль и настроение",
      "Укажите формат и ракурс",
      "Добавьте что НЕ нужно через negative",
    ],
    visual: { kind: "prompt" },
    cta: { label: "Открыть фото-студию", to: "/app/studio/image" },
  },
  {
    id: "enhance-photo",
    title: "Как улучшить фото",
    desc: "До 4K, без фона, без шумов",
    icon: ImageIcon,
    steps: [
      "Откройте энхансер",
      "Загрузите фото, увидите слайдер до/после",
      "Выберите режим: качество, фон, композиция",
      "Сохраните результат в медиабанк",
    ],
    visual: { kind: "photo" },
    cta: { label: "Попробовать сейчас", to: "/app/studio/enhancer" },
  },
  {
    id: "connect-channel",
    title: "Как подключить канал",
    desc: "Telegram, Avito, сайт, за пару минут",
    icon: Plug,
    steps: [
      "Откройте ассистента → Каналы",
      "Выберите канал и следуйте подсказкам",
      "Проверьте тестовое сообщение",
      "Включите автоответ",
    ],
    visual: { kind: "channel" },
    cta: { label: "Открыть Ассистенты", to: "/app/assistants-studio" },
  },
  {
    id: "use-credits",
    title: "Как использовать кредиты",
    desc: "Что сколько стоит и где смотреть остаток",
    icon: Coins,
    steps: [
      "Откройте Usage, увидите кольцо кредитов",
      "Тяжёлые модели тратят больше, выбирайте под задачу",
      "Очередь задач показывает текущие списания",
      "Апгрейд тарифа, в Billing",
    ],
    visual: { kind: "credits" },
    cta: { label: "Открыть Usage", to: "/app/usage" },
  },
];

function VisualBlock({ kind }: { kind: Guide["visual"]["kind"] }) {
  const palette: Record<string, string> = {
    video: "from-primary/30 via-primary/10 to-transparent",
    site: "from-blue-500/30 via-blue-500/10 to-transparent",
    assistant: "from-emerald-500/30 via-emerald-500/10 to-transparent",
    prompt: "from-fuchsia-500/30 via-fuchsia-500/10 to-transparent",
    photo: "from-amber-500/30 via-amber-500/10 to-transparent",
    channel: "from-sky-500/30 via-sky-500/10 to-transparent",
    credits: "from-orange-500/30 via-orange-500/10 to-transparent",
  };
  return (
    <div
      className={`relative h-40 w-full overflow-hidden rounded-xl border border-border bg-gradient-to-br ${palette[kind]}`}
    >
      <div className="absolute inset-0 grid grid-cols-6 grid-rows-3 gap-1 p-2 opacity-70">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="rounded bg-foreground/5"
            style={{ opacity: (i % 5) / 6 + 0.2 }}
          />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Sparkles className="h-10 w-10 text-foreground/40" />
      </div>
    </div>
  );
}

function GuidesPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = activeId ? GUIDES.find((g) => g.id === activeId) : null;

  if (active) {
    const Icon = active.icon;
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:py-10">
        <button
          type="button"
          onClick={() => setActiveId(null)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Все гайды
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {active.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{active.desc}</p>
          </div>
        </div>

        <div className="mt-5">
          <VisualBlock kind={active.visual.kind} />
        </div>

        <ol className="mt-6 space-y-2.5">
          {active.steps.map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
            >
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {i + 1}
              </div>
              <span className="text-sm text-foreground">{s}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to={active.cta.to}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {active.cta.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Связано с помощником neeklo
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:py-10">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BookOpen className="h-4 w-4" />
        База знаний
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        Гайды
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Короткие сценарии под результат. У каждого, кнопка действия, чтобы сразу попробовать.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map((g) => {
          const Icon = g.icon;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveId(g.id)}
              className="group flex flex-col items-start rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-accent"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-3 text-base font-semibold text-foreground">{g.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{g.desc}</div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                Открыть гайд
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

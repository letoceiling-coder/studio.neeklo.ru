import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  ShoppingBag,
  Mic,
  Users,
  Film,
  Globe,
  Bot,
  Sparkles,
  Wand2,
  Crown,
  Clock,
  Wallet,
  Frown,
  TrendingUp,
  Megaphone,
  Rocket,
  Image as ImageIcon,
} from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Онбординг, neeklo" },
      { name: "description", content: "5 коротких вопросов, подберём твоё пространство за минуту." },
    ],
  }),
  component: Onboarding,
});

type Option = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  hint?: string;
};

type Step = {
  key: "who" | "first" | "experience" | "pain" | "goal";
  title: string;
  subtitle?: string;
  cols: 1 | 2;
  options: Option[];
};

const steps: Step[] = [
  {
    key: "who",
    title: "Кто вы?",
    subtitle: "Подскажет, какие сценарии показать первыми.",
    cols: 2,
    options: [
      { id: "local", label: "Услуги и локальный бизнес", icon: Briefcase },
      { id: "shop", label: "Товары и магазин", icon: ShoppingBag },
      { id: "expert", label: "Эксперт и блогер", icon: Mic },
      { id: "agency", label: "Агентство и студия", icon: Users },
    ],
  },
  {
    key: "first",
    title: "Что создадим первым?",
    subtitle: "Выбери, с чего хочется начать сегодня.",
    cols: 1,
    options: [
      { id: "content", label: "Контент: фото и видео", icon: Film, hint: "Медиа-студия" },
      { id: "site", label: "Сайт или лендинг", icon: Globe, hint: "AI-сайты" },
      { id: "assistant", label: "Ассистент для заявок", icon: Bot, hint: "AI-ассистенты" },
    ],
  },
  {
    key: "experience",
    title: "Опыт с AI?",
    subtitle: "Поможем не утонуть в кнопках, если ты в начале.",
    cols: 1,
    options: [
      { id: "new", label: "Первый раз, нужны подсказки", icon: Sparkles },
      { id: "some", label: "Пробовал ChatGPT и пару штук", icon: Wand2 },
      { id: "pro", label: "Уверенно, давай настройки", icon: Crown },
    ],
  },
  {
    key: "pain",
    title: "Главная боль?",
    subtitle: "Покажем сценарии, которые её закроют.",
    cols: 2,
    options: [
      { id: "time", label: "Нет времени на контент", icon: Clock },
      { id: "money", label: "Дорого подрядчики", icon: Wallet },
      { id: "leads", label: "Мало заявок", icon: Frown },
      { id: "skills", label: "Не знаю с чего начать", icon: ImageIcon },
    ],
  },
  {
    key: "goal",
    title: "Главная цель на месяц?",
    subtitle: "По ней соберём план в Hub.",
    cols: 1,
    options: [
      { id: "leads", label: "Больше заявок и продаж", icon: TrendingUp },
      { id: "brand", label: "Стабильный контент в соцсетях", icon: Megaphone },
      { id: "launch", label: "Запустить новый продукт", icon: Rocket },
    ],
  },
];

const FIRST_TO_PICK: Record<string, "media" | "sites" | "assistants"> = {
  content: "media",
  site: "sites",
  assistant: "assistants",
};

const PICK_LABEL: Record<"media" | "sites" | "assistants", string> = {
  media: "Медиа-студии",
  sites: "AI-сайтов",
  assistants: "AI-ассистентов",
};

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>(
    () => steps.map(() => null),
  );

  const current = steps[step];
  const selected = answers[step];
  const isLast = step === steps.length - 1;

  const choose = (id: string) => {
    setAnswers((a) => a.map((v, i) => (i === step ? id : v)));
  };

  const persist = (final: (string | null)[]) => {
    if (typeof window === "undefined") return;
    try {
      const payload = Object.fromEntries(
        steps.map((s, i) => [s.key, final[i]]),
      );
      window.localStorage.setItem("neeklo:onboarding", JSON.stringify(payload));
      const firstChoice = final[1];
      const pick = firstChoice ? FIRST_TO_PICK[firstChoice] : null;
      if (pick) {
        window.localStorage.setItem("neeklo:onboarding-pick", pick);
        window.localStorage.setItem(
          "neeklo:onboarding-pick-label",
          PICK_LABEL[pick],
        );
      }
      void import("@/lib/api/profile").then(({ saveOnboarding }) =>
        saveOnboarding(payload).catch(() => {}),
      );
    } catch {
      /* ignore */
    }
  };

  const next = () => {
    if (!selected) return;
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    persist(answers);
    navigate({ to: "/onboarding-done" });
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex justify-center">
      <div className="w-full max-w-md lg:max-w-2xl flex flex-col min-h-dvh mx-auto px-5 pt-10 pb-8">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={back}
            disabled={step === 0}
            aria-label="Назад"
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-card transition-colors disabled:opacity-30"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full overflow-hidden ${
                  i <= step ? "" : "bg-card"
                }`}
              >
                {i <= step && <div className="w-full h-full bg-gradient-warm" />}
              </div>
            ))}
          </div>
          <span className="text-[12px] text-muted-foreground tabular-nums shrink-0">
            {step + 1}/{steps.length}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-[26px] sm:text-[30px] leading-[1.1] font-bold tracking-tight">
          {current.title}
        </h1>
        {current.subtitle && (
          <p className="mt-2 text-[14px] text-muted-foreground">{current.subtitle}</p>
        )}

        {/* Options */}
        <div className={`mt-7 grid gap-3 ${current.cols === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {current.options.map((opt) => {
            const isActive = selected === opt.id;
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => choose(opt.id)}
                className={`relative text-left rounded-2xl bg-card transition-all active:scale-[0.99] ${
                  current.cols === 2
                    ? "p-5 min-h-[140px] flex flex-col justify-between"
                    : "p-5 flex items-center gap-4 min-h-[76px]"
                } ${
                  isActive
                    ? "border-[1.5px] border-accent"
                    : "border border-border/60 hover:border-border-strong"
                }`}
              >
                {isActive && (
                  <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-warm flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-accent-foreground" strokeWidth={3} />
                  </span>
                )}
                <Icon
                  className={`w-6 h-6 ${isActive ? "text-accent" : "text-muted-foreground"}`}
                  strokeWidth={1.75}
                />
                <div className={current.cols === 2 ? "" : "flex-1 min-w-0"}>
                  <div className="text-[15px] sm:text-base font-semibold leading-snug pr-6">
                    {opt.label}
                  </div>
                  {opt.hint && (
                    <div className="text-[12px] text-muted-foreground mt-0.5">{opt.hint}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-auto pt-8">
          <button
            onClick={next}
            disabled={!selected}
            className="w-full h-14 rounded-full bg-gradient-warm text-accent-foreground font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            {isLast ? "В Hub" : "Дальше"}
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="mt-3 text-center text-[12px] text-muted-foreground">
            ~{Math.max(10, (steps.length - step) * 10)} секунд до конца
          </p>
        </div>
      </div>
    </div>
  );
}

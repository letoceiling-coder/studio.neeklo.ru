import { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Sparkles,
  X,
  Globe,
  Video,
  Bot,
  Image as ImageIcon,
  Compass,
  ArrowRight,
  Send,
} from "lucide-react";

type ScenarioId = "site" | "video" | "assistant" | "photo" | "unknown";

type Scenario = {
  id: ScenarioId;
  label: string;
  icon: typeof Globe;
  hint: string;
  cta: string;
  to: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: "site",
    label: "Хочу создать сайт",
    icon: Globe,
    hint: "Соберём первый экран по ссылке, описанию или шаблону. Дальше, редактор и публикация на домене.",
    cta: "Перейти в Сайты",
    to: "/app/sites-studio",
  },
  {
    id: "video",
    label: "Хочу сделать видео",
    icon: Video,
    hint: "Откроем видео-студию: фото → ролик, аватары, голос. Готовый файл сам ляжет в медиабанк.",
    cta: "Перейти в Медиа",
    to: "/app/studio/video",
  },
  {
    id: "assistant",
    label: "Хочу AI-ассистента",
    icon: Bot,
    hint: "Создадим ассистента для Avito, заявок или базы знаний. Подключим каналы и CRM.",
    cta: "Перейти в Ассистенты",
    to: "/app/assistants-studio",
  },
  {
    id: "photo",
    label: "Хочу улучшить фото",
    icon: ImageIcon,
    hint: "Энхансер дотянет качество до 4K, удалит фон и пересоберёт композицию.",
    cta: "Открыть энхансер",
    to: "/app/studio/enhancer",
  },
  {
    id: "unknown",
    label: "Не знаю с чего начать",
    icon: Compass,
    hint: "Покажем подборку готовых шаблонов, сразу видно, что можно сделать за минуту.",
    cta: "Открыть шаблоны",
    to: "/app/templates",
  },
];

export function FloatingHelper() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ScenarioId | null>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Hide on marketing/auth pages so it doesn't crowd the landing
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");

  if (isPublic) return null;

  const scenario = selected ? SCENARIOS.find((s) => s.id === selected) : null;

  return (
    <>
      {/* Bubble button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Помощник neeklo"
          className="fixed bottom-20 right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-primary/40 transition hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:bottom-6"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Помощник neeklo</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 md:inset-auto md:bottom-6 md:right-6 md:w-[380px]">
          <div className="mx-auto max-w-md rounded-t-2xl border border-border bg-card shadow-2xl md:rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Помощник neeklo</div>
                  <div className="text-[11px] text-muted-foreground">Подскажет самый быстрый путь</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSelected(null);
                }}
                aria-label="Закрыть"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
              {/* First bot message */}
              <div className="mb-3 rounded-2xl rounded-tl-sm bg-muted/60 px-3 py-2 text-sm text-foreground">
                Что хотите сделать? Я подскажу самый быстрый путь.
              </div>

              {/* Selected scenario reply */}
              {scenario && (
                <>
                  <div className="mb-2 ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm bg-primary/15 px-3 py-2 text-sm text-foreground">
                    {scenario.label}
                  </div>
                  <div className="mb-3 rounded-2xl rounded-tl-sm bg-muted/60 px-3 py-2 text-sm text-foreground">
                    {scenario.hint}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigate({ to: scenario.to });
                      setOpen(false);
                      setSelected(null);
                    }}
                    className="mb-4 inline-flex w-full items-center justify-between rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {scenario.cta}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* Quick buttons */}
              <div className="space-y-1.5">
                <div className="px-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {scenario ? "Другой сценарий" : "Быстрые сценарии"}
                </div>
                {SCENARIOS.filter((s) => s.id !== selected).map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelected(s.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm text-foreground transition hover:border-primary/40 hover:bg-accent"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="flex-1">{s.label}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    navigate({ to: "/app/guides" });
                    setOpen(false);
                    setSelected(null);
                  }}
                  className="mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-background px-3 py-2.5 text-left text-sm text-foreground transition hover:border-primary/40 hover:bg-accent"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="flex-1">Открыть гайды и базу знаний</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Input (mock) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}
              className="flex items-center gap-2 border-t border-border px-3 py-2.5"
            >
              <input
                type="text"
                placeholder="Опишите задачу…"
                className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="submit"
                aria-label="Отправить"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { tryGenerate } from "@/lib/mock-credits";
import { CreditCost } from "@/components/credit-cost";
import {
  ArrowLeft,
  Check,
  Briefcase,
  LifeBuoy,
  Store,
  GraduationCap,
  UserPlus,
  Users,
  CalendarCheck,
  BookOpen,
  Headphones,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/app/assistant/new")({
  head: () => ({
    meta: [
      { title: "Новый ассистент" },
      { name: "description", content: "Создание AI-ассистента под задачи бизнеса." },
    ],
  }),
  component: AssistantNew,
});

type PresetId = "sales" | "support" | "avito" | "coach";
type ToolId = "lead" | "client" | "meeting" | "kb" | "handoff";

const presets: {
  id: PresetId;
  title: string;
  desc: string;
  icon: LucideIcon;
  prompt: string;
}[] = [
  {
    id: "sales",
    title: "Менеджер по продажам",
    desc: "Квалификация, прайс, запись, лиды",
    icon: Briefcase,
    prompt:
      "Ты, менеджер по продажам. Цель: квалифицировать клиента, ответить по прайсу, записать на встречу и создать лид.",
  },
  {
    id: "support",
    title: "Поддержка",
    desc: "FAQ, статус заказа, эскалация",
    icon: LifeBuoy,
    prompt:
      "Ты, поддержка клиентов. Цель: ответить по FAQ, уточнить статус заказа, эскалировать сложные случаи оператору.",
  },
  {
    id: "avito",
    title: "Avito-специалист",
    desc: "Ответы по объявлениям, торг в рамках правил",
    icon: Store,
    prompt:
      "Ты, специалист по Avito. Цель: отвечать по объявлениям, вести торг в рамках правил, фиксировать контакт.",
  },
  {
    id: "coach",
    title: "Coach для владельца",
    desc: "Анализ переписок и улучшение промптов",
    icon: GraduationCap,
    prompt:
      "Ты, коуч владельца. Цель: анализировать переписки команды, предлагать улучшения промптов и сценариев.",
  },
];

const tools: { id: ToolId; title: string; desc: string; icon: LucideIcon }[] = [
  { id: "lead", title: "Создать лид", desc: "Сохраняет заявку в CRM", icon: UserPlus },
  { id: "client", title: "Создать клиента", desc: "Заводит карточку клиента", icon: Users },
  { id: "meeting", title: "Записать на встречу", desc: "Слот в календаре", icon: CalendarCheck },
  { id: "kb", title: "Поиск в базе знаний", desc: "Отвечает по вашим документам", icon: BookOpen },
  { id: "handoff", title: "Передать оператору", desc: "Эскалация живому человеку", icon: Headphones },
];

function AssistantNew() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [presetId, setPresetId] = useState<PresetId>("sales");
  const [enabled, setEnabled] = useState<Record<ToolId, boolean>>({
    lead: true,
    client: false,
    meeting: true,
    kb: true,
    handoff: false,
  });
  const [extra, setExtra] = useState("");

  const preset = presets.find((p) => p.id === presetId)!;

  const systemPrompt = useMemo(() => {
    const activeTools = tools.filter((t) => enabled[t.id]).map((t) => `- ${t.title}`);
    return [
      `# ${name || "Ассистент"}`,
      ``,
      preset.prompt,
      ``,
      `Доступные инструменты:`,
      activeTools.length ? activeTools.join("\n") : "- (нет)",
      extra.trim() ? `\nДополнительно:\n${extra.trim()}` : "",
    ]
      .join("\n")
      .trim();
  }, [name, preset, enabled, extra]);

  const toggle = (id: ToolId) => setEnabled((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div className="min-h-dvh bg-background text-foreground flex justify-center">
      <div className="w-full app-screen flex flex-col min-h-dvh px-5 pt-14 app-pad-tab">
        <header className="flex items-center gap-3 mb-6">
          <Link
            to="/"
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-card transition-colors"
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </header>

        <h1 className="text-[26px] leading-tight font-bold tracking-tight mb-6">
          Новый ассистент
        </h1>

        {/* Name */}
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Название
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Продажи Avito"
            className="mt-2 w-full h-12 px-4 rounded-2xl bg-card border border-border/60 text-base placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/60 transition-colors"
          />
        </label>

        {/* Presets */}
        <section className="mt-7">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
            Пресет роли
          </div>
          <div className="grid grid-cols-2 gap-3">
            {presets.map((p) => {
              const active = p.id === presetId;
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPresetId(p.id)}
                  className={`relative text-left rounded-2xl bg-card p-4 min-h-[120px] transition-colors ${
                    active
                      ? "border-[1.5px] border-accent"
                      : "border border-border/60 hover:border-border"
                  }`}
                >
                  {active && (
                    <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                      <Check className="w-3 h-3 text-accent-foreground" strokeWidth={3} />
                    </span>
                  )}
                  <Icon className="w-5 h-5 text-accent mb-2.5" />
                  <div className="text-[14px] font-semibold leading-tight">{p.title}</div>
                  <div className="text-[12px] text-muted-foreground mt-1 leading-snug">
                    {p.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Tools */}
        <section className="mt-7">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
            Инструменты
          </div>
          <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
            {tools.map((t) => {
              const on = enabled[t.id];
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <div
                    className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      on ? "bg-accent/15" : "bg-background"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${on ? "text-accent" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium leading-tight">{t.title}</div>
                    <div className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                      {t.desc}
                    </div>
                  </div>
                  <span
                    role="checkbox"
                    aria-checked={on}
                    className={`shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                      on ? "bg-accent border-accent" : "bg-background border-border"
                    }`}
                  >
                    {on && <Check className="w-3.5 h-3.5 text-accent-foreground" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Extra instructions */}
        <section className="mt-7">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
            Дополнительные инструкции
          </div>
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            rows={4}
            placeholder="Особые правила для вашего бизнеса"
            className="w-full p-4 rounded-2xl bg-card border border-border/60 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/60 transition-colors resize-none"
          />
        </section>

        {/* System prompt preview */}
        <section className="mt-7">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
            Предпросмотр system prompt
          </div>
          <pre className="rounded-2xl bg-[#0a0a0c] border border-border/60 p-4 text-[12px] leading-relaxed text-foreground/85 font-mono whitespace-pre-wrap break-words">
            {systemPrompt}
          </pre>
        </section>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
        <div className="w-full app-screen px-5 pb-6 pt-4 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-auto">
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => {
              if (!name.trim()) return;
              if (!tryGenerate()) return;
              navigate({ to: "/app/assistant/$id", params: { id: "demo" } });
            }}
            className="w-full h-14 rounded-full bg-gradient-warm text-accent-foreground font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-50"
          >
            Создать ассистента
            <CreditCost />
          </button>
        </div>
      </div>

    </div>
  );
}

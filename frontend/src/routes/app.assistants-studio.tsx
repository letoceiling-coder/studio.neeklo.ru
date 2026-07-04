import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bot,
  MessageSquare,
  Inbox,
  BookOpen,
  ArrowRight,
  Plus,
  Users,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/app/assistants-studio")({
  head: () => ({
    meta: [
      { title: "AI-ассистенты, Neeklo" },
      {
        name: "description",
        content:
          "Ассистенты для заявок, квалификации лидов и записи клиентов. С RAG и интеграцией в CRM.",
      },
    ],
  }),
  component: AssistantsOverview,
});

const VALUE = [
  {
    title: "Ассистент для Avito",
    desc: "Отвечает в чатах объявления и квалифицирует покупателей",
    icon: MessageSquare,
    to: "/app/assistant/new",
  },
  {
    title: "Ассистент для заявок",
    desc: "Собирает имя, контакт и бюджет, отдаёт в CRM",
    icon: Inbox,
    to: "/app/assistant/new",
  },
  {
    title: "Ассистент по базе знаний",
    desc: "Отвечает по вашим PDF, сайту и документам через RAG",
    icon: BookOpen,
    to: "/app/knowledge/demo",
  },
] as const;

// Пока ассистентов нет, пустое состояние.
const MY_ASSISTANTS: { id: string; name: string; channel: string }[] = [];

function AssistantsOverview() {
  const hasAssistants = MY_ASSISTANTS.length > 0;

  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-10">
      <header className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
          Пространство
        </div>
        <h1 className="text-[26px] sm:text-[32px] lg:text-[40px] font-semibold tracking-tight leading-[1.1]">
          AI-ассистенты
        </h1>
        <p className="text-[14px] sm:text-[15px] text-muted-foreground max-w-2xl">
          Не «чатик», а сотрудник: ловит заявки, квалифицирует лиды и записывает на
          услугу. С RAG и передачей в CRM.
        </p>
      </header>

      {/* Value cards */}
      <section>
        <SectionHead title="Быстрый старт" hint="Сценарии под результат, не под инструмент" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {VALUE.map((v) => {
            const Icon = v.icon;
            return (
              <Link
                key={v.title}
                to={v.to}
                className="group rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-surface-2 transition-colors p-4 flex flex-col gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center border border-border"
                  style={{ background: "var(--gradient-warm-soft)" }}
                >
                  <Icon className="w-[18px] h-[18px] text-accent" strokeWidth={1.8} />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold leading-tight">{v.title}</span>
                  <span className="block text-[12.5px] text-muted-foreground mt-0.5 leading-snug">
                    {v.desc}
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
          <div className="text-[13px] text-accent font-semibold mb-1">Запуск за 5 минут</div>
          <h2 className="text-[20px] sm:text-[22px] font-semibold leading-tight">
            Создать ассистента
          </h2>
          <p className="text-[13px] text-muted-foreground mt-1.5">
            Опишите задачу, AI соберёт сценарий, подключит базу знаний и канал связи.
          </p>
        </div>
        <Link
          to="/app/assistant/new"
          className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl btn-primary text-[14px] font-semibold shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style={{ boxShadow: "var(--shadow-warm)" }}
        >
          <Plus className="w-4 h-4" strokeWidth={2.2} />
          Создать ассистента
        </Link>
      </section>

      {/* My assistants */}
      <section>
        <SectionHead
          title="Мои ассистенты"
          hint={hasAssistants ? "Управление и каналы" : "Пока пусто"}
          action={
            hasAssistants ? { to: "/app/assistant/demo", label: "Открыть демо" } : undefined
          }
        />
        {!hasAssistants ? (
          <EmptyAssistants />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MY_ASSISTANTS.map((a) => (
              <Link
                key={a.id}
                to="/app/assistant/$id"
                params={{ id: a.id }}
                className="rounded-xl border border-border bg-card hover:border-accent/40 transition-colors p-4 block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Bot className="w-4 h-4 text-accent" strokeWidth={1.8} />
                  <span className="text-[14px] font-semibold truncate">{a.name}</span>
                </div>
                <div className="text-[12px] text-muted-foreground truncate">{a.channel}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Flow */}
      <section>
        <SectionHead title="Как работает" hint="База знаний → Сценарий → Каналы → Лиды" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StepCard n="1" title="База знаний" desc="Загрузите PDF, тексты, ссылки" icon={BookOpen} to="/app/knowledge/demo" />
          <StepCard n="2" title="Тест и каналы" desc="Проверьте чат, подключите Telegram, виджет" icon={Zap} to="/app/assistant/demo/connect" />
          <StepCard n="3" title="Лиды в CRM" desc="Заявки прилетают структурированно" icon={Users} to="/app/assistant/demo/leads" />
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

function StepCard({
  n,
  title,
  desc,
  icon: Icon,
  to,
}: {
  n: string;
  title: string;
  desc: string;
  icon: typeof Bot;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-border bg-card hover:border-accent/40 transition-colors p-4 block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[12.5px] font-bold text-accent border border-accent/30"
          style={{ background: "var(--gradient-warm-soft)" }}
        >
          {n}
        </span>
        <Icon
          className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors"
          strokeWidth={1.8}
        />
        <span className="text-[14px] font-semibold ml-auto">{title}</span>
      </div>
      <p className="text-[13px] text-muted-foreground leading-snug">{desc}</p>
    </Link>
  );
}

function EmptyAssistants() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
      <div
        className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3 border border-border"
        style={{ background: "var(--gradient-warm-soft)" }}
      >
        <Bot className="w-5 h-5 text-accent" strokeWidth={1.8} />
      </div>
      <h3 className="text-[15px] font-semibold mb-1">Ассистентов пока нет</h3>
      <p className="text-[13px] text-muted-foreground max-w-sm mx-auto mb-4">
        Создайте первого, он начнёт принимать заявки и квалифицировать лиды.
      </p>
      <Link
        to="/app/assistant/new"
        className="inline-flex items-center gap-2 h-10 px-4 rounded-lg btn-primary text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Plus className="w-4 h-4" strokeWidth={2.1} />
        Создать ассистента
      </Link>
    </div>
  );
}

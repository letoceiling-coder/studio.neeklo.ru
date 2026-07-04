import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, LogOut, Trash2, RefreshCw, Check } from "lucide-react";

export const Route = createFileRoute("/app/assistant/$id")({
  head: () => ({
    meta: [
      { title: "Ассистент, обзор" },
      { name: "description", content: "Настройки AI-ассистента." },
    ],
  }),
  component: AssistantOverview,
});

const TABS: { label: string; to?: string; params?: Record<string, string> }[] = [
  { label: "Обзор" },
  { label: "База знаний", to: "/app/knowledge/$id" },
  { label: "Чат-тест", to: "/app/assistant/$id/chat-test" },
  { label: "Подключение", to: "/app/assistant/$id/connect" },
  { label: "Лиды", to: "/app/assistant/$id/leads" },
];


const MODELS = [
  { id: "haiku-4.5", label: "Claude Haiku 4.5", hint: "быстрая" },
  { id: "sonnet-4.5", label: "Claude Sonnet 4.5", hint: "сбалансированная" },
  { id: "opus-4.1", label: "Claude Opus 4.1", hint: "максимум качества" },
  { id: "gpt-5-mini", label: "GPT-5 mini", hint: "дешёвая" },
];

function AssistantOverview() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>("Обзор");
  const [name, setName] = useState("Продажи Avito");
  const [modelId, setModelId] = useState(MODELS[0].id);
  const [modelOpen, setModelOpen] = useState(false);
  const [desc, setDesc] = useState("Квалифицирует и записывает на встречу");
  const [greeting, setGreeting] = useState("Здравствуйте! Расскажите, что ищете, подберу за минуту.");
  const [system, setSystem] = useState(
    "Ты, менеджер по продажам Avito.\nЦель: квалифицировать клиента, ответить по прайсу, записать на встречу, создать лид."
  );
  const [temp, setTemp] = useState("0.4");
  const [topK, setTopK] = useState("6");
  const [maxTokens, setMaxTokens] = useState("800");

  const model = MODELS.find((m) => m.id === modelId)!;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-5 pt-10 pb-32">
        {/* Breadcrumbs + actions */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground min-w-0">
            <Link to="/" className="hover:text-foreground transition-colors shrink-0">
              Все ассистенты
            </Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <span className="text-foreground truncate">{name || id}</span>
          </nav>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                toast("Вышли из ассистента");
                navigate({ to: "/" });
              }}
              className="h-9 px-3 rounded-full text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-card transition-colors inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Выйти
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Удалить ассистента «" + name + "»? Действие нельзя отменить.")) {
                  toast.success("Ассистент удалён");
                  navigate({ to: "/" });
                }
              }}
              className="h-9 px-3 rounded-full text-[13px] font-medium text-destructive/90 hover:text-destructive hover:bg-destructive/10 transition-colors inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Удалить
            </button>
          </div>
        </div>

        <h1 className="text-[26px] leading-tight font-bold tracking-tight mb-5">{name}</h1>

        {/* Tabs (horizontal scroll on mobile) */}
        <div className="-mx-5 px-5 overflow-x-auto no-scrollbar border-b border-border/60 mb-7">
          <div className="flex gap-1 w-max">
            {TABS.map((t) => {
              const active = t.label === tab;
              const cls = `relative h-10 px-3 text-[13px] font-medium whitespace-nowrap transition-colors ${
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`;
              const inner = (
                <>
                  {t.label}
                  {active && (
                    <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-accent rounded-full" />
                  )}
                </>
              );
              if (t.to) {
                return (
                  <Link
                    key={t.label}
                    to={t.to}
                    params={{ id }}
                    className={cls}
                  >
                    {inner}
                  </Link>
                );
              }
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setTab(t.label)}
                  className={cls}
                >
                  {inner}
                </button>
              );
            })}
          </div>

        </div>

        {tab === "Обзор" ? (
          <div className="flex flex-col gap-5">
            <Field label="Название">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl bg-card border border-border/60 text-base focus:outline-none focus:border-accent/60 transition-colors"
              />
            </Field>

            <Field label="Модель">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setModelOpen((v) => !v)}
                  className="w-full h-12 px-4 rounded-2xl bg-card border border-border/60 text-base flex items-center justify-between hover:border-border transition-colors"
                >
                  <span className="flex items-baseline gap-2 min-w-0">
                    <span className="truncate">{model.label}</span>
                    <span className="text-[12px] text-muted-foreground shrink-0">,  {model.hint}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${modelOpen ? "rotate-180" : ""}`} />
                </button>
                {modelOpen && (
                  <div className="absolute z-10 mt-1.5 left-0 right-0 rounded-2xl bg-card border border-border/60 overflow-hidden shadow-xl">
                    {MODELS.map((m) => {
                      const sel = m.id === modelId;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setModelId(m.id);
                            setModelOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-4 h-12 text-left text-sm hover:bg-background/60 transition-colors"
                        >
                          <span className="flex items-baseline gap-2 min-w-0">
                            <span className="truncate">{m.label}</span>
                            <span className="text-[12px] text-muted-foreground shrink-0">,  {m.hint}</span>
                          </span>
                          {sel && <Check className="w-4 h-4 text-accent shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Field>

            <Field label="Краткое описание">
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl bg-card border border-border/60 text-base focus:outline-none focus:border-accent/60 transition-colors"
              />
            </Field>

            <Field label="Приветствие пользователя">
              <input
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl bg-card border border-border/60 text-base focus:outline-none focus:border-accent/60 transition-colors"
              />
            </Field>

            <Field label="System prompt" hint="Прибавляется к контексту RAG">
              <textarea
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                rows={8}
                className="w-full p-4 rounded-2xl bg-[#0a0a0c] border border-border/60 text-[13px] font-mono leading-relaxed focus:outline-none focus:border-accent/60 transition-colors resize-y"
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Temperature">
                <input
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  inputMode="decimal"
                  className="w-full h-12 px-3 rounded-2xl bg-card border border-border/60 text-base text-center font-mono focus:outline-none focus:border-accent/60 transition-colors"
                />
              </Field>
              <Field label="Top-K чанков">
                <input
                  value={topK}
                  onChange={(e) => setTopK(e.target.value)}
                  inputMode="numeric"
                  className="w-full h-12 px-3 rounded-2xl bg-card border border-border/60 text-base text-center font-mono focus:outline-none focus:border-accent/60 transition-colors"
                />
              </Field>
              <Field label="Max tokens">
                <input
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(e.target.value)}
                  inputMode="numeric"
                  className="w-full h-12 px-3 rounded-2xl bg-card border border-border/60 text-base text-center font-mono focus:outline-none focus:border-accent/60 transition-colors"
                />
              </Field>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border/60 p-8 text-center text-sm text-muted-foreground">
            Раздел «{tab}», скоро
          </div>
        )}
      </div>

      {/* Sticky actions */}
      {tab === "Обзор" && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
          <div className="w-full max-w-3xl px-5 pb-6 pt-4 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-auto">
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => toast.success("Эмбеддинги пересчитаны", { description: "Обновлено 6 чанков" })}
                className="h-12 px-5 rounded-full bg-card border border-border/60 text-sm font-medium hover:border-accent/40 transition-colors inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Пересчитать эмбеддинги
              </button>
              <button
                type="button"
                onClick={() => toast.success("Сохранено", { description: "Ассистент «" + name + "» обновлён" })}
                className="h-12 px-6 rounded-full bg-gradient-warm text-accent-foreground text-sm font-semibold active:scale-[0.99] transition-transform"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground/80">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

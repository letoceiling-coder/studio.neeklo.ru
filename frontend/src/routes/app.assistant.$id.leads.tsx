import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, Search, X, ExternalLink, Send } from "lucide-react";

export const Route = createFileRoute("/app/assistant/$id/leads")({
  head: () => ({
    meta: [{ title: "Лиды ассистента" }],
  }),
  component: LeadsScreen,
});

type Priority = "high" | "med" | "low";
type Channel = "Telegram" | "Avito" | "Виджет" | "API";

type Lead = {
  id: string;
  name: string;
  contact: string;
  channel: Channel;
  priority: Priority;
  message: string;
  date: string;
  transcript: { role: "user" | "assistant"; text: string; time: string }[];
};

const LEADS: Lead[] = [
  {
    id: "l1",
    name: "Игорь М.",
    contact: "+7 921 ··· 14-08",
    channel: "Avito",
    priority: "high",
    message: "Готов брать сегодня, нужна доставка до 18:00",
    date: "27.06 · 14:22",
    transcript: [
      { role: "user", text: "Здравствуйте, объявление актуально?", time: "14:18" },
      { role: "assistant", text: "Да, в наличии. Какой объём и адрес доставки?", time: "14:18" },
      { role: "user", text: "2 штуки, Васильевский остров, до 18 успеете?", time: "14:20" },
      { role: "assistant", text: "Успеваем. Оформляю заявку, менеджер подтвердит за 5 минут.", time: "14:21" },
      { role: "user", text: "Готов брать сегодня, нужна доставка до 18:00", time: "14:22" },
    ],
  },
  {
    id: "l2",
    name: "Алина Р.",
    contact: "@alina_rr",
    channel: "Telegram",
    priority: "high",
    message: "Хочу обсудить тариф Pro для команды из 6 человек",
    date: "27.06 · 13:51",
    transcript: [
      { role: "user", text: "Привет! У вас есть командные тарифы?", time: "13:48" },
      { role: "assistant", text: "Да, Pro подходит для команд от 3 человек. Сколько вас?", time: "13:49" },
      { role: "user", text: "Хочу обсудить тариф Pro для команды из 6 человек", time: "13:51" },
    ],
  },
  {
    id: "l3",
    name: "Дмитрий С.",
    contact: "dmitry@studio.io",
    channel: "Виджет",
    priority: "med",
    message: "Интересует интеграция с amoCRM, есть ли webhook?",
    date: "27.06 · 12:40",
    transcript: [
      { role: "user", text: "Интересует интеграция с amoCRM, есть ли webhook?", time: "12:40" },
      { role: "assistant", text: "Да, webhook отправляется на каждое создание лида. Скинуть доку?", time: "12:40" },
    ],
  },
  {
    id: "l4",
    name: "Сергей П.",
    contact: "+7 916 ··· 02-77",
    channel: "Avito",
    priority: "med",
    message: "Подскажите по цене опт от 50 штук",
    date: "27.06 · 11:12",
    transcript: [
      { role: "user", text: "Подскажите по цене опт от 50 штук", time: "11:12" },
      { role: "assistant", text: "На опт от 50 действует -12%. Передаю менеджеру для расчёта.", time: "11:12" },
    ],
  },
  {
    id: "l5",
    name: "Марина К.",
    contact: "@marina_k",
    channel: "Telegram",
    priority: "low",
    message: "Просто смотрю, спасибо",
    date: "27.06 · 10:48",
    transcript: [
      { role: "user", text: "Просто смотрю, спасибо", time: "10:48" },
      { role: "assistant", text: "Хорошо, буду рядом, если появятся вопросы.", time: "10:48" },
    ],
  },
  {
    id: "l6",
    name: "Никита В.",
    contact: "api · token ···4f2",
    channel: "API",
    priority: "low",
    message: "Тестовый запрос с песочницы",
    date: "26.06 · 22:03",
    transcript: [
      { role: "user", text: "ping", time: "22:03" },
      { role: "assistant", text: "pong", time: "22:03" },
    ],
  },
  {
    id: "l7",
    name: "Ольга Т.",
    contact: "olga.t@mail.ru",
    channel: "Виджет",
    priority: "high",
    message: "Когда сможете запустить сайт? Бюджет в рамках Pro",
    date: "26.06 · 19:30",
    transcript: [
      { role: "user", text: "Когда сможете запустить сайт? Бюджет в рамках Pro", time: "19:30" },
      { role: "assistant", text: "Запустим за 3 минуты после описания. Хотите попробовать сейчас?", time: "19:30" },
    ],
  },
];

const CHANNELS: ("Все" | Channel)[] = ["Все", "Telegram", "Avito", "Виджет", "API"];
const PRIORITIES: { id: "all" | Priority; label: string }[] = [
  { id: "all", label: "Все приоритеты" },
  { id: "high", label: "Высокий" },
  { id: "med", label: "Средний" },
  { id: "low", label: "Низкий" },
];

function LeadsScreen() {
  const { id } = Route.useParams();
  const [channel, setChannel] = useState<"Все" | Channel>("Все");
  const [priority, setPriority] = useState<"all" | Priority>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [exportedIds, setExportedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LEADS.filter((l) => {
      if (channel !== "Все" && l.channel !== channel) return false;
      if (priority !== "all" && l.priority !== priority) return false;
      if (q && !(l.name + " " + l.contact + " " + l.message).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [channel, priority, query]);

  const open = openId ? LEADS.find((l) => l.id === openId) ?? null : null;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-5 pt-10 pb-16">
        <header className="flex items-center gap-3 mb-5">
          <Link
            to="/app/assistant/$id"
            params={{ id }}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-card transition-colors"
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground min-w-0">
            <Link to="/app/assistant/$id" params={{ id }} className="hover:text-foreground transition-colors truncate">
              Продажи Avito
            </Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <span className="text-foreground">Лиды</span>
          </nav>
        </header>

        <h1 className="text-[26px] leading-tight font-bold tracking-tight mb-1">Лиды</h1>
        <p className="text-[13px] text-muted-foreground mb-5">
          Всего {LEADS.length} · отфильтровано {filtered.length}
        </p>

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по имени, контакту, сообщению"
              className="w-full h-11 pl-10 pr-4 rounded-full bg-card border border-border/60 text-[13px] placeholder:text-muted-foreground/70 focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CHANNELS.map((c) => (
              <Pill key={c} active={channel === c} onClick={() => setChannel(c)}>
                {c}
              </Pill>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRIORITIES.map((p) => (
              <Pill key={p.id} active={priority === p.id} onClick={() => setPriority(p.id)}>
                {p.label}
              </Pill>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          {/* Header (sm+) */}
          <div className="hidden md:grid grid-cols-[1.4fr_0.8fr_0.7fr_2.2fr_0.8fr] gap-3 px-4 py-2.5 text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/60 bg-background/40">
            <div>Имя · контакт</div>
            <div>Канал</div>
            <div>Приоритет</div>
            <div>Сообщение</div>
            <div className="text-right tabular-nums">Дата</div>
          </div>

          <ul>
            {filtered.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(l.id)}
                  className={`w-full text-left grid grid-cols-1 md:grid-cols-[1.4fr_0.8fr_0.7fr_2.2fr_0.8fr] gap-1 md:gap-3 px-4 py-3 border-b border-border/40 last:border-b-0 hover:bg-background/40 transition-colors ${
                    openId === l.id ? "bg-background/50" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold truncate">{l.name}</div>
                    <div className="text-[11.5px] text-muted-foreground truncate font-mono">{l.contact}</div>
                  </div>
                  <div className="text-[12.5px] text-muted-foreground md:self-center">
                    <span className="md:hidden text-muted-foreground/60">Канал: </span>
                    {l.channel}
                  </div>
                  <div className="md:self-center">
                    <PriorityBadge p={l.priority} />
                  </div>
                  <div className="text-[12.5px] text-foreground/85 line-clamp-1 md:self-center">{l.message}</div>
                  <div className="text-[11.5px] text-muted-foreground tabular-nums md:text-right md:self-center">
                    {l.date}
                  </div>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">Ничего не найдено</li>
            )}
          </ul>
        </div>
      </div>

      {/* Side panel */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-200"
            onClick={() => setOpenId(null)}
          />
          <aside className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] bg-card border-l border-border/60 z-50 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-start justify-between gap-3 p-5 border-b border-border/60">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <PriorityBadge p={open.priority} />
                  <span className="text-[11.5px] text-muted-foreground">{open.channel}</span>
                </div>
                <h2 className="text-[18px] font-bold truncate">{open.name}</h2>
                <div className="text-[12px] text-muted-foreground font-mono truncate">{open.contact}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-background transition-colors shrink-0"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-3">Переписка</div>
              <div className="flex flex-col gap-2.5">
                {open.transcript.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${
                      m.role === "user"
                        ? "self-start bg-background border border-border/60"
                        : "self-end bg-background/60 border border-border/40"
                    }`}
                  >
                    <div className="text-[13px] leading-snug whitespace-pre-wrap">{m.text}</div>
                    <div className="mt-1 text-[10.5px] text-muted-foreground tabular-nums">
                      {m.role === "user" ? open.name : "Ассистент"} · {m.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-border/60 flex flex-col gap-2">
              {replyOpen && (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Быстрый ответ"
                    className="flex-1 h-11 px-3.5 rounded-full bg-background border border-border/60 text-[13px] placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/50"
                  />
                  <button
                    type="button"
                    disabled={!reply.trim()}
                    onClick={() => {
                      toast.success("Ответ отправлен", { description: open.channel + " · " + open.name });
                      setReply("");
                      setReplyOpen(false);
                    }}
                    className="w-11 h-11 rounded-full bg-gradient-warm text-accent-foreground inline-flex items-center justify-center disabled:opacity-50"
                    aria-label="Отправить"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReplyOpen((v) => !v)}
                  className="h-11 px-4 rounded-full bg-background border border-border/60 text-[13px] font-medium hover:border-border transition-colors"
                >
                  {replyOpen ? "Скрыть" : "Ответить"}
                </button>
                <button
                  type="button"
                  disabled={exportedIds.has(open.id)}
                  onClick={() => {
                    setExportedIds((s) => new Set(s).add(open.id));
                    toast.success("Отправили в CRM", { description: "Лид #" + open.id + " · " + open.name });
                  }}
                  className="flex-1 h-11 rounded-full bg-gradient-warm text-accent-foreground text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-60"
                >
                  {exportedIds.has(open.id) ? "В CRM ✓" : "В CRM"}
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 px-3.5 rounded-full text-[12.5px] font-medium border transition-colors ${
        active
          ? "bg-accent/15 border-accent/50 text-accent"
          : "bg-card border-border/60 text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function PriorityBadge({ p }: { p: Priority }) {
  if (p === "high") {
    return (
      <span className="inline-flex items-center gap-1.5 h-5.5 px-2 py-0.5 rounded-full bg-accent/15 border border-accent/40 text-[10.5px] font-semibold text-accent">
        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
        Высокий
      </span>
    );
  }
  if (p === "med") {
    return (
      <span className="inline-flex items-center gap-1.5 h-5.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/40 text-[10.5px] font-semibold text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Средний
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 h-5.5 px-2 py-0.5 rounded-full bg-background border border-border/60 text-[10.5px] font-semibold text-muted-foreground">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
      Низкий
    </span>
  );
}

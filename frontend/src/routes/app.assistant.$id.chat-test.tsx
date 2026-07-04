import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Send,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { tryGenerate } from "@/lib/mock-credits";
import { getToken } from "@/lib/api/client";
import { CreditCost } from "@/components/credit-cost";

export const Route = createFileRoute("/app/assistant/$id/chat-test")({
  head: () => ({
    meta: [
      { title: "Чат-тест ассистента" },
      { name: "description", content: "Тестовый диалог с ассистентом." },
    ],
  }),
  component: ChatTest,
});

type Msg = { id: string; role: "user" | "assistant"; text: string; streaming?: boolean };

const SEED: Msg[] = [
  {
    id: "1",
    role: "assistant",
    text: "Здравствуйте! Расскажите, что ищете, подберу за минуту.",
  },
  { id: "2", role: "user", text: "Нужен б/у iPhone 13, до 40 000" },
  {
    id: "3",
    role: "assistant",
    text: "Понял. В каком городе и какой объём памяти подойдёт, 128 или 256 ГБ?",
  },
];

const MODELS = [
  { id: "haiku-4.5", label: "Claude Haiku 4.5" },
  { id: "sonnet-4.5", label: "Claude Sonnet 4.5" },
  { id: "gpt-5-mini", label: "GPT-5 mini" },
];

const REPLIES = [
  "Принял. Сейчас проверю по базе и подберу подходящие варианты, уточню наличие и цену в нужном городе.",
  "Понял задачу. По вашему бюджету есть три варианта, пришлю карточки с фото и кратким описанием.",
  "Хорошо, могу записать на встречу или передать менеджеру. Какое время вам удобно, сегодня или завтра?",
  "Уточняю: модель, состояние и комплектация важны? Если да, добавлю фильтр и пришлю топ-5 предложений.",
];

function ChatTest() {
  const { id } = Route.useParams();
  const [paramsOpen, setParamsOpen] = useState(false);
  const [modelId, setModelId] = useState(MODELS[0].id);
  const [streaming, setStreaming] = useState(true);
  const [temp, setTemp] = useState(0.4);

  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    return () => {
      if (streamTimer.current) clearInterval(streamTimer.current);
    };
  }, []);

  const streamReply = (full: string) => {
    const words = full.split(/(\s+)/); // keep spaces
    const replyId = crypto.randomUUID();
    setMessages((m) => [...m, { id: replyId, role: "assistant", text: "", streaming: true }]);
    let i = 0;
    streamTimer.current = setInterval(() => {
      i += 1 + Math.floor(Math.random() * 2);
      const slice = words.slice(0, i).join("");
      setMessages((m) =>
        m.map((msg) => (msg.id === replyId ? { ...msg, text: slice } : msg))
      );
      if (i >= words.length) {
        if (streamTimer.current) clearInterval(streamTimer.current);
        streamTimer.current = null;
        setMessages((m) =>
          m.map((msg) => (msg.id === replyId ? { ...msg, text: full, streaming: false } : msg))
        );
        setBusy(false);
      }
    }, 55);
  };

  const mockReply = () => {
    const full = REPLIES[Math.floor(Math.random() * REPLIES.length)];
    setTimeout(() => {
      setTyping(false);
      if (streaming) {
        streamReply(full);
      } else {
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "assistant", text: full },
        ]);
        setBusy(false);
      }
    }, 700 + Math.random() * 400);
  };

  // Реальный ответ ассистента через бэк: стрим по WS (delta) + финальный текст из ответа /chat.
  const realSend = async (history: Msg[]) => {
    try {
      const [{ ensureAssistant, chatAssistant }, { onRealtime, connectRealtime }] =
        await Promise.all([import("@/lib/api/assistants"), import("@/lib/api/ws")]);
      connectRealtime();
      const sid = await ensureAssistant(id, "Ассистент");
      const replyId = crypto.randomUUID();
      let created = false;
      const off = onRealtime((msg) => {
        if (msg.type === "assistant.message.delta" && msg.assistantId === sid) {
          setTyping(false);
          if (!created) {
            created = true;
            setMessages((m) => [
              ...m,
              { id: replyId, role: "assistant", text: "", streaming: true },
            ]);
          }
          setMessages((m) =>
            m.map((x) => (x.id === replyId ? { ...x, text: x.text + msg.delta } : x)),
          );
        } else if (msg.type === "assistant.message.done" && msg.assistantId === sid) {
          setMessages((m) =>
            m.map((x) => (x.id === replyId ? { ...x, text: msg.text, streaming: false } : x)),
          );
        }
      });
      const payload = history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.text }));
      const res = await chatAssistant(sid, payload);
      off();
      setTyping(false);
      setMessages((m) => {
        if (m.some((x) => x.id === replyId)) {
          return m.map((x) =>
            x.id === replyId ? { ...x, text: res.text, streaming: false } : x,
          );
        }
        return [...m, { id: replyId, role: "assistant", text: res.text }];
      });
      setBusy(false);
    } catch {
      // фолбэк на демо-ответ (например, офлайн или ассистент недоступен)
      mockReply();
    }
  };

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;
    if (!tryGenerate()) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text };
    const history = [...messages, userMsg];
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);
    setTyping(true);
    if (getToken()) {
      void realSend(history);
    } else {
      mockReply();
    }
  };

  const newChat = () => {
    if (streamTimer.current) clearInterval(streamTimer.current);
    streamTimer.current = null;
    setMessages([SEED[0]]);
    setInput("");
    setTyping(false);
    setBusy(false);
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex justify-center">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row min-h-dvh">
        {/* Sidebar params, desktop */}
        <aside className="hidden lg:flex lg:w-72 shrink-0 border-r border-border/60 flex-col gap-5 p-5 pt-10">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Параметры
          </div>
          <ParamControls
            modelId={modelId}
            setModelId={setModelId}
            streaming={streaming}
            setStreaming={setStreaming}
            temp={temp}
            setTemp={setTemp}
          />
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-h-dvh">
          {/* Top bar */}
          <header className="flex items-center gap-3 px-5 pt-10 pb-4">
            <Link
              to="/app/assistant/$id"
              params={{ id }}
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-card transition-colors lg:hidden"
              aria-label="Назад"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground min-w-0 flex-1">
              <span className="truncate">Диалог</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              <span className="text-foreground truncate">Новый чат</span>
            </nav>
            <button
              type="button"
              onClick={() => setParamsOpen((v) => !v)}
              className="lg:hidden h-9 w-9 rounded-full bg-card border border-border/60 flex items-center justify-center"
              aria-label="Параметры"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={newChat}
              className="shrink-0 h-9 px-3.5 rounded-full bg-card border border-border/60 text-[13px] font-medium hover:border-accent/40 transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Новый чат
            </button>
          </header>

          {/* Mobile params sheet */}
          {paramsOpen && (
            <div className="lg:hidden mx-5 mb-3 rounded-2xl bg-card border border-border/60 p-4 flex flex-col gap-4">
              <ParamControls
                modelId={modelId}
                setModelId={setModelId}
                streaming={streaming}
                setStreaming={setStreaming}
                temp={temp}
                setTemp={setTemp}
              />
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-4">
            <div className="flex flex-col gap-3">
              {messages.map((m) => (
                <Bubble key={m.id} role={m.role} text={m.text} streaming={m.streaming} />
              ))}
              {typing && <TypingBubble />}
            </div>
          </div>

          {/* Composer */}
          <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-background/0 px-5 pt-3 pb-6">
            <div className="relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={busy ? "Ассистент отвечает…" : "Введите сообщение"}
                disabled={busy}
                className="w-full h-14 pl-5 pr-16 rounded-full bg-card border border-border/60 text-[15px] placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/60 transition-colors disabled:opacity-70"
              />
              <button
                type="button"
                onClick={send}
                disabled={!input.trim() || busy}
                aria-label="Отправить"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-gradient-warm text-accent-foreground flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-center">
              <CreditCost variant="on-surface" />
              <span className="ml-2 text-[11px] text-muted-foreground">за каждый ответ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ role, text, streaming }: { role: "user" | "assistant"; text: string; streaming?: boolean }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? "bg-[#1f2024] text-foreground rounded-br-md"
            : "bg-card text-foreground/95 border border-border/40 rounded-bl-md"
        }`}
      >
        {text}
        {streaming && (
          <span className="inline-block w-[2px] h-[1em] align-[-2px] ml-0.5 bg-accent animate-pulse" />
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md bg-card border border-border/40 px-4 py-3 inline-flex items-center gap-2">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce" />
        </span>
        <span className="text-[12px] text-muted-foreground">печатает</span>
      </div>
    </div>
  );
}

function ParamControls({
  modelId,
  setModelId,
  streaming,
  setStreaming,
  temp,
  setTemp,
}: {
  modelId: string;
  setModelId: (v: string) => void;
  streaming: boolean;
  setStreaming: (v: boolean) => void;
  temp: number;
  setTemp: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const model = MODELS.find((m) => m.id === modelId)!;
  return (
    <>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          Модель
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full h-11 px-3.5 rounded-xl bg-background border border-border/60 text-sm flex items-center justify-between hover:border-border transition-colors"
          >
            <span className="truncate">{model.label}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="absolute z-10 mt-1.5 left-0 right-0 rounded-xl bg-card border border-border/60 overflow-hidden shadow-xl">
              {MODELS.map((m) => {
                const sel = m.id === modelId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setModelId(m.id);
                      setOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3.5 h-11 text-left text-sm hover:bg-background/60 transition-colors"
                  >
                    <span className="truncate">{m.label}</span>
                    {sel && <Check className="w-4 h-4 text-accent shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-medium">Стриминг ответа</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Печатать по мере генерации</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={streaming}
          onClick={() => setStreaming(!streaming)}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
            streaming ? "bg-accent" : "bg-background border border-border/60"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              streaming ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Температура
          </div>
          <div className="text-[13px] font-mono tabular-nums">{temp.toFixed(2)}</div>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={temp}
          onChange={(e) => setTemp(parseFloat(e.target.value))}
          className="w-full accent-[hsl(var(--accent,18_90%_60%))]"
          style={{ accentColor: "hsl(18 90% 60%)" }}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
          <span>точная</span>
          <span>творческая</span>
        </div>
      </div>
    </>
  );
}

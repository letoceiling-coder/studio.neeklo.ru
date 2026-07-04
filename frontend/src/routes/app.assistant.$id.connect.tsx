import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  Check,
  Code2,
  KeyRound,
  Send,
  ShoppingBag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/app/assistant/$id/connect")({
  head: () => ({
    meta: [
      { title: "Подключение ассистента" },
      { name: "description", content: "Виджет, API, Telegram и Avito." },
    ],
  }),
  component: ConnectScreen,
});

const WIDGET_SNIPPET = `<script async
  src="https://cdn.neeklo.app/widget.js"
  data-assistant="ast_8f3c1b"></script>`;

const API_KEY = "sk_live_8f3c1b2e9a4d6f7c";
const API_ENDPOINT = "https://api.neeklo.app/v1/assistants/ast_8f3c1b/chat";

function ConnectScreen() {
  const { id } = Route.useParams();
  const [tgToken, setTgToken] = useState("");
  const [tgConnected, setTgConnected] = useState(false);
  const [avitoConnected, setAvitoConnected] = useState(false);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-5 pt-10 pb-16">
        {/* Top */}
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
            <span className="text-foreground truncate">Подключение</span>
          </nav>
        </header>

        <h1 className="text-[26px] leading-tight font-bold tracking-tight mb-6">
          Куда подключить
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Widget */}
          <ChannelCard icon={Code2} title="Виджет на сайт" connected>
            <CodeBlock value={WIDGET_SNIPPET} />
          </ChannelCard>

          {/* API */}
          <ChannelCard icon={KeyRound} title="API" connected>
            <div className="flex flex-col gap-2">
              <Labeled label="Endpoint">
                <CodeBlock value={API_ENDPOINT} oneLine />
              </Labeled>
              <Labeled label="API key">
                <CodeBlock value={API_KEY} oneLine masked />
              </Labeled>
            </div>
          </ChannelCard>

          {/* Telegram */}
          <ChannelCard icon={Send} title="Telegram" connected={tgConnected}>
            <div className="flex flex-col gap-2">
              <input
                value={tgToken}
                onChange={(e) => setTgToken(e.target.value)}
                placeholder="Токен бота от @BotFather"
                className="w-full h-11 px-3.5 rounded-xl bg-background border border-border/60 text-[13px] font-mono placeholder:font-sans placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/60 transition-colors"
              />
              <button
                type="button"
                disabled={!tgToken.trim() || tgConnected}
                onClick={() => {
                  setTgConnected(true);
                  toast.success("Telegram подключён", { description: "Бот отвечает в чатах от имени ассистента." });
                }}
                className="h-11 rounded-full bg-gradient-warm text-accent-foreground text-[13px] font-semibold active:scale-[0.99] transition-transform disabled:opacity-50"
              >
                {tgConnected ? "Подключено" : "Подключить"}
              </button>
            </div>
          </ChannelCard>

          {/* Avito */}
          <ChannelCard icon={ShoppingBag} title="Avito" connected={avitoConnected}>
            <div className="flex flex-col gap-2">
              <p className="text-[12px] text-muted-foreground leading-snug">
                Откроем окно Avito, чтобы выдать доступ к перепискам объявлений.
              </p>
              <button
                type="button"
                disabled={avitoConnected}
                onClick={() => {
                  setAvitoConnected(true);
                  toast.success("Avito подключён", { description: "Ассистент отвечает на сообщения объявлений." });
                }}
                className="h-11 rounded-full bg-gradient-warm text-accent-foreground text-[13px] font-semibold active:scale-[0.99] transition-transform disabled:opacity-50"
              >
                {avitoConnected ? "Подключено" : "Подключить аккаунт"}
              </button>
            </div>
          </ChannelCard>
        </div>
      </div>
    </div>
  );
}

function ChannelCard({
  icon: Icon,
  title,
  connected = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  connected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-card border border-border/60 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-background border border-border/60 flex items-center justify-center">
            <Icon className="w-4 h-4 text-accent" />
          </div>
          <div className="text-[14px] font-semibold">{title}</div>
        </div>
        <StatusBadge connected={connected} />
      </div>
      {children}
    </section>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10.5px] font-medium text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Подключено
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-background border border-border/60 text-[10.5px] font-medium text-muted-foreground">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
      Не подключено
    </span>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

function CodeBlock({
  value,
  oneLine = false,
  masked = false,
}: {
  value: string;
  oneLine?: boolean;
  masked?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!masked);

  const display = masked && !revealed ? value.replace(/./g, "•") : value;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="relative rounded-xl bg-[#0a0a0c] border border-border/60 group">
      <pre
        className={`p-3 pr-10 text-[12px] font-mono leading-relaxed text-foreground/90 ${
          oneLine ? "overflow-x-auto whitespace-nowrap" : "whitespace-pre-wrap break-words"
        }`}
      >
        {display}
      </pre>
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
        {masked && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="h-7 px-2 rounded-md text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
          >
            {revealed ? "Скрыть" : "Показать"}
          </button>
        )}
        <button
          type="button"
          onClick={copy}
          aria-label="Копировать"
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

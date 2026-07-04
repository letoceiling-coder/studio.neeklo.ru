import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, ArrowLeft, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/app/community")({
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground flex justify-center">
      <div className="w-full app-screen px-5 pt-14 pb-12">
        <Link to="/app" className="text-[13px] text-muted-foreground inline-flex items-center mb-3 hover:text-foreground">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Хаб
        </Link>
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-surface-2 border border-border">
            <Users className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
          </span>
          <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">Сообщество</span>
        </div>
        <h1 className="text-[30px] leading-[1.05] font-bold tracking-[-0.02em]">Сообщество neeklo</h1>
        <p className="mt-2 text-[14px] text-muted-foreground max-w-[40ch]">
          Чат авторов, разборы кейсов и анонсы новых сценариев.
        </p>

        <div className="mt-6 grid gap-3">
          <a
            href="https://t.me/neeekn"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl bg-card border border-border px-4 py-4 hover:border-accent/40 transition-colors"
          >
            <div>
              <div className="text-[14.5px] font-semibold">Telegram-канал</div>
              <div className="text-[12.5px] text-muted-foreground mt-0.5">Анонсы, апдейты и приёмы</div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
          <a
            href="https://t.me/neeekn"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl bg-card border border-border px-4 py-4 hover:border-accent/40 transition-colors"
          >
            <div>
              <div className="text-[14.5px] font-semibold">Чат авторов</div>
              <div className="text-[12.5px] text-muted-foreground mt-0.5">Делитесь работами и просите фидбек</div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
        </div>
      </div>
    </div>
  );
}

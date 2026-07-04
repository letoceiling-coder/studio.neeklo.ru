import { createFileRoute } from "@tanstack/react-router";
import { ListChecks, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/app/studio/queue")({
  head: () => ({ meta: [{ title: "Очередь задач" }] }),
  component: QueuePage,
});

type Job = {
  id: string;
  title: string;
  type: "Видео" | "Сайт" | "Аватар" | "Голос";
  status: "running" | "queued" | "done" | "failed";
  progress: number;
  eta: string;
};

const JOBS: Job[] = [
  { id: "J-204", title: "Reels: Распаковка iPhone 17", type: "Видео",  status: "running", progress: 62, eta: "~2 мин" },
  { id: "J-203", title: "Сайт для мастера маникюра",   type: "Сайт",   status: "running", progress: 18, eta: "~5 мин" },
  { id: "J-202", title: "Аватар: ведущая Ольга",       type: "Аватар", status: "queued",  progress: 0,  eta: "в очереди" },
  { id: "J-201", title: "Голос: бариста Артём",        type: "Голос",  status: "done",    progress: 100, eta: "готово" },
  { id: "J-200", title: "Reels: ASMR-разбор",          type: "Видео",  status: "done",    progress: 100, eta: "готово" },
  { id: "J-199", title: "Сайт: лендинг курса",         type: "Сайт",   status: "failed",  progress: 40, eta: "ошибка" },
];

function QueuePage() {
  return (
    <main className="min-h-dvh bg-background text-foreground px-5 lg:px-10 pt-8 lg:pt-12 pb-16 app-pad-tab">
      <header className="mb-8 max-w-[1400px]">
        <h1 className="text-[26px] lg:text-[34px] font-bold tracking-tight inline-flex items-center gap-3">
          <ListChecks className="w-7 h-7 text-accent" strokeWidth={1.75} />
          Очередь задач
        </h1>
        <p className="text-[13.5px] lg:text-[15px] text-muted-foreground mt-1.5">
          Что сейчас рендерится и что ждёт своей очереди
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card overflow-hidden max-w-[1400px]">
        <ul className="divide-y divide-border">
          {JOBS.map((j) => (
            <li key={j.id} className="px-5 py-4 grid sm:grid-cols-[1fr_auto] gap-4 items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusIcon status={j.status} />
                  <span className="text-[14.5px] font-medium truncate">{j.title}</span>
                  <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground border border-border rounded-full px-2 py-0.5">
                    {j.type}
                  </span>
                  <span className="text-[11.5px] text-muted-foreground tabular-nums ml-auto sm:ml-0">{j.id}</span>
                </div>
                {j.status === "running" || j.status === "failed" ? (
                  <div className="mt-2.5 h-1.5 rounded-full bg-surface-1 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${j.progress}%`,
                        background: j.status === "failed" ? "color-mix(in oklab, #ef4444 80%, transparent)" : "var(--gradient-warm)",
                      }}
                    />
                  </div>
                ) : null}
              </div>
              <div className="text-[12.5px] text-muted-foreground tabular-nums sm:text-right">{j.eta}</div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

function StatusIcon({ status }: { status: Job["status"] }) {
  if (status === "running") return <Loader2 className="w-4 h-4 text-accent animate-spin" strokeWidth={2} />;
  if (status === "queued") return <Clock className="w-4 h-4 text-muted-foreground" strokeWidth={2} />;
  if (status === "done") return <CheckCircle2 className="w-4 h-4 text-emerald-400" strokeWidth={2} />;
  return <XCircle className="w-4 h-4 text-red-400" strokeWidth={2} />;
}

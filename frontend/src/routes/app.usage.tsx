// /app/usage, прозрачность кредитов и задач.
// Единый счётчик кредитов (useFreeCredits) + очередь генераций (queue-store).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  BarChart3,
  Plus,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Image as ImageIcon,
  Film,
  Globe,
  Bot,
  Wand2,
  Pencil,
  Inbox,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Panel, ToolHeader } from "@/components/studio";
import { useFreeCredits, addFreeCredits } from "@/lib/mock-credits";
import { getPlan, useCurrentPlan, isUnlimited, UNLIMITED, getPlanConcurrency } from "@/lib/plans";
import {
  cancelTask,
  clearFinished,
  getToolBreakdown,
  getUsageHistory,
  retryTask,
  useQueue,
  type QueueTask,
  type TaskKind,
  type TaskStatus,
} from "@/lib/queue-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/usage")({
  head: () => ({
    meta: [
      { title: "Использование, neeklo" },
      { name: "description", content: "Кредиты, очередь генераций и лимиты в одном месте." },
    ],
  }),
  component: UsagePage,
});

const KIND_ICON: Record<TaskKind, typeof ImageIcon> = {
  image: ImageIcon,
  video: Film,
  site: Globe,
  assistant: Bot,
  enhancer: Wand2,
  realtime: Pencil,
};

function UsagePage() {
  const credits = useFreeCredits();
  const planId = useCurrentPlan();
  const plan = getPlan(planId);
  const cap = plan.monthlyCredits;
  const capDisplay = isUnlimited(cap) ? UNLIMITED : cap;
  const used = Math.max(0, capDisplay - credits);
  const pct = isUnlimited(cap) ? 0 : Math.min(100, Math.round((used / cap) * 100));

  const tasks = useQueue();
  const active = tasks.filter((t) => t.status === "queued" || t.status === "rendering");
  const history = useMemo(() => tasks.filter((t) => t.status !== "queued" && t.status !== "rendering"), [tasks]);

  const usageHistory = useMemo(() => getUsageHistory(14), []);
  const breakdown = useMemo(() => getToolBreakdown(), []);
  const totalSpent = breakdown.reduce((s, b) => s + b.credits, 0);

  const onTopUp = () => {
    addFreeCredits(50);
    toast.success("Зачислено 50 кредитов", { description: "Демо-пополнение" });
  };

  return (
    <div className="min-h-dvh w-full px-4 sm:px-6 lg:px-8 py-5 lg:py-7 max-w-[1400px] mx-auto">
      <ToolHeader
        icon={BarChart3}
        title="Использование"
        subtitle="Кредиты, активная очередь и история задач, всё в одном месте"
      />

      <div className="grid gap-4 lg:gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* ─── credits ring ─── */}
        <CreditsRing
          credits={credits}
          used={used}
          cap={capDisplay}
          pct={pct}
          unlimited={isUnlimited(cap)}
          planName={plan.name}
          onTopUp={onTopUp}
        />

        {/* ─── usage chart ─── */}
        <UsageChart points={usageHistory} />
      </div>

      <div className="mt-5 grid gap-4 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        {/* ─── breakdown table ─── */}
        <BreakdownTable rows={breakdown} total={totalSpent} />

        {/* ─── plan limits ─── */}
        <LimitsCard plan={plan.name} active={active} />
      </div>

      {/* ─── queue ─── */}
      <section className="mt-7">
        <header className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-[16px] lg:text-[18px] font-semibold flex items-center gap-2">
              Очередь
              <span className="text-[12px] text-foreground/55 font-normal">
                {active.length} активных · {history.length} в истории
              </span>
            </h2>
            <p className="text-[13px] text-foreground/55 mt-0.5">
              Все запущенные генерации попадают сюда, прогресс, ETA, отмена и повтор.
            </p>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearFinished();
                toast.success("История очищена");
              }}
              className="text-xs text-foreground/55 hover:text-foreground inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Очистить историю
            </button>
          )}
        </header>

        {tasks.length === 0 ? (
          <EmptyQueue />
        ) : (
          <div className="flex flex-col gap-2.5">
            {active.length > 0 && (
              <SectionLabel>Активные</SectionLabel>
            )}
            {active.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}

            {history.length > 0 && (
              <SectionLabel className="mt-3">История</SectionLabel>
            )}
            {history.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── */

function CreditsRing({
  credits,
  used,
  cap,
  pct,
  unlimited,
  planName,
  onTopUp,
}: {
  credits: number;
  used: number;
  cap: number;
  pct: number;
  unlimited: boolean;
  planName: string;
  onTopUp: () => void;
}) {
  const R = 64;
  const C = 2 * Math.PI * R;
  const dash = unlimited ? 0 : (pct / 100) * C;

  return (
    <Panel className="p-5 flex flex-col items-center text-center">
      <div className="relative w-[180px] h-[180px]">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <circle cx="80" cy="80" r={R} fill="none" stroke="color-mix(in oklab, var(--foreground) 10%, transparent)" strokeWidth="10" />
          <circle
            cx="80"
            cy="80"
            r={R}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C}`}
            className="transition-[stroke-dasharray] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wider text-foreground/55">Доступно</span>
          <span className="text-[34px] font-bold tabular-nums leading-none mt-1">{credits}</span>
          <span className="text-[11px] text-foreground/55 mt-1">кредитов</span>
        </div>
      </div>

      <p className="mt-4 text-[13px] text-foreground/65">
        {unlimited ? (
          <>Безлимит на тарифе <span className="text-foreground font-medium">{planName}</span></>
        ) : (
          <>Потрачено <span className="text-foreground font-medium tabular-nums">{used}</span> из {cap} · тариф <span className="text-foreground font-medium">{planName}</span></>
        )}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 w-full">
        <button
          type="button"
          onClick={onTopUp}
          className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-tile bg-accent text-accent-foreground text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Пополнить
        </button>
        <Link
          to="/app/billing"
          className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-tile border border-border text-sm hover:bg-foreground/5"
        >
          Сменить тариф
        </Link>
      </div>
    </Panel>
  );
}

function UsageChart({ points }: { points: ReturnType<typeof getUsageHistory> }) {
  const max = Math.max(...points.map((p) => p.credits), 1);
  const total = points.reduce((s, p) => s + p.credits, 0);
  const avg = Math.round(total / points.length);
  return (
    <Panel className="p-5">
      <header className="flex items-end justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-[15px] font-semibold">Использование за 14 дней</h2>
          <p className="text-xs text-foreground/55 mt-0.5">
            Всего <span className="text-foreground font-medium tabular-nums">{total}</span> кредитов · в среднем {avg}/день
          </p>
        </div>
      </header>
      <div className="h-[180px] flex items-end gap-1.5">
        {points.map((p) => {
          const h = Math.max(4, (p.credits / max) * 100);
          return (
            <div key={p.date} className="flex-1 flex flex-col items-center gap-1.5 group">
              <div className="relative w-full h-full flex items-end">
                <div
                  className="w-full rounded-t-sm transition-all duration-300 group-hover:opacity-100 opacity-90"
                  style={{ height: `${h}%`, background: "var(--gradient-warm)" }}
                />
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums whitespace-nowrap">
                  {p.credits}
                </span>
              </div>
              <span className="text-[9px] text-foreground/45 tabular-nums">{p.label}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function BreakdownTable({ rows, total }: { rows: ReturnType<typeof getToolBreakdown>; total: number }) {
  return (
    <Panel className="p-0 overflow-hidden">
      <header className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Списания по инструментам</h2>
        <span className="text-xs text-foreground/55 tabular-nums">{total} кредитов</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-foreground/50">
              <th className="text-left font-medium px-5 py-2.5">Инструмент</th>
              <th className="text-right font-medium px-3 py-2.5">Запусков</th>
              <th className="text-right font-medium px-3 py-2.5">Ср. время</th>
              <th className="text-right font-medium px-3 py-2.5">Доля</th>
              <th className="text-right font-medium px-5 py-2.5">Кредиты</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const Icon = KIND_ICON[r.kind];
              const share = total > 0 ? Math.round((r.credits / total) * 100) : 0;
              return (
                <tr key={r.tool} className="hover:bg-foreground/[0.02]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-accent/10 text-accent">
                        <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </span>
                      <span className="font-medium">{r.tool}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground/75">{r.runs}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground/65">{r.avgSec}с</td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-16 h-1 rounded-full bg-foreground/10 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${share}%`, background: "var(--gradient-warm)" }} />
                      </div>
                      <span className="text-[11px] tabular-nums text-foreground/55 w-7 text-right">{share}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium">{r.credits}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function LimitsCard({ plan, active }: { plan: string; active: QueueTask[] }) {
  const planId = useCurrentPlan();
  const cap = getPlanConcurrency(planId);
  const imgActive = active.filter((t) => t.kind !== "video").length;
  const vidActive = active.filter((t) => t.kind === "video").length;
  return (
    <Panel className="p-5">
      <h2 className="text-[15px] font-semibold">Лимиты по тарифу</h2>
      <p className="text-xs text-foreground/55 mt-0.5">Параллельные генерации на тарифе {plan}</p>
      <div className="mt-4 flex flex-col gap-3">
        <LimitRow label="Фото · параллельно" used={imgActive} cap={cap.image} icon={ImageIcon} />
        <LimitRow label="Видео · параллельно" used={vidActive} cap={cap.video} icon={Film} />
      </div>
      <p className="mt-4 text-[11.5px] text-foreground/50 leading-relaxed">
        Если активных задач больше лимита, новые встают в очередь и стартуют автоматически.
      </p>
    </Panel>
  );
}

function LimitRow({
  label,
  used,
  cap,
  icon: Icon,
}: {
  label: string;
  used: number;
  cap: number;
  icon: typeof ImageIcon;
}) {
  const pct = Math.min(100, Math.round((used / cap) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-[13px] mb-1.5">
        <span className="inline-flex items-center gap-2 text-foreground/80">
          <Icon className="w-3.5 h-3.5 text-accent" strokeWidth={1.8} />
          {label}
        </span>
        <span className="tabular-nums text-foreground/65">{used} / {cap}</span>
      </div>
      <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: pct >= 100 ? "var(--destructive, #ef4444)" : "var(--gradient-warm)" }}
        />
      </div>
    </div>
  );
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-[11px] uppercase tracking-wider text-foreground/50 px-1", className)}>{children}</h3>
  );
}

/* ──────── task row ──────── */

function TaskRow({ task }: { task: QueueTask }) {
  const Icon = KIND_ICON[task.kind];
  const pct = Math.round(task.progress * 100);

  return (
    <Panel
      className={cn(
        "p-3.5 lg:p-4 flex items-center gap-3.5 transition-colors",
        task.status === "error" && "border-[color:var(--destructive,#ef4444)]/40",
        task.status === "ready" && "opacity-90",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center w-10 h-10 rounded-tile shrink-0",
          task.status === "error" ? "bg-[color:var(--destructive,#ef4444)]/12 text-[color:var(--destructive,#ef4444)]" : "bg-accent/12 text-accent",
        )}
      >
        <Icon className="w-4 h-4" strokeWidth={1.8} />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[13.5px] font-medium truncate">{task.title}</p>
          <StatusPill status={task.status} />
        </div>
        <p className="text-[11.5px] text-foreground/55 mt-0.5 truncate">
          {task.tool} · {task.cost} кр{task.attempt > 1 ? ` · попытка ${task.attempt}` : ""}
        </p>

        {(task.status === "rendering" || task.status === "queued") && (
          <div className="mt-2 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300",
                task.status === "queued" && "animate-pulse",
              )}
              style={{
                width: `${task.status === "queued" ? 6 : Math.max(pct, 2)}%`,
                background: "var(--gradient-warm)",
              }}
            />
          </div>
        )}

        {task.status === "error" && task.error && (
          <p className="mt-1.5 text-[12px] text-[color:var(--destructive,#ef4444)]/90 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 mt-px shrink-0" />
            <span>{task.error}</span>
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {task.status === "rendering" && (
          <span className="text-[11.5px] text-foreground/60 tabular-nums hidden sm:inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> ETA {formatEta(task.etaSec)}
          </span>
        )}
        <TaskActions task={task} />
      </div>
    </Panel>
  );
}

function TaskActions({ task }: { task: QueueTask }) {
  if (task.status === "queued" || task.status === "rendering") {
    return (
      <button
        type="button"
        onClick={() => {
          cancelTask(task.id);
          toast.success("Задача отменена");
        }}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs text-foreground/65 hover:bg-foreground/5 hover:text-foreground"
        title="Отменить"
      >
        <X className="w-3.5 h-3.5" /> Отмена
      </button>
    );
  }
  if (task.status === "error") {
    return (
      <button
        type="button"
        onClick={() => {
          retryTask(task.id);
          toast.success("Перезапуск задачи");
        }}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-accent hover:bg-accent/10"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Повторить
      </button>
    );
  }
  return null;
}

function StatusPill({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    queued: { label: "в очереди", cls: "bg-foreground/10 text-foreground/65", Icon: Clock },
    rendering: { label: "рендер", cls: "bg-accent/15 text-accent", Icon: Loader2 },
    ready: { label: "готово", cls: "bg-[color:var(--success,#22c55e)]/15 text-[color:var(--success,#22c55e)]", Icon: CheckCircle2 },
    error: { label: "ошибка", cls: "bg-[color:var(--destructive,#ef4444)]/15 text-[color:var(--destructive,#ef4444)]", Icon: AlertCircle },
    cancelled: { label: "отменена", cls: "bg-foreground/10 text-foreground/55", Icon: X },
  };
  const v = map[status];
  const I = v.Icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap", v.cls)}>
      <I className={cn("w-2.5 h-2.5", status === "rendering" && "animate-spin")} />
      {v.label}
    </span>
  );
}

function EmptyQueue() {
  return (
    <Panel className="p-10 lg:p-14 flex flex-col items-center text-center">
      <span
        className="inline-flex items-center justify-center w-14 h-14 rounded-tile mb-4"
        style={{ background: "var(--gradient-warm-soft)" }}
      >
        <Inbox className="w-6 h-6 text-accent" />
      </span>
      <h2 className="text-[18px] font-semibold">Очередь пуста</h2>
      <p className="mt-1.5 text-[13.5px] text-foreground/65 max-w-md">
        Запусти любую генерацию, она появится здесь с прогрессом, ETA и кнопкой отмены.
      </p>
      <Link
        to="/app"
        className="mt-5 inline-flex items-center gap-1.5 h-10 px-4 rounded-tile bg-accent text-accent-foreground text-sm font-medium hover:opacity-90"
      >
        Перейти в студию
      </Link>
    </Panel>
  );
}

function formatEta(sec?: number) {
  if (sec === undefined) return ", ";
  if (sec < 60) return `${sec}с`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}м ${s.toString().padStart(2, "0")}с`;
}

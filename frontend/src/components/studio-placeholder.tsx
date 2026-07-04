import { Link } from "@tanstack/react-router";
import { Sparkles, type LucideIcon } from "lucide-react";

export function StudioPlaceholder({
  icon: Icon = Sparkles,
  title,
  description,
  badge = "Скоро",
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background text-foreground px-5 lg:px-10 pt-8 lg:pt-12 pb-16 app-pad-tab">
      <div className="max-w-[1400px]">
        <header className="mb-8">
          <span className="inline-flex items-center h-6 px-2 rounded-full border border-accent/30 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-accent">
            {badge}
          </span>
          <h1 className="mt-3 text-[26px] lg:text-[34px] font-bold tracking-tight flex items-center gap-3">
            <Icon className="w-7 h-7 text-accent" strokeWidth={1.75} />
            {title}
          </h1>
          <p className="mt-1.5 text-[13.5px] lg:text-[15px] text-muted-foreground max-w-[60ch]">
            {description}
          </p>
        </header>

        <div
          className="relative rounded-2xl border border-border bg-card overflow-hidden"
          style={{ minHeight: 420 }}
        >
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--foreground) 18%, transparent) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="relative min-h-[420px] flex items-center justify-center text-center px-6">
            <div>
              <div
                className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--gradient-warm-soft)" }}
              >
                <Icon className="w-6 h-6 text-accent" strokeWidth={1.75} />
              </div>
              <h2 className="mt-5 text-[18px] font-semibold tracking-tight">
                Готовим этот инструмент
              </h2>
              <p className="mt-1.5 text-[13.5px] text-muted-foreground max-w-sm mx-auto">
                Раздел уже в каркасе студии. Скоро здесь появится полноценный сценарий генерации.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <Link
                  to="/app"
                  className="inline-flex items-center h-10 px-4 rounded-lg border border-border bg-card hover:bg-surface-2 text-[13px] font-medium"
                >
                  На главную
                </Link>
                <Link
                  to="/app/factory"
                  className="btn-primary inline-flex items-center h-10 px-4 text-[13px]"
                  style={{ boxShadow: "var(--shadow-warm)" }}
                >
                  Открыть Завод
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

import { Link, useRouterState } from "@tanstack/react-router";
import { Factory, Globe, Bot, User } from "lucide-react";

const tabs = [
  { to: "/app/factory", label: "Завод", icon: Factory, match: ["/app/factory", "/app/create", "/app/tools", "/app/media"] },
  { to: "/app/site", label: "Сайт", icon: Globe, match: ["/app/site", "/app/site-preview", "/app/publish"] },
  { to: "/app/assistant/new", label: "Ассистент", icon: Bot, match: ["/app/assistant", "/app/knowledge"] },
  { to: "/app/profile", label: "Профиль", icon: User, match: ["/app/profile", "/app/billing", "/pricing"] },
] as const;

export function BottomTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      data-test="bottom-tab-bar"
      className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-40 pointer-events-none"
    >
      <div className="bg-surface-2/95 backdrop-blur-xl border border-border-strong rounded-2xl flex items-center justify-around py-2 pointer-events-auto shadow-[0_18px_60px_-20px_rgba(0,0,0,0.7)]">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
          return (
            <Link
              key={t.to}
              to={t.to}
              className="flex flex-col items-center justify-center gap-1 px-3 min-w-[44px] min-h-[44px] rounded-xl transition-colors"
              style={active ? { color: "var(--accent)" } : { color: "var(--muted-foreground)" }}
            >
              <Icon className="w-5 h-5" strokeWidth={1.75} />
              <span className="text-[11px] font-medium">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

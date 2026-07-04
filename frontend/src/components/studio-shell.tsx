import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LayoutGrid,
  FolderKanban,
  Factory,
  Globe,
  Bot,
  Image as ImageIcon,
  Palette,
  Camera,
  Film,
  Wand2,
  Zap,
  Mic2,
  Move3d,
  Boxes,
  Shuffle,
  Banana,
  Eraser,
  FileArchive,
  History,
  ChevronDown,
  BarChart3,
  CreditCard,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Search,

  Sparkles,
  Crown,
  Menu,
  HelpCircle,
  MessageSquare,
  Users,
  BookOpen,
  Plus,
  LayoutTemplate,
  Eye,
  Rocket,
  Link2,
  Inbox,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { GlobalSearch } from "@/components/global-search";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CreditsBadge } from "@/components/credits-badge";
import { useCurrentPlan } from "@/lib/plans";
import { WorkspaceSwitcher, useActiveWorkspace } from "@/components/workspace-switcher";
import type { Workspace } from "@/lib/workspace-map";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  match?: string[];
};

type NavGroup = { label: string; items: NavItem[]; collapsible?: boolean; defaultOpen?: boolean };

const HUB_GROUPS: NavGroup[] = [
  {
    label: "Хаб",
    items: [
      { to: "/app", label: "Главная", icon: LayoutGrid, match: ["/app"] },
      { to: "/app/projects", label: "Проекты", icon: FolderKanban },
    ],
  },
  {
    label: "Аккаунт",
    items: [
      { to: "/app/usage", label: "Использование", icon: BarChart3 },
      { to: "/app/billing", label: "Биллинг и тарифы", icon: CreditCard },
      { to: "/app/settings", label: "Настройки", icon: Settings, match: ["/app/settings", "/app/admin"] },
    ],
  },
];

const MEDIA_GROUPS: NavGroup[] = [
  {
    label: "Медиа",
    items: [
      { to: "/app/media-studio", label: "Обзор", icon: LayoutGrid, match: ["/app/media-studio"] },
      { to: "/app/studio/image", label: "Создать изображение", icon: Camera },
      { to: "/app/studio/video", label: "Создать видео", icon: Film },
      { to: "/app/factory", label: "Контент-пакет", icon: Factory, match: ["/app/factory", "/app/create"] },
      { to: "/app/studio/enhancer", label: "Улучшить качество", icon: Sparkles },
      { to: "/app/tools/remove-bg", label: "Удалить фон", icon: Eraser },
      { to: "/app/tools/upscale", label: "Сжать файл", icon: FileArchive },
      { to: "/app/studio/avatars", label: "Аватары", icon: Users },
      { to: "/app/studio/voices", label: "Голоса", icon: Mic2 },
      { to: "/app/moodboards", label: "Пресеты", icon: Palette },
      { to: "/app/assets", label: "История", icon: History },
      { to: "/app/media", label: "Медиатека", icon: ImageIcon },
    ],
  },
  {
    label: "Про-инструменты",
    collapsible: true,
    defaultOpen: false,
    items: [
      { to: "/app/nodes", label: "Нодовый редактор", icon: Wand2 },
      { to: "/app/studio/realtime", label: "Realtime", icon: Zap },
      { to: "/app/tools/motion", label: "Перенос движения", icon: Move3d },
      { to: "/app/tools/3d", label: "3D-объекты", icon: Boxes },
      { to: "/app/tools/restyle", label: "Рестайл видео", icon: Shuffle },
      { to: "/app/lora", label: "Train LoRA", icon: Banana },
    ],
  },
];

const SITES_GROUPS: NavGroup[] = [
  {
    label: "Сайты",
    items: [
      { to: "/app/sites-studio", label: "Обзор", icon: LayoutGrid, match: ["/app/sites-studio"] },
      { to: "/app/site", label: "Новый сайт", icon: Plus, match: ["/app/site"] },
      { to: "/app/site", label: "Шаблоны", icon: LayoutTemplate },
      { to: "/app/site", label: "Мои сайты", icon: Globe },
      { to: "/app/site", label: "Редактор", icon: Wand2 },
      { to: "/app/site-preview", label: "Предпросмотр", icon: Eye },
      { to: "/app/publish", label: "Публикация", icon: Rocket, match: ["/app/publish"] },
      { to: "/app/publish", label: "Домены", icon: Link2 },
      { to: "/app/publish", label: "Заявки", icon: Inbox },
      { to: "/app/settings", label: "Настройки", icon: Settings },
    ],
  },
];

const ASSISTANTS_GROUPS: NavGroup[] = [
  {
    label: "Ассистенты",
    items: [
      { to: "/app/assistants-studio", label: "Обзор", icon: LayoutGrid, match: ["/app/assistants-studio"] },
      { to: "/app/assistant/new", label: "Новый ассистент", icon: Plus, match: ["/app/assistant/new"] },
      { to: "/app/assistant/demo", label: "Мои ассистенты", icon: Bot },
      { to: "/app/knowledge/demo", label: "База знаний", icon: BookOpen },
      { to: "/app/assistant/demo", label: "Сценарии", icon: Workflow },
      { to: "/app/assistant/demo/chat-test", label: "Тестовый чат", icon: MessageSquare },
      { to: "/app/assistant/demo/connect", label: "Каналы", icon: Zap },
      { to: "/app/assistant/demo/leads", label: "Лиды", icon: Inbox, match: ["/app/assistant/demo/leads"] },
      { to: "/app/assistant/demo/leads", label: "CRM", icon: Users },
      { to: "/app/settings", label: "Настройки", icon: Settings },
    ],
  },
];

const HUB_FOOTER: NavGroup = {
  label: "Хаб",
  items: [
    { to: "/app", label: "На главную Hub", icon: LayoutGrid, match: ["/app"] },
    { to: "/app/usage", label: "Использование", icon: BarChart3 },
    { to: "/app/billing", label: "Биллинг", icon: CreditCard },
  ],
};

function groupsFor(ws: Workspace): NavGroup[] {
  switch (ws) {
    case "media":
      return [...MEDIA_GROUPS, HUB_FOOTER];
    case "sites":
      return [...SITES_GROUPS, HUB_FOOTER];
    case "assistants":
      return [...ASSISTANTS_GROUPS, HUB_FOOTER];
    case "hub":
    case "hidden":
    default:
      return HUB_GROUPS;
  }
}

function isItemActive(pathname: string, item: NavItem): boolean {
  const matchers = item.match ?? [item.to];
  return matchers.some((m) => pathname === m || pathname.startsWith(m + "/"));
}

export function StudioShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const activeWs = useActiveWorkspace();
  const groups = useMemo(() => groupsFor(activeWs), [activeWs]);
  const planId = useCurrentPlan();
  const showUpgrade = planId === "free" || planId === "start";

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sidebarW = collapsed ? "72px" : "248px";

  return (
    <div className="min-h-dvh text-foreground">
      {/* Sidebar (desktop) */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30 flex-col border-r border-border bg-background/85 backdrop-blur-xl transition-[width] duration-200"
        style={{ width: sidebarW }}
      >
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-border shrink-0">
          <BrandLogo variant="mark" height={28} className="shrink-0" />
          {!collapsed && <BrandLogo variant="wordmark" height={20} alt="" />}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {groups.map((g) => (
            <Group key={g.label} group={g} pathname={pathname} collapsed={collapsed} />
          ))}
        </nav>

        {!collapsed && showUpgrade && (
          <div className="px-3 pb-2">
            <Link
              to="/app/billing"
              className="block rounded-xl p-3 border border-accent/30 hover:border-accent/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              style={{ background: "var(--gradient-warm-soft)" }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Crown className="w-4 h-4 text-accent" strokeWidth={1.8} />
                <span className="text-[12.5px] font-semibold">Upgrade</span>
              </div>
              <p className="text-[11.5px] text-muted-foreground leading-snug">
                Безлимит генераций, приоритетная очередь и команды.
              </p>
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="m-2 mt-0 inline-flex items-center justify-center gap-2 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={collapsed ? "Развернуть боковую панель" : "Свернуть боковую панель"}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : (<><PanelLeftClose className="w-4 h-4" /><span>Свернуть</span></>)}
        </button>
      </aside>

      {/* Mobile/tablet nav drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="lg:hidden p-0 w-[280px] sm:w-[320px] bg-background flex flex-col">
          <SheetTitle className="sr-only">Навигация</SheetTitle>
          <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border shrink-0">
            <BrandLogo variant="mark" height={26} className="shrink-0" />
            <BrandLogo variant="wordmark" height={18} alt="" />
          </div>
          <div className="px-3 pt-3">
            <WorkspaceSwitcher />
          </div>
          <nav className="flex-1 overflow-y-auto py-3 px-2">
            {groups.map((g) => (
              <Group key={g.label} group={g} pathname={pathname} collapsed={false} />
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="min-h-dvh flex flex-col">
        <div className="lg:[padding-left:var(--shell-pad)]" style={{ ["--shell-pad" as never]: sidebarW }}>
          {/* Topbar */}
          <header className="sticky top-0 z-20 h-14 lg:h-16 border-b border-border bg-background/85 backdrop-blur-xl flex items-center gap-2 px-2 sm:px-3 lg:px-5">
            {/* Burger (mobile/tablet only) */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Открыть меню"
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-foreground hover:bg-surface-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent shrink-0"
            >
              <Menu className="w-5 h-5" strokeWidth={1.8} />
            </button>

            {/* Workspace switcher, single instance, app-wide */}
            <div className="shrink-0">
              <WorkspaceSwitcher />
            </div>

            {/* Global search */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Открыть поиск (Cmd+K)"
              className="flex-1 min-w-0 inline-flex items-center gap-2 h-10 sm:h-9 px-3 rounded-lg border border-border bg-card hover:bg-surface-2 transition-colors text-[13px] text-muted-foreground max-w-[420px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Search className="w-4 h-4 shrink-0" strokeWidth={1.8} />
              <span className="truncate">Поиск…</span>
              <kbd className="ml-auto hidden md:inline-flex items-center h-5 px-1.5 rounded border border-border text-[10.5px] font-mono text-muted-foreground tabular-nums">
                ⌘K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-1.5 lg:gap-2">
              {/* Daily free credits, single source via useFreeCredits */}
              <CreditsBadge />


              {/* Upgrade plan */}
              {showUpgrade && (
                <Link
                  to="/app/billing"
                  className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg btn-primary text-[12.5px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  style={{ boxShadow: "var(--shadow-warm)" }}
                >
                  <Crown className="w-3.5 h-3.5" strokeWidth={2.2} />
                  Улучшить тариф
                </Link>
              )}

              {/* Help */}
              <button
                type="button"
                onClick={() => toast.message("Помощь", { description: "Документация и поддержка скоро тут." })}
                aria-label="Помощь"
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card hover:bg-surface-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <HelpCircle className="w-4 h-4" strokeWidth={1.8} />
              </button>

              {/* Avatar menu slot, rendered globally by AppShell */}
              <span className="inline-block w-10 h-10" aria-hidden="true" />
            </div>
          </header>

          {/* Page content */}
          {children}
        </div>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function Group({
  group, pathname, collapsed,
}: { group: NavGroup; pathname: string; collapsed: boolean }) {
  const { label, items, collapsible, defaultOpen } = group;
  const hasActive = items.some((i) => isItemActive(pathname, i));
  const [open, setOpen] = useState<boolean>(defaultOpen ?? true);
  const isOpen = collapsible ? (open || hasActive) : true;

  return (
    <div className="mb-4">
      {!collapsed && (
        collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center gap-1.5 px-3 mb-1.5 text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            aria-expanded={isOpen}
          >
            <ChevronDown
              className={`w-3 h-3 transition-transform ${isOpen ? "" : "-rotate-90"}`}
              strokeWidth={2.4}
            />
            <span>{label}</span>
          </button>
        ) : (
          <div className="px-3 mb-1.5 text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">
            {label}
          </div>
        )
      )}
      {(isOpen || collapsed) && (
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = isItemActive(pathname, item);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={[
                    "group flex items-center gap-3 min-h-11 lg:h-10 rounded-lg px-3 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    active
                      ? "bg-gradient-warm-soft text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-2",
                    collapsed ? "justify-center px-0" : "",
                  ].join(" ")}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className="w-[18px] h-[18px] shrink-0"
                    strokeWidth={1.75}
                    style={active ? { color: "var(--accent)" } : undefined}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {active && !collapsed && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CreditRing({ used, total, unlimited }: { used: number; total: number; unlimited?: boolean }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const pct = unlimited ? 1 : Math.min(1, Math.max(0, used / Math.max(1, total)));
  const off = c * (1 - pct);
  return (
    <span className="relative inline-flex items-center justify-center w-7 h-7">
      <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90" aria-hidden="true">
        <circle cx="12" cy="12" r={r} stroke="color-mix(in oklab, var(--foreground) 15%, transparent)" strokeWidth="2.5" fill="none" />
        <circle
          cx="12" cy="12" r={r}
          stroke="var(--accent)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      {unlimited && <span className="absolute text-[8px] font-bold text-accent leading-none">∞</span>}
    </span>
  );
}


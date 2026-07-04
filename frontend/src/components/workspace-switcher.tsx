import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Check, ChevronsUpDown, LayoutGrid, Image as ImageIcon, Globe, Bot, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resolveWorkspace, type Workspace } from "@/lib/workspace-map";

type SpaceMeta = {
  id: Workspace;
  label: string;
  hint: string;
  icon: LucideIcon;
  to: string;
};

export const WORKSPACE_OVERVIEW: Record<Workspace, string> = {
  hub: "/app",
  media: "/app/media-studio",
  sites: "/app/sites-studio",
  assistants: "/app/assistants-studio",
  hidden: "/app",
};

const SPACES: SpaceMeta[] = [
  { id: "hub", label: "Neeklo Hub", hint: "Старт и проекты", icon: LayoutGrid, to: WORKSPACE_OVERVIEW.hub },
  { id: "media", label: "Медиа", hint: "Фото, видео, контент", icon: ImageIcon, to: WORKSPACE_OVERVIEW.media },
  { id: "sites", label: "Сайты", hint: "Лендинги и публикация", icon: Globe, to: WORKSPACE_OVERVIEW.sites },
  { id: "assistants", label: "Ассистенты", hint: "Чат-боты и CRM", icon: Bot, to: WORKSPACE_OVERVIEW.assistants },
];

export function useActiveWorkspace(): Workspace {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const ws = resolveWorkspace(pathname);
  return ws === "hidden" ? "hub" : ws;
}

export function WorkspaceSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const active = useActiveWorkspace();
  const current = SPACES.find((s) => s.id === active) ?? SPACES[0];
  const navigate = useNavigate();
  const ActiveIcon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Активное пространство: ${current.label}. Сменить.`}
        className="inline-flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-lg border border-border bg-card hover:bg-surface-2 transition-colors text-[13px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent max-w-[220px]"
      >
        <span
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ background: "var(--gradient-warm-soft)" }}
        >
          <ActiveIcon className="w-3.5 h-3.5 text-accent" strokeWidth={1.9} />
        </span>
        {!collapsed && <span className="truncate">{current.label}</span>}
        <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-[280px] p-1.5 bg-card border-border">
        <div className="px-2 pt-1.5 pb-1 text-[10.5px] uppercase tracking-[0.1em] font-semibold text-muted-foreground">
          Пространства
        </div>
        {SPACES.map((s) => {
          const Icon = s.icon;
          const isActive = s.id === active;
          return (
            <button
              key={s.id}
              type="button"
              role="menuitem"
              onClick={() => navigate({ to: s.to })}
              className={[
                "w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isActive ? "bg-surface-2" : "hover:bg-surface-2",
              ].join(" ")}
            >
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-border"
                style={{ background: isActive ? "var(--gradient-warm-soft)" : "var(--surface-2, var(--card))" }}
              >
                <Icon
                  className="w-4 h-4"
                  strokeWidth={1.8}
                  style={isActive ? { color: "var(--accent)" } : { color: "var(--muted-foreground)" }}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold truncate">{s.label}</span>
                <span className="block text-[11.5px] text-muted-foreground truncate">{s.hint}</span>
              </span>
              {isActive && <Check className="w-4 h-4 text-accent shrink-0" strokeWidth={2.2} />}
            </button>
          );
        })}
        <div className="mx-2 my-1.5 h-px bg-border" />
        <Link
          to="/app"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <LayoutGrid className="w-3.5 h-3.5" strokeWidth={1.8} />
          Вернуться в Hub
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

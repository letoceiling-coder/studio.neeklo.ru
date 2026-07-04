import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { User, Settings, Users, LogOut, ChevronRight, X } from "lucide-react";
import { getMockUser, mockLogout } from "@/lib/mock-auth";
import { useFreeCredits } from "@/lib/mock-credits";
import { useCurrentPlan, getPlan, isUnlimited } from "@/lib/plans";

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "N";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function AvatarMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getMockUser>>(null);
  const navigate = useNavigate();
  const credits = useFreeCredits();
  const planId = useCurrentPlan();
  const plan = getPlan(planId);

  useEffect(() => {
    setUser(getMockUser());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    // Lock body scroll on mobile sheet
    const prev = document.body.style.overflow;
    if (window.matchMedia("(max-width: 767px)").matches) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const name = user?.name || "Гость";
  const email = user?.email || "";
  const initials = initialsFrom(name);

  // For free plan show real number; for paid show ∞
  const isFree = planId === "free";
  const unlimited = isUnlimited(plan.monthlyCredits);
  const creditsLeft = credits;
  const creditsMax = plan.monthlyCredits;
  const pct = unlimited ? 100 : Math.min(100, Math.max(0, (creditsLeft / Math.max(1, creditsMax)) * 100));

  function close() { setOpen(false); }

  function go(to: string) {
    close();
    navigate({ to });
  }

  function handleLogout() {
    mockLogout();
    close();
    navigate({ to: "/login", replace: true });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Меню профиля"
        onClick={() => setOpen((v) => !v)}
        className="fixed top-3 right-3 z-40 w-10 h-10 rounded-full border border-border bg-card/80 backdrop-blur-md flex items-center justify-center text-[12.5px] font-semibold tracking-tight text-foreground hover:border-accent/50 transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
        style={{ backgroundImage: "var(--gradient-warm-soft)" }}
      >
        <span>{initials}</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/55 md:bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-150"
            onClick={close}
          />

          {/* Mobile bottom sheet */}
          <div className="md:hidden fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-200">
            <MenuPanel
              variant="sheet"
              name={name}
              email={email}
              initials={initials}
              planName={plan.name}
              planId={planId}
              creditsLeft={creditsLeft}
              creditsMax={creditsMax}
              pct={pct}
              isFree={isFree}
              onClose={close}
              onGo={go}
              onLogout={handleLogout}
            />
          </div>

          {/* Desktop dropdown */}
          <div className="hidden md:block fixed top-16 right-3 z-50 w-[300px] animate-in fade-in zoom-in-95 duration-150 origin-top-right">
            <MenuPanel
              variant="popover"
              name={name}
              email={email}
              initials={initials}
              planName={plan.name}
              planId={planId}
              creditsLeft={creditsLeft}
              creditsMax={creditsMax}
              pct={pct}
              isFree={isFree}
              onClose={close}
              onGo={go}
              onLogout={handleLogout}
            />
          </div>
        </>
      )}
    </>
  );
}

function MenuPanel(props: {
  variant: "sheet" | "popover";
  name: string;
  email: string;
  initials: string;
  planName: string;
  planId: string;
  creditsLeft: number;
  creditsMax: number;
  pct: number;
  isFree: boolean;
  onClose: () => void;
  onGo: (to: string) => void;
  onLogout: () => void;
}) {
  const { variant, name, email, initials, planName, planId, creditsLeft, creditsMax, pct, isFree, onClose, onGo, onLogout } = props;
  const isSheet = variant === "sheet";
  const unlimited = isUnlimited(creditsMax);

  return (
    <div
      className={[
        "bg-card border border-border text-foreground overflow-hidden",
        isSheet
          ? "rounded-t-[20px] rounded-b-none pb-[max(env(safe-area-inset-bottom),12px)]"
          : "rounded-2xl shadow-[0_18px_50px_-12px_rgba(0,0,0,0.6)]",
      ].join(" ")}
      style={{ borderRadius: isSheet ? undefined : 16 }}
      role="menu"
    >
      {isSheet && (
        <div className="pt-2.5 pb-1 flex justify-center">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>
      )}

      {/* Header: identity + plan */}
      <div className="px-4 pt-3 pb-3 flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-[13.5px] font-semibold border border-border"
          style={{ backgroundImage: "var(--gradient-warm-soft)" }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-semibold truncate">{name}</div>
          <div className="text-[12px] text-muted-foreground truncate">
            {email || `${planName} Plan`}
          </div>
        </div>
        {isSheet && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="shrink-0 w-8 h-8 rounded-full hover:bg-surface-2 flex items-center justify-center text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Plan badge row */}
      <div className="px-4">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-2 border border-border text-[11px] font-medium text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: isFree ? "var(--muted-foreground)" : "var(--accent)" }} />
          {planName} Plan
        </div>
      </div>

      {/* Credits */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="text-muted-foreground">Кредиты</span>
          <span className="font-semibold text-foreground">
            {unlimited ? "Безлимит" : `${creditsLeft} из ${creditsMax}`}
          </span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${pct}%`, backgroundImage: "var(--gradient-warm)" }}
          />
        </div>
      </div>

      {/* Upgrade CTA */}
      {planId !== "studio" && (
        <div className="px-4 pt-3">
          <button
            type="button"
            onClick={() => onGo("/app/billing")}
            className="w-full flex items-center justify-between rounded-xl border border-accent/40 bg-accent/[0.06] px-3 py-2.5 hover:border-accent/70 transition-colors text-left"
          >
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold">Перейти на Про</div>
              <div className="text-[11.5px] text-muted-foreground">Безлимит видео и CRM</div>
            </div>
            <span
              className="shrink-0 inline-flex items-center h-7 px-2.5 rounded-full text-[11.5px] font-semibold"
              style={{ backgroundImage: "var(--gradient-warm)", color: "var(--accent-foreground)" }}
            >
              Upgrade
            </span>
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="my-3 mx-4 h-px bg-border" />

      {/* Items */}
      <nav className="px-2 pb-2 flex flex-col">
        <MenuItem icon={User} label="Профиль" onClick={() => onGo("/app/profile")} />
        <MenuItem icon={Settings} label="Настройки аккаунта" onClick={() => onGo("/app/admin")} />
      </nav>

      <div className="mx-4 h-px bg-border" />

      <nav className="px-2 pt-2 pb-3 flex flex-col">
        <MenuItem icon={LogOut} label="Выйти" onClick={onLogout} danger />
      </nav>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof User;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={[
        "group flex items-center gap-3 h-10 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors text-left",
        danger
          ? "text-foreground hover:bg-surface-2"
          : "text-foreground hover:bg-surface-2",
      ].join(" ")}
    >
      <span className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.85} />
      </span>
      <span className="flex-1 truncate">{label}</span>
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}



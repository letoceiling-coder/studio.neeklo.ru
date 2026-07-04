import { useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { getMockUser } from "@/lib/mock-auth";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { AvatarMenu } from "@/components/avatar-menu";
import { StudioShell } from "@/components/studio-shell";
import { connectRealtime, onRealtime } from "@/lib/api/ws";
import { hydrateCredits, setServerBalance } from "@/lib/mock-credits";

// Routes that opt out of the shell (own chrome). `/` is the public landing.
const STANDALONE = new Set<string>([
  "/", "/onboarding", "/onboarding-done", "/pricing", "/landing", "/login", "/signup",
]);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const isProtected = pathname.startsWith("/app");

  useEffect(() => {
    if (!isProtected) return;
    if (typeof window === "undefined") return;
    if (!getMockUser()) {
      navigate({ to: "/login", replace: true });
    }
  }, [isProtected, pathname, navigate]);

  // Realtime + актуальный баланс, пока пользователь в защищённой зоне.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isProtected || !getMockUser()) return;
    connectRealtime();
    void hydrateCredits();
    const off = onRealtime((msg) => {
      if (msg.type === "credits.changed") setServerBalance(msg.balance);
    });
    return off;
  }, [isProtected]);

  if (STANDALONE.has(pathname)) {
    return <>{children}</>;
  }

  if (isProtected && typeof window !== "undefined" && !getMockUser()) {
    return null;
  }

  if (isProtected) {
    return (
      <>
        <StudioShell>{children}</StudioShell>
        <AvatarMenu />
        <BottomTabBar />
      </>
    );
  }

  return (
    <>
      {children}
      <BottomTabBar />
    </>
  );
}


import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, ArrowRight, Send, User, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { mockSignup, mockTelegramSignup } from "@/lib/mock-auth";
import { requestTelegramAuth } from "@/lib/api/telegram";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Создать аккаунт, neeklo" },
      { name: "description", content: "Регистрация в neeklo: сайт, ассистент и видео для бизнеса за минуту. 3 бесплатные генерации." },
      { property: "og:title", content: "Создать аккаунт, neeklo" },
      { property: "og:description", content: "3 бесплатные генерации. Без карты." },
      { property: "og:url", content: "/signup" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/signup" }],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<null | "password" | "telegram">(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading("password");
    try {
      await mockSignup({ name, email, password });
      navigate({ to: "/onboarding" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось зарегистрироваться");
      setLoading(null);
    }
  }

  async function telegram() {
    if (loading) return;
    setLoading("telegram");
    try {
      const authData = await requestTelegramAuth();
      await mockTelegramSignup(authData as unknown as Record<string, unknown>);
      navigate({ to: "/onboarding" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Вход через Telegram не удался");
      setLoading(null);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-[26px] sm:text-[30px] font-bold tracking-[-0.02em] leading-[1.1]">Создать аккаунт</h1>
      <p className="mt-1.5 text-[13.5px] text-muted-foreground">Минута на регистрацию, и собираем первый результат.</p>

      <form onSubmit={submit} className="mt-7 space-y-3">
        <Field icon={User} placeholder="Имя" value={name} onChange={setName} autoComplete="name" />
        <Field icon={Mail} placeholder="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
        <Field icon={Lock} placeholder="Пароль" value={password} onChange={setPassword} type="password" autoComplete="new-password" />

        <button
          type="submit"
          disabled={loading !== null}
          className="btn-primary mt-2 inline-flex items-center justify-center gap-2 w-full h-12 text-[14.5px] disabled:opacity-70"
          style={{ boxShadow: "var(--shadow-warm)" }}
        >
          {loading === "password" ? "Создаём…" : "Зарегистрироваться"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <Divider />

      <button
        type="button"
        onClick={telegram}
        disabled={loading !== null}
        className="btn-secondary inline-flex items-center justify-center gap-2 w-full h-12 text-[14.5px] disabled:opacity-70"
      >
        <Send className="w-4 h-4" />
        {loading === "telegram" ? "Открываем Telegram…" : "Войти через Telegram"}
      </button>

      <p className="mt-7 text-center text-[13px] text-muted-foreground">
        Уже есть аккаунт?{" "}
        <Link to="/login" className="text-foreground hover:text-accent transition-colors font-medium">
          Войти
        </Link>
      </p>
    </AuthShell>
  );
}

/* ---------- shared ---------- */

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <header className="px-5 lg:px-8 py-5">
        <Link to="/" className="inline-flex items-center" aria-label="neeklo, на главную">
          <BrandLogo variant="wordmark" height={26} />
        </Link>

      </header>
      <main className="flex-1 flex items-center justify-center px-5 pb-10">
        <div
          className="w-full max-w-[420px] rounded-2xl bg-card border border-border p-7 sm:p-8"
          style={{ boxShadow: "var(--shadow-raised, 0 30px 60px -30px rgba(0,0,0,0.6))" }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

function Field({
  icon: Icon,
  placeholder,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="relative flex items-center">
      <Icon className="absolute left-3.5 w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full h-12 rounded-xl bg-surface-1 border border-border pl-10 pr-3.5 text-[14.5px] outline-none placeholder:text-muted-foreground focus:border-accent/60 focus:ring-2 focus:ring-[color:var(--ring-warm)] transition-shadow"
      />
    </label>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-[11.5px] uppercase tracking-[0.12em] text-muted-foreground/70">
      <span className="h-px flex-1 bg-border" />
      или
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export { AuthShell, Field, Divider };

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Mail, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { mockLogin } from "@/lib/mock-auth";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Войти, neeklo" },
      { name: "description", content: "Войди в neeklo и продолжи запускать сайты, ассистента и видео за минуту." },
      { property: "og:title", content: "Войти, neeklo" },
      { property: "og:description", content: "Возвращайся в свой AI-кабинет neeklo." },
      { property: "og:url", content: "/login" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await mockLogin({ email, password });
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось войти");
      setLoading(false);
    }
  }

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
          <h1 className="text-[26px] sm:text-[30px] font-bold tracking-[-0.02em] leading-[1.1]">С возвращением</h1>
          <p className="mt-1.5 text-[13.5px] text-muted-foreground">Войди, чтобы продолжить.</p>

          <form onSubmit={submit} className="mt-7 space-y-3">
            <FieldRow icon={Mail} placeholder="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
            <FieldRow icon={Lock} placeholder="Пароль" value={password} onChange={setPassword} type="password" autoComplete="current-password" />

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-2 inline-flex items-center justify-center gap-2 w-full h-12 text-[14.5px] disabled:opacity-70"
              style={{ boxShadow: "var(--shadow-warm)" }}
            >
              {loading ? "Входим…" : "Войти"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="mt-7 text-center text-[13px] text-muted-foreground">
            Нет аккаунта?{" "}
            <Link to="/signup" className="text-foreground hover:text-accent transition-colors font-medium">
              Создать
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function FieldRow({
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

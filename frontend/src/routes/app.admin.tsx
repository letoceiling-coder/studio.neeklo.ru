import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RotateCcw, Download, ExternalLink, Check, Play, Trash2, Database, Smartphone, Monitor, Tablet, Send, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import {
  TOKEN_LIST, type ThemeToken,
  loadStoredTokens, saveStoredTokens, applyTokens, hexToRgb, rgbToHex,
} from "@/lib/theme-tokens";
import { ROUTES_MAP } from "@/lib/routes-map";
import {
  generateBundle, loadBundle, saveBundle, type MockBundle,
} from "@/lib/mock-data";
import {
  SCENARIOS, runScenario, type RunResult,
  BREAKPOINTS, ADAPTIVE_CHECKS, runAdaptive, type AdaptiveResult,
} from "@/lib/e2e-scenarios";
import {
  getMetrics, listUsers, updateUser, adjustCredits,
  type AdminMetrics, type AdminUser,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { getHomeRaw, saveHome, uploadHomeImage } from "@/lib/api/home";
import { getCachedUser, refreshMe } from "@/lib/api/session";
import { linkTelegram, unlinkTelegram } from "@/lib/api/telegram";
import {
  mergeHome, type HomeContent, type HomeExample, type HomeSections, type HomeCat,
} from "@/lib/home-content";

export const Route = createFileRoute("/app/admin")({
  head: () => ({ meta: [{ title: "Админ" }] }),
  component: AdminPage,
});

type Tab = "home" | "account" | "platform" | "theme" | "mocks" | "adaptive" | "e2e";

function AdminPage() {
  const [tab, setTab] = useState<Tab>("home");
  // Доступ только суперадминам. SSR/неизвестно -> null (показываем «проверка»),
  // сервер подтверждает роль через /me. Данные в панелях и так защищены RBAC.
  const [allowed, setAllowed] = useState<boolean | null>(() =>
    getCachedUser()?.role === "superadmin" ? true : null,
  );

  useEffect(() => {
    let active = true;
    void refreshMe().then((me) => {
      if (!active) return;
      const role = (me ?? getCachedUser())?.role;
      setAllowed(role === "superadmin");
    });
    return () => {
      active = false;
    };
  }, []);

  if (allowed === null) {
    return (
      <div className="min-h-dvh grid place-items-center text-sm text-muted-foreground">
        Проверка доступа…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-dvh grid place-items-center px-5 text-center">
        <div className="max-w-sm space-y-3">
          <h1 className="text-xl font-bold tracking-tight">Доступ запрещён</h1>
          <p className="text-sm text-muted-foreground">
            Админ-панель доступна только суперадминам.
          </p>
          <Link
            to="/app/profile"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-border text-sm hover:bg-surface-2"
          >
            <ArrowLeft className="w-4 h-4" /> Вернуться
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-5 pt-8 pb-16">
        <header className="flex items-center justify-between mb-6">
          <Link to="/app/profile" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Назад
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Админ-панель</h1>
          <div className="w-12" />
        </header>

        <div className="flex gap-1 mb-6 bg-card border border-border rounded-full p-1 w-fit overflow-x-auto">
          {([
            ["home", "Главная"],
            ["account", "Аккаунт"],
            ["platform", "Платформа"],
            ["theme", "Тема (RGB)"],
            ["mocks", "Моки"],
            ["adaptive", "Адаптив"],
            ["e2e", "E2E"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                tab === id ? "bg-gradient-warm" : "text-muted-foreground"
              }`}
              style={tab === id ? { color: "var(--accent-foreground)" } : undefined}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "home" && <HomePanel />}
        {tab === "account" && <AccountPanel />}
        {tab === "platform" && <PlatformPanel />}
        {tab === "theme" && <ThemePanel />}
        {tab === "mocks" && <MocksPanel />}
        {tab === "adaptive" && <AdaptivePanel />}
        {tab === "e2e" && <E2EPanel />}
      </div>
    </div>
  );
}

/* ───────────────────────── HOME (контент главной /content/home) ───────────────────────── */

const SECTION_LABELS: { key: keyof HomeSections; label: string }[] = [
  { key: "models", label: "Логотипы моделей" },
  { key: "solutions", label: "Решения (3 карточки)" },
  { key: "how", label: "Как это работает" },
  { key: "examples", label: "Примеры" },
  { key: "proof", label: "Преимущества" },
  { key: "pricing", label: "Цены" },
  { key: "faq", label: "FAQ" },
];

const CAT_OPTS: { id: HomeCat; label: string }[] = [
  { id: "sites", label: "Сайт" },
  { id: "videos", label: "Видео" },
  { id: "assistants", label: "Ассистент" },
];

const inputCls = "w-full h-9 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-border-strong";
const areaCls = "w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-border-strong";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Ошибка чтения файла"));
    r.readAsDataURL(file);
  });
}

function HomePanel() {
  const [data, setData] = useState<HomeContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await getHomeRaw();
        setData(mergeHome(raw));
      } catch {
        setData(mergeHome(null));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground">Загрузка…</div>;
  if (!data) return <div className="text-sm text-destructive">Не удалось загрузить контент</div>;

  const d = data;

  const save = async () => {
    setSaving(true);
    try {
      await saveHome(d);
      toast.success("Главная сохранена. Обнови вкладку с сайтом, чтобы увидеть изменения.");
      setDenied(false);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setDenied(true);
        toast.error("Доступ только для суперадмина");
      } else {
        toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
      }
    } finally {
      setSaving(false);
    }
  };

  const setPromo = (p: Partial<HomeContent["promo"]>) =>
    setData((x) => (x ? { ...x, promo: { ...x.promo, ...p } } : x));
  const setHero = (h: Partial<HomeContent["hero"]>) =>
    setData((x) => (x ? { ...x, hero: { ...x.hero, ...h } } : x));
  const toggleSection = (k: keyof HomeSections) =>
    setData((x) => (x ? { ...x, sections: { ...x.sections, [k]: !x.sections[k] } } : x));
  const setExample = (i: number, patch: Partial<HomeExample>) =>
    setData((x) => (x ? { ...x, examples: x.examples.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) } : x));
  const removeExample = (i: number) =>
    setData((x) => (x ? { ...x, examples: x.examples.filter((_, idx) => idx !== i) } : x));
  const addExample = () =>
    setData((x) =>
      x
        ? {
            ...x,
            examples: [
              ...x.examples,
              { id: `ex-${Date.now().toString(36)}`, cat: "sites", tag: "Сайт", title: "Новый пример", meta: "", description: "" },
            ],
          }
        : x,
    );
  const moveExample = (i: number, dir: -1 | 1) =>
    setData((x) => {
      if (!x) return x;
      const j = i + dir;
      if (j < 0 || j >= x.examples.length) return x;
      const arr = [...x.examples];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...x, examples: arr };
    });

  const onUpload = async (i: number, file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      const url = await uploadHomeImage(dataUrl, file.name.replace(/\.[^.]+$/, ""));
      setExample(i, { cover: url });
      toast.success("Фото загружено");
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setDenied(true);
        toast.error("Доступ только для суперадмина");
      } else {
        toast.error(e instanceof Error ? e.message : "Не удалось загрузить фото");
      }
    }
  };

  return (
    <div className="space-y-5">
      {denied && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Раздел доступен только суперадмину. Войди под суперадмином, чтобы сохранять изменения.
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Управление контентом и видом главной страницы сайта.</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setData(mergeHome(null))}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Сбросить
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-gradient-warm text-sm font-semibold disabled:opacity-60"
            style={{ color: "var(--accent-foreground)" }}
          >
            <Check className="w-4 h-4" /> {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>

      {/* PROMO */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Промо-бар (верхняя полоса)</h3>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={d.promo.enabled} onChange={() => setPromo({ enabled: !d.promo.enabled })} />
            Показывать
          </label>
        </div>
        <div className="grid sm:grid-cols-[1fr_180px] gap-3">
          <Field label="Текст">
            <input className={inputCls} value={d.promo.text} onChange={(e) => setPromo({ text: e.target.value })} />
          </Field>
          <Field label="Кнопка">
            <input className={inputCls} value={d.promo.cta} onChange={(e) => setPromo({ cta: e.target.value })} />
          </Field>
        </div>
      </section>

      {/* HERO */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold">Первый экран (Hero)</h3>
        <Field label="Бейдж над заголовком">
          <input className={inputCls} value={d.hero.badge} onChange={(e) => setHero({ badge: e.target.value })} />
        </Field>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Заголовок: начало">
            <input className={inputCls} value={d.hero.titlePrefix} onChange={(e) => setHero({ titlePrefix: e.target.value })} />
          </Field>
          <Field label="Заголовок: акцент (градиент)">
            <input className={inputCls} value={d.hero.titleAccent} onChange={(e) => setHero({ titleAccent: e.target.value })} />
          </Field>
          <Field label="Заголовок: конец">
            <input className={inputCls} value={d.hero.titleSuffix} onChange={(e) => setHero({ titleSuffix: e.target.value })} />
          </Field>
        </div>
        <Field label="Подзаголовок">
          <textarea className={areaCls} rows={2} value={d.hero.subtitle} onChange={(e) => setHero({ subtitle: e.target.value })} />
        </Field>
      </section>

      {/* SECTIONS */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Секции главной (показывать / скрыть)</h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
          {SECTION_LABELS.map(({ key, label }) => (
            <label key={key} className="inline-flex items-center gap-2 text-sm cursor-pointer rounded-lg border border-border px-3 h-10">
              <input type="checkbox" checked={d.sections[key]} onChange={() => toggleSection(key)} />
              {label}
            </label>
          ))}
        </div>
      </section>

      {/* EXAMPLES */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Карточки «Примеры» ({d.examples.length})</h3>
          <button onClick={addExample} className="h-9 px-3 rounded-lg border border-border text-sm hover:text-foreground text-muted-foreground">
            + Добавить
          </button>
        </div>
        <div className="space-y-4">
          {d.examples.map((ex, i) => (
            <div key={ex.id} className="rounded-xl border border-border p-4 grid md:grid-cols-[120px_1fr] gap-4">
              <div className="space-y-2">
                <div className="aspect-[4/5] rounded-lg overflow-hidden border border-border bg-surface-2 flex items-center justify-center">
                  {ex.cover ? (
                    <img src={ex.cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[11px] text-muted-foreground px-2 text-center">дефолтное фото</span>
                  )}
                </div>
                <label className="block">
                  <span className="inline-flex items-center justify-center w-full h-8 px-2 rounded-lg border border-border text-[12px] cursor-pointer hover:text-foreground text-muted-foreground">
                    Загрузить фото
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onUpload(i, f);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                {ex.cover && (
                  <button onClick={() => setExample(i, { cover: undefined })} className="w-full text-[11px] text-muted-foreground hover:text-destructive">
                    сбросить фото
                  </button>
                )}
              </div>
              <div className="space-y-2 min-w-0">
                <div className="grid grid-cols-[1fr_140px] gap-2">
                  <Field label="Заголовок">
                    <input className={inputCls} value={ex.title} onChange={(e) => setExample(i, { title: e.target.value })} />
                  </Field>
                  <Field label="Категория">
                    <select
                      className={inputCls}
                      value={ex.cat}
                      onChange={(e) => setExample(i, { cat: e.target.value as HomeCat })}
                    >
                      {CAT_OPTS.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <Field label="Бейдж (тег)">
                    <input className={inputCls} value={ex.tag} onChange={(e) => setExample(i, { tag: e.target.value })} />
                  </Field>
                  <Field label="Подпись (мета)">
                    <input className={inputCls} value={ex.meta} onChange={(e) => setExample(i, { meta: e.target.value })} />
                  </Field>
                </div>
                <Field label="Описание (в попапе)">
                  <textarea className={areaCls} rows={2} value={ex.description} onChange={(e) => setExample(i, { description: e.target.value })} />
                </Field>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={() => moveExample(i, -1)} disabled={i === 0} className="h-8 px-2 rounded-lg border border-border text-xs disabled:opacity-40">↑</button>
                  <button onClick={() => moveExample(i, 1)} disabled={i === d.examples.length - 1} className="h-8 px-2 rounded-lg border border-border text-xs disabled:opacity-40">↓</button>
                  <button onClick={() => removeExample(i)} className="ml-auto inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" /> Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ───────────────────────── ACCOUNT (привязка Telegram) ───────────────────────── */

function AccountPanel() {
  const [user, setUser] = useState(() => getCachedUser());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void refreshMe().then((u) => {
      if (u) setUser(u);
    });
  }, []);

  const linked = !!user?.telegramId;

  const doLink = async () => {
    setBusy(true);
    try {
      await linkTelegram();
      const u = await refreshMe();
      if (u) setUser(u);
      toast.success("Telegram привязан — теперь доступен быстрый вход");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast.error("Этот Telegram уже привязан к другому аккаунту");
      } else {
        toast.error(e instanceof Error ? e.message : "Не удалось привязать Telegram");
      }
    } finally {
      setBusy(false);
    }
  };

  const doUnlink = async () => {
    setBusy(true);
    try {
      await unlinkTelegram();
      const u = await refreshMe();
      if (u) setUser(u);
      toast.success("Telegram отвязан");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отвязать");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
            style={{ background: "color-mix(in oklab, #229ED9 18%, transparent)", color: "#229ED9" }}
          >
            <Send className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">Быстрый вход через Telegram</h3>
            <p className="mt-1 text-[13px] text-muted-foreground leading-snug">
              Привяжи Telegram к этому аккаунту ({user?.email}), чтобы потом входить в один клик
              через кнопку «Войти через Telegram» — без пароля.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={
                  "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-medium border " +
                  (linked
                    ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
                    : "border-border text-muted-foreground")
                }
              >
                <span className={"w-1.5 h-1.5 rounded-full " + (linked ? "bg-emerald-500" : "bg-muted-foreground/50")} />
                {linked ? `Привязан (ID ${user?.telegramId})` : "Не привязан"}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {!linked ? (
                <button
                  onClick={doLink}
                  disabled={busy}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold disabled:opacity-60"
                  style={{ background: "#229ED9", color: "#fff" }}
                >
                  <Link2 className="w-4 h-4" /> {busy ? "Открываю Telegram…" : "Привязать Telegram"}
                </button>
              ) : (
                <>
                  <button
                    onClick={doLink}
                    disabled={busy}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm hover:bg-surface-2 disabled:opacity-60"
                  >
                    <RotateCcw className="w-4 h-4" /> Перепривязать
                  </button>
                  <button
                    onClick={doUnlink}
                    disabled={busy}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:text-destructive disabled:opacity-60"
                  >
                    <Unlink className="w-4 h-4" /> Отвязать
                  </button>
                </>
              )}
            </div>

            <p className="mt-3 text-[12px] text-muted-foreground/80">
              Подсказка: для работы попапа в BotFather у бота должен быть задан домен{" "}
              <code className="text-foreground/80">studio.neeklo.ru</code> (/setdomain).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ───────────────────────── PLATFORM (реальные /admin/*) ───────────────────────── */

const PLAN_OPTS = ["free", "start", "pro", "studio", "business"] as const;
const ROLE_OPTS = ["user", "admin", "superadmin"] as const;

function PlatformPanel() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async (query = "") => {
    setLoading(true);
    setErr(null);
    try {
      const [m, u] = await Promise.all([getMetrics(), listUsers(query || undefined)]);
      setMetrics(m);
      setUsers(u.items);
      setTotal(u.total);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setDenied(true);
      } else {
        setErr(e instanceof Error ? e.message : "Ошибка загрузки");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchUser = async (id: string, patch: { role?: AdminUser["role"]; planId?: string }) => {
    try {
      const updated = await updateUser(id, patch);
      setUsers((arr) => arr.map((x) => (x.id === id ? { ...x, ...updated } : x)));
      toast.success("Пользователь обновлён");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось обновить");
    }
  };

  const setBalance = async (id: string) => {
    const raw = window.prompt("Новый баланс кредитов:");
    if (raw === null) return;
    const balance = Number(raw);
    if (!Number.isFinite(balance) || balance < 0) {
      toast.error("Некорректное число");
      return;
    }
    try {
      const res = await adjustCredits(id, { balance: Math.round(balance) });
      setUsers((arr) => arr.map((x) => (x.id === id ? { ...x, credits: res.balance } : x)));
      toast.success("Баланс обновлён");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось обновить баланс");
    }
  };

  if (denied) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <h2 className="text-lg font-semibold mb-1">Доступ только суперадминам</h2>
        <p className="text-sm text-muted-foreground">
          Войдите под учётной записью с ролью superadmin, чтобы управлять платформой.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Метрики */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {metrics
          ? [
              ["Пользователи", metrics.totalUsers],
              ["Задачи", metrics.totalJobs],
              ["Сайты", metrics.totalSites],
              ["Лиды", metrics.totalLeads],
              ["Job done", metrics.jobsByStatus["done"] ?? 0],
              ["Job error", metrics.jobsByStatus["error"] ?? metrics.jobsByStatus["failed"] ?? 0],
            ].map(([k, v]) => (
              <div key={k} className="bg-card border border-border rounded-xl px-3 py-2.5">
                <div className="text-xs text-muted-foreground">{k}</div>
                <div className="text-lg font-bold font-mono">{v}</div>
              </div>
            ))
          : Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl px-3 py-2.5 animate-pulse h-[58px]" />
            ))}
      </div>

      {/* Пользователи */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Пользователи {total > 0 && <span className="text-foreground">· {total}</span>}
          </h2>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load(q)}
              placeholder="Поиск по email/имени"
              className="h-9 px-3 rounded-lg bg-muted border border-border text-sm outline-none focus:border-accent w-48"
            />
            <button onClick={() => load(q)} className="h-9 px-3 rounded-lg bg-gradient-warm text-sm font-semibold" style={{ color: "var(--accent-foreground)" }}>
              Найти
            </button>
          </div>
        </div>

        {err && <div className="text-sm text-rose-400 mb-3">{err}</div>}
        {loading && <div className="text-sm text-muted-foreground">Загрузка…</div>}

        {!loading && users.length === 0 && (
          <div className="text-sm text-muted-foreground">Пользователи не найдены.</div>
        )}

        {!loading && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground text-xs">
                <tr>
                  <th className="py-2 pr-3">Email</th>
                  <th className="pr-3">Имя</th>
                  <th className="pr-3">Роль</th>
                  <th className="pr-3">Тариф</th>
                  <th className="pr-3">Кредиты</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-border align-middle">
                    <td className="py-2 pr-3 font-mono text-xs truncate max-w-[200px]">{u.email}</td>
                    <td className="pr-3 truncate max-w-[120px]">{u.name}</td>
                    <td className="pr-3">
                      <select
                        value={u.role}
                        onChange={(e) => patchUser(u.id, { role: e.target.value as AdminUser["role"] })}
                        className="bg-muted border border-border rounded-md px-2 py-1 text-xs outline-none focus:border-accent"
                      >
                        {ROLE_OPTS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="pr-3">
                      <select
                        value={u.planId}
                        onChange={(e) => patchUser(u.id, { planId: e.target.value })}
                        className="bg-muted border border-border rounded-md px-2 py-1 text-xs outline-none focus:border-accent"
                      >
                        {PLAN_OPTS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td className="pr-3 font-mono tabular-nums">{u.credits}</td>
                    <td>
                      <button onClick={() => setBalance(u.id)} className="px-2 py-1 rounded-md border border-border text-xs hover:bg-muted">
                        Баланс
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── THEME ───────────────────────── */

function ThemePanel() {
  const [tokens, setTokens] = useState<Partial<Record<ThemeToken, string>>>({});
  const [active, setActive] = useState<ThemeToken>("accent");

  useEffect(() => setTokens(loadStoredTokens()), []);

  const update = (id: ThemeToken, value: string) => {
    const next = { ...tokens, [id]: value };
    setTokens(next); saveStoredTokens(next); applyTokens(next);
  };
  const reset = () => {
    setTokens({}); saveStoredTokens({}); applyTokens({});
    toast.success("Тема сброшена");
  };
  const exportCSS = () => {
    const lines = TOKEN_LIST.map((t) => `  ${t.cssVar}: ${tokens[t.id] ?? t.default};`).join("\n");
    navigator.clipboard.writeText(`:root {\n${lines}\n}`);
    toast.success("CSS скопирован");
  };

  const current = TOKEN_LIST.find((t) => t.id === active)!;
  const value = tokens[active] ?? current.default;
  const rgb = hexToRgb(value);

  return (
    <div className="grid md:grid-cols-[1fr_1.2fr] gap-6">
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Токены</h2>
        <div className="flex flex-col gap-1.5">
          {TOKEN_LIST.map((t) => {
            const v = tokens[t.id] ?? t.default;
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  isActive ? "bg-muted border border-accent/40" : "hover:bg-muted/60 border border-transparent"
                }`}
              >
                <span className="w-6 h-6 rounded-md border border-border shrink-0" style={{ background: v }} />
                <span className="flex-1 text-sm font-medium">{t.label}</span>
                <span className="text-xs text-muted-foreground font-mono">{v}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={reset} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted">
            <RotateCcw className="w-4 h-4" /> Сброс
          </button>
          <button onClick={exportCSS} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-warm text-sm font-semibold" style={{ color: "var(--accent-foreground)" }}>
            <Download className="w-4 h-4" /> Экспорт
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-1 text-muted-foreground uppercase tracking-wide">{current.label}</h2>
        <div className="text-xs text-muted-foreground font-mono mb-4">{current.cssVar}</div>

        <div className="flex items-center gap-4 mb-5">
          <div className="w-20 h-20 rounded-2xl border border-border shrink-0" style={{ background: value }} />
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">HEX</label>
            <input type="text" value={value} onChange={(e) => update(active, e.target.value)} className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-accent" />
            <input type="color" value={value} onChange={(e) => update(active, e.target.value)} className="mt-2 w-full h-9 rounded-lg bg-transparent border border-border cursor-pointer" />
          </div>
        </div>

        {(["r", "g", "b"] as const).map((ch) => (
          <div key={ch} className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase font-semibold text-muted-foreground">{ch}</span>
              <span className="text-xs font-mono">{rgb[ch]}</span>
            </div>
            <input
              type="range" min={0} max={255} value={rgb[ch]}
              onChange={(e) => {
                const next = { ...rgb, [ch]: Number(e.target.value) };
                update(active, rgbToHex(next.r, next.g, next.b));
              }}
              className="w-full"
              style={{ accentColor: "var(--accent)" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── MOCKS ───────────────────────── */

function MocksPanel() {
  const [bundle, setBundle] = useState<MockBundle | null>(null);
  const [seed, setSeed] = useState(1);
  const [scale, setScale] = useState(1);

  useEffect(() => setBundle(loadBundle()), []);

  const generate = () => {
    const b = generateBundle(seed, scale);
    saveBundle(b); setBundle(b);
    toast.success(`Сгенерировано: ${b.leads.length} лидов, ${b.media.length} медиа`);
  };
  const clear = () => {
    saveBundle(null); setBundle(null);
    toast.success("Моки очищены");
  };
  const exportJSON = () => {
    if (!bundle) return;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mock-bundle-${bundle.seed}.json`; a.click();
  };

  const counts = bundle ? [
    ["Пользователи", bundle.users.length],
    ["Лиды", bundle.leads.length],
    ["Ассистенты", bundle.assistants.length],
    ["Проекты", bundle.projects.length],
    ["Медиа", bundle.media.length],
    ["Платежи", bundle.payments.length],
  ] as const : [];

  return (
    <div className="grid md:grid-cols-[1fr_1.4fr] gap-6">
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Генератор моков</h2>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Seed (детерминированный)</label>
            <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Масштаб ×{scale}</label>
            <input type="range" min={0.5} max={5} step={0.5} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full" style={{ accentColor: "var(--accent)" }} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={generate} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-warm text-sm font-semibold" style={{ color: "var(--accent-foreground)" }}>
            <Play className="w-4 h-4" /> Сгенерировать
          </button>
          <button onClick={exportJSON} disabled={!bundle} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted disabled:opacity-40">
            <Download className="w-4 h-4" /> Экспорт JSON
          </button>
          <button onClick={clear} disabled={!bundle} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted text-rose-400 disabled:opacity-40">
            <Trash2 className="w-4 h-4" /> Очистить
          </button>
        </div>

        {bundle && (
          <div className="mt-5 pt-5 border-t border-border text-xs text-muted-foreground font-mono">
            seed: {bundle.seed}<br />
            создано: {new Date(bundle.createdAt).toLocaleString("ru")}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-4 uppercase tracking-wide text-muted-foreground">Сущности в хранилище</h2>
        {!bundle && <div className="text-sm text-muted-foreground">Моки не сгенерированы. Нажми «Сгенерировать», чтобы заполнить localStorage.</div>}
        {bundle && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
              {counts.map(([k, v]) => (
                <div key={k} className="bg-muted/50 border border-border rounded-xl px-3 py-2.5">
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="text-lg font-bold font-mono">{v}</div>
                </div>
              ))}
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground mb-2">Превью лидов</summary>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-1.5 pr-3">Имя</th><th className="pr-3">Канал</th><th className="pr-3">Приоритет</th><th>Дата</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {bundle.leads.slice(0, 6).map((l) => (
                      <tr key={l.id} className="border-t border-border">
                        <td className="py-1.5 pr-3">{l.name}</td>
                        <td className="pr-3">{l.channel}</td>
                        <td className="pr-3">{l.priority}</td>
                        <td>{l.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── ADAPTIVE ───────────────────────── */

function AdaptivePanel() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [results, setResults] = useState<AdaptiveResult[]>([]);
  const [running, setRunning] = useState(false);
  const [bp, setBp] = useState(BREAKPOINTS[0]);

  const runAll = async () => {
    if (!iframeRef.current) return;
    setRunning(true); setResults([]);
    const out: AdaptiveResult[] = [];
    for (const check of ADAPTIVE_CHECKS) {
      for (const b of BREAKPOINTS) {
        const r = await runAdaptive(check, b, iframeRef.current);
        out.push(r); setResults([...out]);
      }
    }
    setRunning(false);
    toast.success("Адаптив-тесты завершены");
  };

  return (
    <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Брейкпоинты</h2>
          <button onClick={runAll} disabled={running} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-warm text-sm font-semibold disabled:opacity-40" style={{ color: "var(--accent-foreground)" }}>
            <Play className="w-4 h-4" /> {running ? "Идёт…" : "Запустить"}
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {BREAKPOINTS.map((b) => (
            <button key={b.id} onClick={() => setBp(b)} className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${bp.id === b.id ? "border-accent text-accent" : "border-border text-muted-foreground"}`}>
              {b.id === "mobile" ? <Smartphone className="w-3.5 h-3.5" /> : b.id === "tablet" ? <Tablet className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
              {b.label}
            </button>
          ))}
        </div>

        <div className="border border-border rounded-xl overflow-auto bg-background/40 p-2 max-h-[460px]">
          <iframe
            ref={iframeRef}
            title="adaptive-preview"
            src="about:blank"
            style={{ width: bp.w, height: bp.h, border: 0, display: "block" }}
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Отчёт</h2>
          {results.length > 0 && (
            <div className="text-xs font-mono">
              <span className="text-emerald-400">{results.filter(r => r.ok).length} ✓</span>
              {" · "}
              <span className="text-rose-400">{results.filter(r => !r.ok).length} ✗</span>
            </div>
          )}
        </div>
        {results.length === 0 && <div className="text-sm text-muted-foreground">Запусти проверку, каждый маршрут будет открыт в трёх размерах и проверен на горизонтальный overflow.</div>}
        <div className="flex flex-col gap-1.5 max-h-[460px] overflow-auto">
          {results.map((r, i) => (
            <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${r.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${r.ok ? "bg-emerald-400" : "bg-rose-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="truncate text-xs">{r.label}</div>
                <div className="text-[10px] text-muted-foreground font-mono">{r.route} · {r.bp.label} · {r.scrollW}/{r.clientW}px {r.hasOverflow && "· overflow"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── E2E ───────────────────────── */

function E2EPanel() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [results, setResults] = useState<RunResult[]>([]);
  const [running, setRunning] = useState(false);
  const [qa, setQa] = useState<Record<string, "ok" | "fail" | "untested">>({});

  useEffect(() => {
    try { setQa(JSON.parse(localStorage.getItem("lovable-qa-routes") || "{}")); } catch {/* */}
  }, []);

  const runAll = async () => {
    if (!iframeRef.current) return;
    setRunning(true); setResults([]);
    const out: RunResult[] = [];
    for (const s of SCENARIOS) {
      const r = await runScenario(s, iframeRef.current);
      out.push(r); setResults([...out]);
    }
    setRunning(false);
    const passed = out.filter(o => o.ok).length;
    toast.success(`E2E: ${passed}/${out.length} прошло`);
  };

  const runOne = async (id: string) => {
    if (!iframeRef.current) return;
    const s = SCENARIOS.find(x => x.id === id);
    if (!s) return;
    setRunning(true);
    const r = await runScenario(s, iframeRef.current);
    setResults((prev) => {
      const filtered = prev.filter(x => x.id !== id);
      return [...filtered, r];
    });
    setRunning(false);
  };

  const exportReport = () => {
    const report = {
      ranAt: new Date().toISOString(),
      summary: { total: results.length, ok: results.filter(r => r.ok).length, fail: results.filter(r => !r.ok).length },
      results,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `e2e-report-${Date.now()}.json`; a.click();
  };

  const groupedRoutes = useMemo(() => {
    const m = new Map<string, typeof ROUTES_MAP>();
    for (const r of ROUTES_MAP) {
      const arr = m.get(r.group) ?? [];
      arr.push(r); m.set(r.group, arr);
    }
    return Array.from(m.entries());
  }, []);

  const setQAStatus = (route: string, status: "ok" | "fail") => {
    const next = { ...qa, [route]: status };
    setQa(next);
    localStorage.setItem("lovable-qa-routes", JSON.stringify(next));
  };

  const summary = {
    total: results.length,
    ok: results.filter(r => r.ok).length,
    fail: results.filter(r => !r.ok).length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Сценарии регрессии</h2>
            <div className="flex gap-2">
              <button onClick={exportReport} disabled={results.length === 0} className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-border text-xs font-medium hover:bg-muted disabled:opacity-40">
                <Download className="w-3.5 h-3.5" /> Отчёт
              </button>
              <button onClick={runAll} disabled={running} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-warm text-sm font-semibold disabled:opacity-40" style={{ color: "var(--accent-foreground)" }}>
                <Play className="w-4 h-4" /> {running ? "Идёт…" : "Прогнать всё"}
              </button>
            </div>
          </div>

          {results.length > 0 && (
            <div className="mb-3 text-xs font-mono">
              <span className="text-emerald-400">{summary.ok} ✓</span>{" · "}
              <span className="text-rose-400">{summary.fail} ✗</span>{" · "}
              <span className="text-muted-foreground">{SCENARIOS.length - results.length} ?</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5 max-h-[420px] overflow-auto">
            {SCENARIOS.map((s) => {
              const r = results.find((x) => x.id === s.id);
              return (
                <div key={s.id} className={`px-3 py-2 rounded-lg border text-sm ${r ? (r.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5") : "border-border"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${r ? (r.ok ? "bg-emerald-400" : "bg-rose-400") : "bg-muted-foreground/40"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-xs">{s.label}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{s.group} · {s.url} {r && `· ${r.ms}ms`}</div>
                    </div>
                    <button onClick={() => runOne(s.id)} disabled={running} className="px-2 py-1 rounded-md border border-border text-[10px] hover:bg-muted disabled:opacity-40">▶</button>
                  </div>
                  {r && !r.ok && (
                    <div className="mt-1.5 pl-4 text-[10px] text-rose-300 font-mono">
                      {r.steps.filter(s => !s.ok).map((s, i) => (
                        <div key={i}>· {s.step.type}, {s.error}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground">Превью прогона</h2>
          <div className="border border-border rounded-xl overflow-auto bg-background/40 p-2 max-h-[460px]">
            <iframe ref={iframeRef} title="e2e-preview" src="about:blank" style={{ width: 390, height: 700, border: 0, display: "block", margin: "0 auto" }} />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ручной QA по маршрутам</h2>
            <p className="text-xs text-muted-foreground mt-1">Открой каждый экран и отметь статус. Сохраняется локально.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {groupedRoutes.map(([group, routes]) => (
            <div key={group}>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{group}</div>
              <div className="flex flex-col divide-y divide-border border border-border rounded-xl overflow-hidden">
                {routes.map((r) => {
                  const status = qa[r.to] ?? "untested";
                  return (
                    <div key={r.to} className="flex items-center gap-3 px-3 py-2 bg-background/40">
                      <Link to={r.to} className="flex-1 min-w-0 inline-flex items-center gap-2 group">
                        <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-accent" />
                        <span className="text-xs font-medium truncate">{r.label}</span>
                      </Link>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setQAStatus(r.to, "ok")} className={`w-6 h-6 rounded-md text-xs ${status === "ok" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "text-muted-foreground border border-border hover:bg-muted"}`}>
                          <Check className="w-3 h-3 mx-auto" />
                        </button>
                        <button onClick={() => setQAStatus(r.to, "fail")} className={`w-6 h-6 rounded-md text-xs ${status === "fail" ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" : "text-muted-foreground border border-border hover:bg-muted"}`}>✗</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

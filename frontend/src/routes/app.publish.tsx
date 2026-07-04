import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Check, ChevronDown, Globe, Loader2, AlertCircle, ExternalLink, Lock, Rocket, Share2, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/app/publish")({
  head: () => ({
    meta: [
      { title: "Опубликовать сайт" },
      { name: "description", content: "Адрес на наших серверах и подключение своего домена." },
    ],
  }),
  component: PublishScreen,
});

const A_IP = "185.158.133.1";
const CNAME_TARGET = "cname.neeklo.app";
const TXT_NAME = "_neeklo";
const TXT_VALUE = "neeklo-verify=8f3a";

type PublishState = "publishing" | "published" | "error";
type DomainState = "idle" | "checking" | "connecting" | "connected" | "error";

function slugify(s: string): string {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"i",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",
    р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
  };
  const out = s.toLowerCase().split("").map((c) => map[c] ?? c).join("");
  return out.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "moi-sait";
}

function PublishScreen() {
  const projectName = useMemo(() => {
    try { return localStorage.getItem("neeklo-project-name") || "Мой сайт"; } catch { return "Мой сайт"; }
  }, []);
  const subdomain = useMemo(() => `${slugify(projectName)}.neeklo.app`, [projectName]);
  const previewLink = useMemo(() => `https://preview.neeklo.app/p/${slugify(projectName)}`, [projectName]);

  const [publishState, setPublishState] = useState<PublishState>("publishing");
  const [copied, setCopied] = useState(false);
  const [sharedCopied, setSharedCopied] = useState(false);
  const [domain, setDomain] = useState("");
  const [dnsOpen, setDnsOpen] = useState(false);
  const [state, setState] = useState<DomainState>("idle");
  const [connectedDomain, setConnectedDomain] = useState<string | null>(null);

  const runPublish = () => {
    setPublishState("publishing");
    window.setTimeout(() => {
      if (Math.random() < 0.05) {
        setPublishState("error");
        toast.error("Не удалось опубликовать", { description: "Попробуй ещё раз" });
      } else {
        setPublishState("published");
        toast.success("Сайт опубликован", { description: subdomain });
      }
    }, 1600);
  };

  useEffect(() => { runPublish(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const copy = async (value: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(value);
      setter(true);
      window.setTimeout(() => setter(false), 1500);
    } catch { /* noop */ }
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ title: projectName, url: previewLink });
        return;
      } catch { /* fallback */ }
    }
    copy(previewLink, setSharedCopied);
    toast.success("Ссылка скопирована", { description: previewLink });
  };

  const isValidDomain = (d: string) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(d.trim());

  const check = () => {
    const d = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!isValidDomain(d)) {
      setState("error");
      return;
    }
    setState("checking");
    window.setTimeout(() => {
      if (Math.random() < 0.08) {
        setState("error");
        return;
      }
      setState("connecting");
      window.setTimeout(() => {
        setState("connected");
        setConnectedDomain(d);
        toast.success("Домен подключён", { description: d });
      }, 1400);
    }, 1200);
  };

  const reset = () => { setState("idle"); };

  return (
    <div className="min-h-dvh bg-background text-foreground flex justify-center">
      <div className="w-full app-screen flex flex-col min-h-dvh px-5 pt-14 pb-8">
        <header className="flex items-center gap-3 mb-6">
          <Link to="/app/site" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-card transition-colors" aria-label="Назад">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <button
            type="button"
            onClick={share}
            disabled={publishState !== "published"}
            className="ml-auto h-9 px-3 rounded-full bg-card border border-border/60 text-[12.5px] font-medium inline-flex items-center gap-1.5 hover:border-accent/40 transition-colors disabled:opacity-50"
          >
            {sharedCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            Поделиться
          </button>
        </header>

        <h1 className="text-[26px] leading-tight font-bold tracking-tight mb-1.5">Опубликовать сайт</h1>
        <p className="text-[13px] text-muted-foreground mb-6">{projectName}</p>

        {/* Card 1: subdomain + publish state */}
        <section className="rounded-2xl bg-card border border-border/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-medium text-foreground/90">Адрес на наших серверах</div>
            <PublishBadge state={publishState} />
          </div>

          {publishState === "publishing" && (
            <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl bg-background border border-border/60 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              Публикуем сайт…
            </div>
          )}

          {publishState === "error" && (
            <div className="space-y-3">
              <div className="rounded-xl bg-destructive/5 border border-destructive/40 px-3 py-2.5 flex items-start gap-2 text-[12.5px] text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>Не удалось опубликовать. Проверь соединение и попробуй ещё раз.</div>
              </div>
              <button type="button" onClick={runPublish}
                className="w-full h-11 rounded-xl bg-background border border-border/60 text-sm font-medium inline-flex items-center justify-center gap-2 hover:border-accent/40 transition-colors">
                <RefreshCw className="w-4 h-4" /> Повторить
              </button>
            </div>
          )}

          {publishState === "published" && (
            <div className="flex items-stretch gap-2">
              <div className="flex-1 h-11 px-3.5 rounded-xl bg-background border border-border/60 flex items-center text-sm font-mono text-foreground/90 truncate">
                {subdomain}
              </div>
              <button type="button" onClick={() => copy(subdomain, setCopied)} aria-label="Копировать адрес"
                className="shrink-0 w-11 h-11 rounded-xl bg-background border border-border/60 flex items-center justify-center hover:border-accent/40 transition-colors">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
              <a href={`https://${subdomain}`} target="_blank" rel="noreferrer" aria-label="Открыть"
                className="shrink-0 w-11 h-11 rounded-xl bg-background border border-border/60 flex items-center justify-center hover:border-accent/40 transition-colors">
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
            </div>
          )}
        </section>

        {/* Card 2: custom domain */}
        <section className="mt-4 rounded-2xl bg-card border border-border/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent" />
              <div className="text-[13px] font-medium text-foreground/90">Подключить свой домен</div>
            </div>
            <DomainBadge state={state} />
          </div>

          <input
            value={domain}
            onChange={(e) => { setDomain(e.target.value); if (state === "error") setState("idle"); }}
            placeholder="example.com"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            disabled={publishState !== "published" || state === "checking" || state === "connecting" || state === "connected"}
            className="w-full h-11 px-3.5 rounded-xl bg-background border border-border/60 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/60 transition-colors disabled:opacity-60"
          />

          <button
            type="button"
            onClick={() => setDnsOpen((v) => !v)}
            className="mt-3 w-full flex items-center justify-between text-[13px] text-foreground/80"
          >
            <span>Инструкция по DNS</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${dnsOpen ? "rotate-180" : ""}`} />
          </button>

          {dnsOpen && (
            <div className="mt-3 rounded-xl bg-background border border-border/60 overflow-hidden text-[12px]">
              <div className="grid grid-cols-[70px_64px_1fr] px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                <span>Тип</span><span>Имя</span><span>Значение</span>
              </div>
              <Row type="A" name="@" value={A_IP} />
              <Row type="CNAME" name="www" value={CNAME_TARGET} />
              <Row type="TXT" name={TXT_NAME} value={TXT_VALUE} last />
              <div className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border/60 leading-snug">
                Записи добавляются у регистратора домена. SSL выпустим автоматически после проверки.
              </div>
            </div>
          )}

          {state === "connected" && connectedDomain && (
            <div className="mt-3 rounded-xl bg-emerald-500/5 border border-emerald-500/30 px-3 py-2.5 flex items-center gap-2 text-[12.5px]">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium text-emerald-400 truncate">{connectedDomain}</span>
              <span className="text-muted-foreground">подключён</span>
              <button type="button" onClick={reset} className="ml-auto text-[11px] text-muted-foreground hover:text-foreground">
                Другой
              </button>
            </div>
          )}

          {state === "error" && (
            <div className="mt-3 rounded-xl bg-destructive/5 border border-destructive/40 px-3 py-2.5 flex items-start gap-2 text-[12.5px] text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                Не удалось подтвердить DNS. Проверь, что A-запись указывает на {A_IP}, и попробуй снова через пару минут.
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={publishState !== "published" || !domain.trim() || state === "checking" || state === "connecting" || state === "connected"}
            onClick={check}
            className="mt-3 w-full h-11 rounded-full bg-background border border-border/60 text-sm font-medium hover:border-accent/40 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {(state === "checking" || state === "connecting") && <Loader2 className="w-4 h-4 animate-spin" />}
            {state === "checking" && "Проверяем DNS…"}
            {state === "connecting" && "Подключается…"}
            {state === "connected" && "Подключён"}
            {(state === "idle" || state === "error") && "Проверить подключение"}
          </button>

          <p className="mt-3 text-[11px] text-muted-foreground leading-snug inline-flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Свой домен доступен на платных планах ·{" "}
            <Link to="/app/billing" className="text-accent hover:underline">тарифы</Link>
          </p>
        </section>

        <div className="mt-auto pt-8 grid grid-cols-2 gap-3">
          <Link to="/app/site" className="h-12 rounded-full bg-card border border-border/60 text-[13.5px] font-medium flex items-center justify-center hover:border-accent/40 transition-colors">
            К редактору
          </Link>
          <a
            href={publishState === "published" ? `https://${connectedDomain ?? subdomain}` : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={publishState !== "published"}
            onClick={(e) => { if (publishState !== "published") e.preventDefault(); }}
            className="h-12 rounded-full bg-gradient-warm text-accent-foreground text-[13.5px] font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition-transform aria-disabled:opacity-50 aria-disabled:pointer-events-none"
          >
            {publishState === "publishing"
              ? <><Loader2 className="w-4 h-4 animate-spin" />Публикуем…</>
              : publishState === "published"
                ? <><ExternalLink className="w-4 h-4" /> Открыть сайт</>
                : <><Rocket className="w-4 h-4" /> Не опубликован</>}
          </a>
        </div>
      </div>
    </div>
  );
}

function Row({ type, name, value, last }: { type: string; name: string; value: string; last?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={`grid grid-cols-[70px_64px_1fr_28px] items-center px-3 py-2.5 font-mono text-foreground/90 ${last ? "" : "border-b border-border/60"}`}>
      <span className="text-accent">{type}</span>
      <span>{name}</span>
      <span className="truncate">{value}</span>
      <button
        type="button"
        aria-label="Копировать"
        onClick={() => {
          navigator.clipboard?.writeText(value).catch(() => {});
          setCopied(true);
          toast.success("Скопировано", { description: `${type} ${name}` });
          window.setTimeout(() => setCopied(false), 1200);
        }}
        className="w-7 h-7 rounded-md hover:bg-card flex items-center justify-center"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
    </div>
  );
}

function PublishBadge({ state }: { state: PublishState }) {
  const map = {
    publishing: { label: "Публикуется", cls: "bg-amber-500/10 border-amber-500/30 text-amber-400", dot: "bg-amber-400 animate-pulse" },
    published: { label: "Опубликован", cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", dot: "bg-emerald-400 animate-pulse" },
    error: { label: "Ошибка", cls: "bg-destructive/10 border-destructive/40 text-destructive", dot: "bg-destructive" },
  }[state];
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full border text-[11px] font-medium ${map.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${map.dot}`} />
      {map.label}
    </span>
  );
}

function DomainBadge({ state }: { state: DomainState }) {
  if (state === "idle") return null;
  const map = {
    checking: { label: "Проверяем DNS", cls: "bg-muted/40 border-border/60 text-muted-foreground", dot: "bg-muted-foreground animate-pulse" },
    connecting: { label: "Подключается", cls: "bg-amber-500/10 border-amber-500/30 text-amber-400", dot: "bg-amber-400 animate-pulse" },
    connected: { label: "Подключён", cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", dot: "bg-emerald-400" },
    error: { label: "Ошибка", cls: "bg-destructive/10 border-destructive/40 text-destructive", dot: "bg-destructive" },
  }[state];
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full border text-[11px] font-medium ${map.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${map.dot}`} />
      {map.label}
    </span>
  );
}

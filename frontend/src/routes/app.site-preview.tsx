import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, History, CheckCircle2, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import { tryGenerate } from "@/lib/mock-credits";
import { CreditCost } from "@/components/credit-cost";

export const Route = createFileRoute("/app/site-preview")({
  head: () => ({
    meta: [
      { title: "Превью сайта" },
      { name: "description", content: "Живой предпросмотр сгенерированного сайта." },
    ],
  }),
  component: SitePreview,
});

const PROJECT_NAME = "coffee-na-uglu";

type Theme = {
  bg: string;
  fg: string;
  heroFrom: string;
  heroTo: string;
  ctaBg: string;
  ctaFg: string;
  cardBg: string;
  headline: string;
  sub: string;
  cta: string;
  h1Size: number; // px
  extras: string[]; // appended <section> markup
};

const baseTheme: Theme = {
  bg: "#ffffff",
  fg: "#0f0f12",
  heroFrom: "#fff7f0",
  heroTo: "#ffe9d6",
  ctaBg: "#111111",
  ctaFg: "#ffffff",
  cardBg: "#f5f3ef",
  headline: "Свежая обжарка каждое утро",
  sub: "Маленькая кофейня на Покровке. Зёрна, фильтры, сезонные напитки.",
  cta: "Забронировать столик →",
  h1Size: 26,
  extras: [],
};

function renderHtml(t: Theme) {
  return `<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><style>
*{box-sizing:border-box}html,body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,'Inter',sans-serif;background:${t.bg};color:${t.fg};-webkit-font-smoothing:antialiased;transition:background .3s,color .3s}
.nav{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(0,0,0,.08)}
.logo{font-weight:800;letter-spacing:-.02em}
.nav a{font-size:12px;color:${t.fg};opacity:.6;margin-left:14px;text-decoration:none}
.hero{padding:28px 20px 22px;background:linear-gradient(160deg,${t.heroFrom} 0%,${t.heroTo} 100%)}
h1{font-size:${t.h1Size}px;line-height:1.05;letter-spacing:-.03em;margin:0 0 10px;font-weight:800}
.sub{font-size:13px;opacity:.7;margin:0 0 16px}
.cta{display:inline-flex;align-items:center;gap:6px;background:${t.ctaBg};color:${t.ctaFg};padding:10px 16px;border-radius:999px;font-size:13px;font-weight:600;text-decoration:none}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:18px 16px}
.card{background:${t.cardBg};border-radius:14px;padding:14px;font-size:12px}
.card b{display:block;font-size:14px;margin-bottom:4px}
.section{padding:18px 16px;border-top:1px solid rgba(0,0,0,.08)}
.section h2{font-size:18px;margin:0 0 10px;letter-spacing:-.02em}
.row{display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px dashed rgba(0,0,0,.1)}
.foot{padding:14px 16px;border-top:1px solid rgba(0,0,0,.08);font-size:11px;opacity:.55;text-align:center}
</style></head><body>
<div class='nav'><div class='logo'>Coffee на углу</div><div><a>Меню</a><a>Адрес</a><a>Заказ</a></div></div>
<section class='hero'>
  <h1>${t.headline}</h1>
  <p class='sub'>${t.sub}</p>
  <a class='cta'>${t.cta}</a>
</section>
<div class='grid'>
  <div class='card'><b>Эспрессо</b>Бленд из Эфиопии и Бразилии</div>
  <div class='card'><b>Фильтр</b>Каждую неделю, новое зерно</div>
  <div class='card'><b>Завтраки</b>До 12:00, по будням</div>
  <div class='card'><b>Подписка</b>Кофе домой каждую неделю</div>
</div>
${t.extras.join("\n")}
<div class='foot'>© Coffee на углу · Покровка 18</div>
</body></html>`;
}

function applyEdit(theme: Theme, raw: string): Theme {
  const t = raw.toLowerCase();
  const next: Theme = { ...theme, extras: [...theme.extras] };
  let touched = false;

  if (/тёмн|темн|dark|ночн/.test(t)) {
    next.bg = "#0e0e11";
    next.fg = "#f5f5f7";
    next.heroFrom = "#1a1410";
    next.heroTo = "#241712";
    next.cardBg = "#17171b";
    next.ctaBg = "#ff7849";
    next.ctaFg = "#0e0e11";
    touched = true;
  }
  if (/светл|light|бел/.test(t)) {
    next.bg = baseTheme.bg;
    next.fg = baseTheme.fg;
    next.heroFrom = baseTheme.heroFrom;
    next.heroTo = baseTheme.heroTo;
    next.cardBg = baseTheme.cardBg;
    touched = true;
  }
  if (/син|blue/.test(t)) { next.heroFrom = "#eaf3ff"; next.heroTo = "#cfe1ff"; next.ctaBg = "#1d4ed8"; next.ctaFg = "#fff"; touched = true; }
  if (/зелён|зелен|green/.test(t)) { next.heroFrom = "#ecfdf3"; next.heroTo = "#c7f0d6"; next.ctaBg = "#10b981"; next.ctaFg = "#06231b"; touched = true; }
  if (/красн|red|корал|оранж/.test(t)) { next.heroFrom = "#fff1ec"; next.heroTo = "#ffd9c7"; next.ctaBg = "#ff5a36"; next.ctaFg = "#fff"; touched = true; }
  if (/фиолет|пурпур|purple/.test(t)) { next.heroFrom = "#f4edff"; next.heroTo = "#e0cfff"; next.ctaBg = "#7c3aed"; next.ctaFg = "#fff"; touched = true; }

  if (/жёстч|жестч|крупн|больш(е|ой) заголов|bold/.test(t)) {
    next.h1Size = Math.min(40, next.h1Size + 6);
    next.headline = next.headline.replace(/\.$/, "") + ".";
    touched = true;
  }
  if (/коротк|меньш(е|ий) заголов/.test(t)) {
    next.h1Size = Math.max(18, next.h1Size - 4);
    touched = true;
  }

  if (/цен|price|тариф|прайс/.test(t) && !next.extras.some((e) => e.includes("data-x='prices'"))) {
    next.extras.push(`<section class='section' data-x='prices'><h2>Цены</h2>
<div class='row'><span>Эспрессо</span><b>180 ₽</b></div>
<div class='row'><span>Капучино</span><b>260 ₽</b></div>
<div class='row'><span>Фильтр</span><b>320 ₽</b></div>
<div class='row'><span>Подписка / нед.</span><b>1 490 ₽</b></div></section>`);
    touched = true;
  }
  if (/контакт|телефон|связ/.test(t) && !next.extras.some((e) => e.includes("data-x='contacts'"))) {
    next.extras.push(`<section class='section' data-x='contacts'><h2>Контакты</h2>
<div class='row'><span>Адрес</span><b>Покровка 18</b></div>
<div class='row'><span>Телефон</span><b>+7 495 555-18-22</b></div>
<div class='row'><span>Часы</span><b>08:00, 22:00</b></div></section>`);
    touched = true;
  }
  if (/отзыв|review|testimon/.test(t) && !next.extras.some((e) => e.includes("data-x='reviews'"))) {
    next.extras.push(`<section class='section' data-x='reviews'><h2>Отзывы</h2>
<div class='card' style='margin-bottom:8px'><b>Анна</b>«Лучший раф в районе. И тёплый свет.»</div>
<div class='card'><b>Михаил</b>«Беру подписку второй месяц, стабильно вкусно.»</div></section>`);
    touched = true;
  }
  if (/faq|вопрос/.test(t) && !next.extras.some((e) => e.includes("data-x='faq'"))) {
    next.extras.push(`<section class='section' data-x='faq'><h2>FAQ</h2>
<div class='row'><span>Есть веганское молоко?</span><b>Да</b></div>
<div class='row'><span>Можно с собакой?</span><b>Да</b></div>
<div class='row'><span>Принимаете карты?</span><b>Да</b></div></section>`);
    touched = true;
  }

  // If nothing matched, lightly tweak the headline so the preview visibly changes
  if (!touched) {
    next.headline = raw.length > 60 ? raw.slice(0, 60).trim() + "…" : raw.trim() || next.headline;
  }
  return next;
}

function SitePreview() {
  const [theme, setTheme] = useState<Theme>(baseTheme);
  const [edit, setEdit] = useState("");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<{ id: number; text: string; time: string; snapshot: Theme }[]>([
    { id: 1, text: "Стартовая генерация", time: "14:02", snapshot: baseTheme },
  ]);

  const html = useMemo(() => renderHtml(theme), [theme]);

  const apply = () => {
    const text = edit.trim();
    if (!text) return;
    if (!tryGenerate()) return;
    setApplying(true);
    setError(null);
    window.setTimeout(() => {
      // tiny chance of mock failure
      if (Math.random() < 0.05) {
        setApplying(false);
        setError("Не удалось применить правку. Попробуй переформулировать.");
        return;
      }
      const nextTheme = applyEdit(theme, text);
      setTheme(nextTheme);
      setHistory((h) => [
        { id: h.length + 1, text, time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }), snapshot: nextTheme },
        ...h,
      ]);
      setEdit("");
      setApplying(false);
      toast.success("Правка применена", { description: text });
    }, 900);
  };

  const rollback = (snapshot: Theme, text: string) => {
    setTheme(snapshot);
    toast.success("Откатились к версии", { description: text });
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex justify-center">
      <div className="w-full app-screen flex flex-col min-h-dvh px-5 pt-14 pb-8">
        <header className="flex items-center justify-between mb-5">
          <Link
            to="/app/site"
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-card transition-colors"
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-label="История версий"
            className={`w-10 h-10 -mr-2 rounded-full flex items-center justify-center hover:bg-card transition-colors ${historyOpen ? "bg-card text-accent" : ""}`}
          >
            <History className="w-5 h-5" />
          </button>
        </header>

        <div className="flex items-center justify-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 font-medium">Готово</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground truncate">{PROJECT_NAME}</span>
        </div>

        {/* Phone frame */}
        <div className="mt-5 mx-auto w-full max-w-[270px]">
          <div className="relative rounded-[36px] bg-[#0a0a0c] border border-border/70 p-2 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
            <div className="absolute left-1/2 -translate-x-1/2 top-2 w-20 h-5 rounded-b-2xl bg-[#0a0a0c] z-10" />
            <div className="relative aspect-[9/19] rounded-[28px] overflow-hidden bg-white">
              <iframe
                key={history.length}
                title="Предпросмотр сайта"
                srcDoc={html}
                className="w-full h-full border-0"
                sandbox=""
              />
              {applying && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                  <div className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-background/90 border border-border/60 text-[12.5px] font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" /> Применяем правку
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit input */}
        <div className="mt-6 flex flex-col gap-2">
          <div className="relative">
            <Sparkles className="w-4 h-4 text-accent absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={edit}
              onChange={(e) => setEdit(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !applying && edit.trim()) apply(); }}
              placeholder="Опиши правку"
              className="w-full h-12 pl-10 pr-4 rounded-2xl bg-card border border-border/60 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-accent/60 transition-colors"
            />
          </div>
          <button
            type="button"
            disabled={!edit.trim() || applying}
            onClick={apply}
            className="h-11 rounded-full bg-card border border-border/60 text-sm font-medium text-foreground/90 hover:border-accent/40 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {applying && <Loader2 className="w-4 h-4 animate-spin" />}
            {applying ? "Применяем…" : "Применить"}
            {!applying && <CreditCost variant="on-surface" />}
          </button>
          <p className="text-xs text-muted-foreground px-1">
            Например: «тёмная тема», «добавь блок цен», «крупнее заголовок», «синий акцент»
          </p>

          {error && (
            <div className="mt-1 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-[12.5px] text-destructive">
              {error}
            </div>
          )}

          {historyOpen && (
            <ul className="mt-2 rounded-2xl bg-card border border-border/60 divide-y divide-border/40 max-h-48 overflow-y-auto">
              {history.map((h, idx) => (
                <li key={h.id} className="flex items-center gap-3 px-4 py-3 text-[13px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  <span className="truncate flex-1">{h.text}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{h.time}</span>
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => rollback(h.snapshot, h.text)}
                      className="text-[11px] text-accent hover:underline"
                    >
                      Откат
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-auto pt-7 grid grid-cols-2 gap-3">
          <a
            href="https://example.com"
            target="_blank"
            rel="noreferrer"
            className="h-[52px] rounded-full bg-card border border-border/60 text-sm font-medium flex items-center justify-center gap-2 hover:border-accent/40 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Открыть
          </a>
          <Link
            to="/app/publish"
            className="h-[52px] rounded-full bg-gradient-warm text-accent-foreground text-sm font-semibold flex items-center justify-center active:scale-[0.99] transition-transform"
          >
            Опубликовать
          </Link>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Smartphone,
  Tablet,
  Monitor,
  RefreshCw,
  ExternalLink,
  Eye,
  Code2,
  Share2,
  Rocket,
  ChevronDown,
  Send,
  FileText,
  Mic,
  Undo2,
  Check,
  RotateCcw,
  AlertCircle,
  History,
  MessageSquare,
  Dot,
  Layers,
  GripVertical,
  EyeOff,
  Trash2,
  Plus,
  MousePointerClick,
  X,
  Pencil,
  Image as ImageIcon,
  Wand2,
  FolderOpen,
  ArrowLeft as ArrowLeftIcon,
} from "lucide-react";
import { tryGenerate } from "@/lib/mock-credits";
import { CreditCost } from "@/components/credit-cost";
import { addMedia, listMedia, pickGradient, type MediaItem } from "@/lib/media-store";

export const Route = createFileRoute("/app/site")({
  head: () => ({
    meta: [
      { title: "AI-сайт, редактор" },
      { name: "description", content: "Lovable-подобный редактор: агент, структура, страницы, картинки." },
    ],
  }),
  component: SiteEditor,
});

type Device = "mobile" | "tablet" | "desktop";
type View = "preview" | "code";
type PanelTab = "chat" | "structure" | "history";
type Status = "idle" | "applying" | "error";

type SectionKind = "hero" | "services" | "benefits" | "pricing" | "reviews" | "faq" | "contacts";

type SectionItem = { id: string; kind: SectionKind; visible: boolean };
type SectionOverride = { headline?: string; image?: string };

type SiteState = {
  coral: boolean;
  simple: boolean;
  sections: SectionItem[];
  overrides: Record<string, SectionOverride>;
};

type Page = { id: string; label: string };

type Mutation =
  | { kind: "add"; section: SectionKind }
  | { kind: "palette"; coral: boolean }
  | { kind: "simplify"; simple: boolean }
  | { kind: "headline"; title: string }
  | { kind: "scaffold" };

type ScriptedReply = { text: string; summary: string; mutation: Mutation };

type Version = { id: string; ts: number; label: string; pageId: string; state: SiteState };

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "agent"; text: string; summary: string; versionId: string };

const deviceWidth: Record<Device, number> = { mobile: 390, tablet: 768, desktop: 1280 };

const IMAGE_CAPABLE: SectionKind[] = ["hero", "services", "contacts"];

const quickChips = [
  "Сделать текст проще",
  "Добавить блок цен",
  "Поменять цвет",
  "Добавить отзывы",
  "Поменять заголовок",
];

const startHints = [
  "Сделай лендинг для кофейни с тёплыми тонами",
  "Перенеси сайт по ссылке и упрости главный экран",
  "Добавь блок с ценами и кнопкой записи",
];

const SECTION_LIBRARY: Record<
  SectionKind,
  { label: string; defaultHeadline: string; renderBody: (headline: string) => string }
> = {
  hero: {
    label: "Hero",
    defaultHeadline: "Запусти проект быстрее",
    renderBody: (h) => `
      <span class="kicker">neeklo</span>
      <h1>${h}</h1>
      <p>Готовый сайт, который можно опубликовать сегодня. Тёплая графитовая тема, чистая типографика, понятный CTA.</p>
      <div class="cta"><a class="btn" href="#cta">Оставить заявку</a><a class="link" href="#more">Подробнее</a></div>`,
  },
  services: {
    label: "Услуги",
    defaultHeadline: "Услуги",
    renderBody: (h) => `
      <h2>${h}</h2>
      <div class="grid g3">
        <div class="card"><div class="t">Разработка</div><div class="d">Сайты, лендинги, магазины под ключ.</div></div>
        <div class="card"><div class="t">Дизайн</div><div class="d">Айдентика и интерфейсы, аккуратно и быстро.</div></div>
        <div class="card"><div class="t">Поддержка</div><div class="d">Доработки и контент после запуска.</div></div>
      </div>`,
  },
  benefits: {
    label: "Преимущества",
    defaultHeadline: "Почему мы",
    renderBody: (h) => `
      <h2>${h}</h2>
      <div class="grid g3">
        <div class="card"><div class="t">⚡ Быстро</div><div class="d">Запуск за неделю, не месяцы.</div></div>
        <div class="card"><div class="t">🎯 Прозрачно</div><div class="d">Фикс-цена и план без сюрпризов.</div></div>
        <div class="card"><div class="t">🤝 На связи</div><div class="d">Один менеджер ведёт проект.</div></div>
      </div>`,
  },
  pricing: {
    label: "Цены",
    defaultHeadline: "Цены",
    renderBody: (h) => `
      <h2>${h}</h2>
      <div class="grid g3">
        <div class="card"><div class="t">Старт</div><div class="p">0 ₽</div><div class="d">Базовые блоки и одна страница</div></div>
        <div class="card pop"><div class="t">Про</div><div class="p">990 ₽<span>/мес</span></div><div class="d">Своя доменная зона и аналитика</div></div>
        <div class="card"><div class="t">Студия</div><div class="p">2 900 ₽<span>/мес</span></div><div class="d">Команда, аватары, ассистенты</div></div>
      </div>
      <a class="btn" href="#cta">Записаться</a>`,
  },
  reviews: {
    label: "Отзывы",
    defaultHeadline: "Отзывы",
    renderBody: (h) => `
      <h2>${h}</h2>
      <div class="grid g2">
        <div class="quote"><div class="who"><span class="av">А</span><b>Аня, кофейня</b></div><p>«Сайт собрался за вечер, заказы пошли с первого дня.»</p><div class="stars">★★★★★</div></div>
        <div class="quote"><div class="who"><span class="av">М</span><b>Миша, барбер</b></div><p>«Записи через сайт, теперь не теряю заявки.»</p><div class="stars">★★★★★</div></div>
        <div class="quote"><div class="who"><span class="av">К</span><b>Катя, мастер</b></div><p>«Правится текстом, без дизайнера.»</p><div class="stars">★★★★★</div></div>
        <div class="quote"><div class="who"><span class="av">Д</span><b>Денис, школа</b></div><p>«Перенесли старый сайт за пару минут.»</p><div class="stars">★★★★★</div></div>
      </div>`,
  },
  faq: {
    label: "FAQ",
    defaultHeadline: "Частые вопросы",
    renderBody: (h) => `
      <h2>${h}</h2>
      <div class="faq">
        <details open><summary>Сколько занимает запуск?</summary><p>В среднем 3–7 дней с момента брифа.</p></details>
        <details><summary>Можно перенести существующий сайт?</summary><p>Да, переносим контент и дизайн.</p></details>
        <details><summary>Что входит в поддержку?</summary><p>Правки текстов, новые блоки, минорные доработки.</p></details>
        <details><summary>Есть ли гарантия?</summary><p>30 дней доработок после запуска бесплатно.</p></details>
      </div>`,
  },
  contacts: {
    label: "Контакты",
    defaultHeadline: "Связаться с нами",
    renderBody: (h) => `
      <h2>${h}</h2>
      <p>Москва, ул. Примерная 10. Пн–Пт, 10:00–19:00.</p>
      <div class="cta"><a class="btn" href="#cta">Написать в Telegram</a><a class="link" href="mailto:hi@neeklo.ru">hi@neeklo.ru</a></div>`,
  },
};

const SECTION_ORDER: SectionKind[] = ["hero", "services", "benefits", "pricing", "reviews", "faq", "contacts"];

function makeSection(kind: SectionKind): SectionItem {
  return { id: uid(), kind, visible: true };
}

const INITIAL_STATE: SiteState = {
  coral: false,
  simple: false,
  sections: [makeSection("hero")],
  overrides: {},
};

/* ---------- Mock pages & image generator ---------- */

const MOCK_PAGE_TEMPLATES: Record<string, SectionKind[]> = {
  Главная: ["hero"],
  Услуги: ["hero", "services", "pricing"],
  Контакты: ["hero", "contacts"],
  "О нас": ["hero", "benefits", "reviews"],
};

function makePageState(template: SectionKind[], heroHeadline?: string): SiteState {
  const sections = template.map(makeSection);
  const overrides: Record<string, SectionOverride> = {};
  if (heroHeadline && sections[0]?.kind === "hero") {
    overrides[sections[0].id] = { headline: heroHeadline };
  }
  return { ...INITIAL_STATE, sections, overrides };
}

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function makeMockImage(prompt: string): string {
  const seed = hashStr(prompt || "image");
  const hue = Math.abs(seed) % 360;
  const hue2 = (hue + 40) % 360;
  const label = (prompt || "Изображение").replace(/[<>&"]/g, " ").slice(0, 60);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500' preserveAspectRatio='xMidYMid slice'>
    <defs>
      <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
        <stop offset='0' stop-color='hsl(${hue} 70% 58%)'/>
        <stop offset='1' stop-color='hsl(${hue2} 65% 32%)'/>
      </linearGradient>
      <radialGradient id='r' cx='30%' cy='30%' r='60%'>
        <stop offset='0' stop-color='rgba(255,255,255,.25)'/>
        <stop offset='1' stop-color='rgba(255,255,255,0)'/>
      </radialGradient>
    </defs>
    <rect width='800' height='500' fill='url(#g)'/>
    <rect width='800' height='500' fill='url(#r)'/>
    <text x='40' y='470' font-family='ui-sans-serif,system-ui,sans-serif' font-size='20' font-weight='700' fill='rgba(255,255,255,.92)'>${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* ---------- Prompt → mutation ---------- */

function extractTitle(prompt: string): string | null {
  const q = prompt.match(/[«"']([^«»"']{2,60})[»"']/);
  if (q) return q[1].trim();
  const n = prompt.match(/на\s+([^.,;!?]{2,60})/i);
  if (n) return n[1].trim();
  return null;
}

function pickReply(prompt: string): ScriptedReply {
  if (/заголов|назван|titl|hero/i.test(prompt)) {
    const t = extractTitle(prompt) ?? "Новый заголовок";
    return { text: `Поменял заголовок hero на «${t}».`, summary: `Hero: «${t}»`, mutation: { kind: "headline", title: t } };
  }
  if (/цен|прайс|тариф/i.test(prompt)) return { text: "Добавил «Цены».", summary: "+ блок «Цены»", mutation: { kind: "add", section: "pricing" } };
  if (/отзыв/i.test(prompt)) return { text: "Добавил «Отзывы».", summary: "+ блок «Отзывы»", mutation: { kind: "add", section: "reviews" } };
  if (/услуг/i.test(prompt)) return { text: "Добавил «Услуги».", summary: "+ блок «Услуги»", mutation: { kind: "add", section: "services" } };
  if (/преимущ|почему/i.test(prompt)) return { text: "Добавил «Преимущества».", summary: "+ блок «Преимущества»", mutation: { kind: "add", section: "benefits" } };
  if (/faq|вопрос/i.test(prompt)) return { text: "Добавил FAQ.", summary: "+ блок «FAQ»", mutation: { kind: "add", section: "faq" } };
  if (/контакт|связ/i.test(prompt)) return { text: "Добавил «Контакты».", summary: "+ блок «Контакты»", mutation: { kind: "add", section: "contacts" } };
  if (/цвет|тем|палитр|акцент|коралл/i.test(prompt)) return { text: "Акцент, тёплый коралл.", summary: "Палитра: коралл", mutation: { kind: "palette", coral: true } };
  if (/прощ|корот|упрост/i.test(prompt)) return { text: "Сократил тексты.", summary: "Тексты сокращены", mutation: { kind: "simplify", simple: true } };
  return { text: "Собрал первый вариант сайта.", summary: "Каркас: hero, услуги, цены, отзывы", mutation: { kind: "scaffold" } };
}

function applyMutation(state: SiteState, m: Mutation): SiteState {
  switch (m.kind) {
    case "add": {
      const existing = state.sections.find((s) => s.kind === m.section);
      if (existing) {
        if (existing.visible) return state;
        return { ...state, sections: state.sections.map((s) => (s.id === existing.id ? { ...s, visible: true } : s)) };
      }
      return { ...state, sections: [...state.sections, makeSection(m.section)] };
    }
    case "palette": return { ...state, coral: m.coral };
    case "simplify": return { ...state, simple: m.simple };
    case "headline": {
      const hero = state.sections.find((s) => s.kind === "hero");
      if (!hero) return state;
      const prev = state.overrides[hero.id] ?? {};
      return { ...state, overrides: { ...state.overrides, [hero.id]: { ...prev, headline: m.title } } };
    }
    case "scaffold":
      return {
        ...INITIAL_STATE,
        sections: [makeSection("hero"), makeSection("services"), makeSection("pricing"), makeSection("reviews")],
      };
  }
}

/* ---------- HTML builder ---------- */

function renderSection(s: SectionItem, st: SiteState): string {
  const lib = SECTION_LIBRARY[s.kind];
  const ov = st.overrides[s.id] ?? {};
  const headline = ov.headline ?? lib.defaultHeadline;
  const img = ov.image;

  if (s.kind === "hero") {
    if (st.simple) {
      return `<span class="kicker">neeklo</span><h1>${headline}</h1><p>Запустим проект сегодня.</p><a class="btn" href="#cta">Оставить заявку</a>`;
    }
    if (img) {
      return `<div class="hero-grid">
        <div class="hero-text">
          <span class="kicker">neeklo</span>
          <h1>${headline}</h1>
          <p>Готовый сайт, который можно опубликовать сегодня. Тёплая графитовая тема, чистая типографика, понятный CTA.</p>
          <div class="cta"><a class="btn" href="#cta">Оставить заявку</a><a class="link" href="#more">Подробнее</a></div>
        </div>
        <div class="hero-image"><img src="${img}" alt="" /></div>
      </div>`;
    }
    return lib.renderBody(headline);
  }

  if (s.kind === "services" && img) {
    return `<img class="sec-img" src="${img}" alt="" />` + lib.renderBody(headline);
  }
  if (s.kind === "contacts" && img) {
    return lib.renderBody(headline) + `<img class="sec-img" src="${img}" alt="" />`;
  }
  return lib.renderBody(headline);
}

function buildHtml(opts: {
  projectName: string;
  pageLabel: string;
  state: SiteState;
  pickMode: boolean;
  selectedSid: string | null;
}) {
  const { state } = opts;
  const accent = state.coral ? "#FF6A4D" : "#E8E5DE";
  const accentText = state.coral ? "#1A1614" : "#0E0D0B";

  const body = state.sections
    .filter((s) => s.visible)
    .map((s) => {
      const lib = SECTION_LIBRARY[s.kind];
      return `<section class="sec sec-${s.kind}" data-sid="${s.id}" data-kind="${s.kind}" data-label="${lib.label}">${renderSection(s, state)}</section>`;
    })
    .join("\n");

  const pickStyles = opts.pickMode
    ? `body{cursor:crosshair}[data-sid]{position:relative;transition:outline .12s}[data-sid]:hover{outline:2px dashed ${accent};outline-offset:-2px}[data-sid]:hover::after{content:attr(data-label);position:absolute;top:6px;left:6px;background:${accent};color:${accentText};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600}`
    : "";
  const selectedStyles = opts.selectedSid
    ? `[data-sid="${opts.selectedSid}"]{outline:2px solid ${accent};outline-offset:-2px;position:relative}[data-sid="${opts.selectedSid}"]::after{content:attr(data-label) " · выбрано";position:absolute;top:6px;left:6px;background:${accent};color:${accentText};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600}`
    : "";
  const pickScript = opts.pickMode
    ? `<script>document.addEventListener('click',function(e){var s=e.target.closest('[data-sid]');if(!s)return;e.preventDefault();e.stopPropagation();parent.postMessage({type:'neeklo-pick',sid:s.dataset.sid,kind:s.dataset.kind,label:s.dataset.label},'*')},true);document.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault()})})</script>`
    : "";

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${opts.projectName}, ${opts.pageLabel}</title>
<style>
  :root{--bg:#0E0D0B;--fg:#F2EFE8;--muted:#9C968A;--card:#1A1714;--border:rgba(242,239,232,.08);--accent:${accent};--accent-fg:${accentText};}
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--bg);color:var(--fg);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
  .nav{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid var(--border);font-size:13px}
  .nav b{font-weight:600;letter-spacing:-.01em}
  .nav .links a{color:var(--muted);text-decoration:none;margin-left:18px}
  .sec{padding:48px 24px;max-width:1080px;margin:0 auto}
  .kicker{display:inline-block;padding:4px 10px;border-radius:999px;background:rgba(255,106,77,.12);color:var(--accent);font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:16px}
  h1{font-size:clamp(28px,5vw,52px);line-height:1.05;letter-spacing:-.02em;margin:0 0 16px}
  h2{font-size:clamp(22px,3vw,32px);letter-spacing:-.01em;margin:0 0 24px}
  p{color:var(--muted);font-size:15px;line-height:1.5;max-width:62ch;margin:0 0 20px}
  .cta{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
  .btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 18px;border-radius:12px;background:var(--accent);color:var(--accent-fg);font-weight:600;font-size:14px;text-decoration:none}
  .link{color:var(--fg);text-decoration:none;font-size:14px;opacity:.8}
  .grid{display:grid;gap:12px;margin-bottom:24px}
  .grid.g3{grid-template-columns:repeat(3,minmax(0,1fr))}
  .grid.g2{grid-template-columns:repeat(2,minmax(0,1fr))}
  .card{padding:20px;border:1px solid var(--border);border-radius:16px;background:var(--card)}
  .card.pop{border-color:var(--accent);box-shadow:0 12px 32px -16px rgba(255,106,77,.4)}
  .card .t{font-size:13px;color:var(--muted);margin-bottom:8px}
  .card .p{font-size:26px;font-weight:700;letter-spacing:-.01em}
  .card .p span{font-size:13px;color:var(--muted);font-weight:500;margin-left:4px}
  .card .d{font-size:13px;color:var(--muted);margin-top:8px;line-height:1.45}
  .quote{padding:18px;border:1px solid var(--border);border-radius:16px;background:var(--card)}
  .quote .who{display:flex;align-items:center;gap:10px;font-size:13px;margin-bottom:8px}
  .quote .av{width:28px;height:28px;border-radius:50%;background:var(--accent);color:var(--accent-fg);display:grid;place-items:center;font-size:12px;font-weight:700}
  .quote p{margin:0 0 8px;color:var(--fg);font-size:14px;line-height:1.45}
  .quote .stars{color:var(--accent);font-size:13px;letter-spacing:2px}
  .faq details{border:1px solid var(--border);border-radius:12px;background:var(--card);padding:12px 16px;margin-bottom:8px}
  .faq summary{cursor:pointer;font-weight:600;font-size:14px;list-style:none}
  .faq summary::-webkit-details-marker{display:none}
  .faq p{margin:8px 0 0;font-size:13px}
  .foot{padding:24px;border-top:1px solid var(--border);text-align:center;color:var(--muted);font-size:12px}
  .hero-grid{display:grid;grid-template-columns:1.05fr 1fr;gap:32px;align-items:center}
  .hero-image img{width:100%;border-radius:18px;display:block;aspect-ratio:16/10;object-fit:cover;border:1px solid var(--border)}
  .sec-img{width:100%;border-radius:16px;display:block;margin-bottom:24px;aspect-ratio:16/7;object-fit:cover;border:1px solid var(--border)}
  @media (max-width:768px){.hero-grid{grid-template-columns:1fr}.grid.g3,.grid.g2{grid-template-columns:1fr}.sec{padding:32px 20px}}
  ${pickStyles}
  ${selectedStyles}
</style>
</head>
<body>
  <header class="nav"><b>${opts.projectName}</b><div class="links"><a href="#">${opts.pageLabel}</a></div></header>
  ${body}
  <footer class="foot">© ${opts.projectName} · собрано в neeklo</footer>
  ${pickScript}
</body>
</html>`;
}

function highlightHtml(src: string) {
  const esc = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span style="color:#6b7280">$1</span>')
    .replace(/(&lt;\/?)([a-zA-Z0-9-]+)/g, '$1<span style="color:#f59e0b">$2</span>')
    .replace(/([a-zA-Z-]+)=(&quot;[^&]*?&quot;|"[^"]*?")/g, '<span style="color:#60a5fa">$1</span>=<span style="color:#a3e635">$2</span>');
}

function uid() { return Math.random().toString(36).slice(2, 9); }
function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function SiteEditor() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("Мой сайт");
  const [device, setDevice] = useState<Device>("desktop");
  const [view, setView] = useState<View>("preview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [panel, setPanel] = useState<PanelTab>("chat");
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");

  // Pages
  const homePageId = useMemo(() => uid(), []);
  const initialVersionId = useMemo(() => uid(), []);
  const [pages, setPages] = useState<Page[]>([{ id: homePageId, label: "Главная" }]);
  const [activePageId, setActivePageId] = useState<string>(homePageId);

  // Versions: flat list, tagged with pageId
  const [versions, setVersions] = useState<Version[]>([
    { id: initialVersionId, ts: Date.now(), label: "Создана страница «Главная»", pageId: homePageId, state: INITIAL_STATE },
  ]);
  const [activeVersionByPage, setActiveVersionByPage] = useState<Record<string, string>>({
    [homePageId]: initialVersionId,
  });

  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0];
  const activeVersionId = activeVersionByPage[activePageId];
  const activeVersion = versions.find((v) => v.id === activeVersionId);
  const siteState = activeVersion?.state ?? INITIAL_STATE;
  const pageHasContent =
    versions.filter((v) => v.pageId === activePageId).length > 1 ||
    siteState.sections.some((s) => s.kind !== "hero") ||
    Object.values(siteState.overrides).some((o) => !!o.image || !!o.headline);

  // Pick / select
  const [pickMode, setPickMode] = useState(false);
  const [selectedSid, setSelectedSid] = useState<string | null>(null);
  const [elementPrompt, setElementPrompt] = useState("");
  const [elementApplying, setElementApplying] = useState(false);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const html = useMemo(
    () => buildHtml({ projectName, pageLabel: activePage.label, state: siteState, pickMode, selectedSid }),
    [projectName, activePage.label, siteState, pickMode, selectedSid]
  );

  const blobUrl = useMemo(() => {
    if (typeof window === "undefined" || !pageHasContent) return null;
    const blob = new Blob([html], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [html, pageHasContent]);

  useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl); }, [blobUrl]);

  useEffect(() => {
    if (!pageHasContent) return;
    setPreviewLoading(true);
    const t = window.setTimeout(() => setPreviewLoading(false), 320);
    return () => window.clearTimeout(t);
  }, [refreshKey, html, pageHasContent]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (d && d.type === "neeklo-pick") {
        setSelectedSid(d.sid);
        setPickMode(false);
        setElementPrompt("");
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    if (panel !== "chat") return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status, panel]);

  /* ---------- Versions & mutations ---------- */

  const pushVersion = (label: string, nextState: SiteState, pageId: string = activePageId) => {
    const v: Version = { id: uid(), ts: Date.now(), label, pageId, state: nextState };
    setVersions((vs) => [...vs, v]);
    setActiveVersionByPage((m) => ({ ...m, [pageId]: v.id }));
    setRefreshKey((k) => k + 1);
    return v;
  };

  const mutateState = (label: string, fn: (s: SiteState) => SiteState) => {
    if (!tryGenerate()) return null;
    return pushVersion(label, fn(siteState));
  };

  /* ---------- Chat ---------- */

  const runAgent = (prompt: string) => {
    if (status === "applying") return;
    if (!tryGenerate()) return;
    setLastPrompt(prompt);
    setMessages((m) => [...m, { id: uid(), role: "user", text: prompt }]);
    setInput("");
    setStatus("applying");
    setProgress(0);

    const startedAt = Date.now();
    const totalMs = 1100 + Math.random() * 700;
    const tick = window.setInterval(() => {
      setProgress(Math.min(95, Math.round(((Date.now() - startedAt) / totalMs) * 95)));
    }, 60);
    const willError = Math.random() < 0.08;

    window.setTimeout(() => {
      window.clearInterval(tick);
      if (willError) { setStatus("error"); setProgress(0); return; }
      const r = pickReply(prompt);
      const v = pushVersion(r.summary, applyMutation(siteState, r.mutation));
      setMessages((m) => [...m, { id: uid(), role: "agent", text: r.text, summary: r.summary, versionId: v.id }]);
      setProgress(100);
      setStatus("idle");
      setTimeout(() => { setProgress(0); inputRef.current?.focus(); }, 250);
    }, totalMs);
  };

  const submit = () => { const t = input.trim(); if (!t || status === "applying") return; runAgent(t); };
  const retry = () => { if (!lastPrompt) { setStatus("idle"); return; } runAgent(lastPrompt); };

  const goToVersion = (id: string) => {
    const v = versions.find((x) => x.id === id);
    if (!v) return;
    setActivePageId(v.pageId);
    setActiveVersionByPage((m) => ({ ...m, [v.pageId]: id }));
    setSelectedSid(null);
    setRefreshKey((k) => k + 1);
  };

  const revertFromMessage = (msgVersionId: string) => {
    const msgVersion = versions.find((v) => v.id === msgVersionId);
    if (!msgVersion) return;
    const samePage = versions.filter((v) => v.pageId === msgVersion.pageId);
    const idx = samePage.findIndex((v) => v.id === msgVersionId);
    const target = idx > 0 ? samePage[idx - 1] : samePage[0];
    goToVersion(target.id);
  };

  const fillChip = (chip: string) => { setInput(chip); inputRef.current?.focus(); };

  /* ---------- Pages ---------- */

  const selectPage = (id: string) => {
    setActivePageId(id);
    setSelectedSid(null);
    setRefreshKey((k) => k + 1);
  };

  const addPage = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (pages.some((p) => p.label.toLowerCase() === trimmed.toLowerCase())) return;
    if (!tryGenerate()) return;
    const id = uid();
    const template = MOCK_PAGE_TEMPLATES[trimmed] ?? ["hero"];
    const state = makePageState(template, trimmed);
    const initVersion: Version = {
      id: uid(),
      ts: Date.now(),
      label: `Создана страница «${trimmed}»`,
      pageId: id,
      state,
    };
    setPages((ps) => [...ps, { id, label: trimmed }]);
    setVersions((vs) => [...vs, initVersion]);
    setActiveVersionByPage((m) => ({ ...m, [id]: initVersion.id }));
    setActivePageId(id);
    setSelectedSid(null);
    setRefreshKey((k) => k + 1);
  };

  /* ---------- Structure ---------- */

  const toggleVisible = (id: string) => {
    const s = siteState.sections.find((x) => x.id === id);
    if (!s) return;
    mutateState(
      `${s.visible ? "Скрыл" : "Показал"} «${SECTION_LIBRARY[s.kind].label}»`,
      (st) => ({ ...st, sections: st.sections.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x)) })
    );
  };

  const removeSection = (id: string) => {
    const s = siteState.sections.find((x) => x.id === id);
    if (!s || s.kind === "hero") return;
    mutateState(`Удалил «${SECTION_LIBRARY[s.kind].label}»`, (st) => ({
      ...st,
      sections: st.sections.filter((x) => x.id !== id),
      overrides: Object.fromEntries(Object.entries(st.overrides).filter(([k]) => k !== id)),
    }));
    if (selectedSid === id) setSelectedSid(null);
  };

  const addSection = (kind: SectionKind) => {
    mutateState(`+ блок «${SECTION_LIBRARY[kind].label}»`, (st) => ({ ...st, sections: [...st.sections, makeSection(kind)] }));
  };

  const reorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    mutateState("Изменил порядок секций", (st) => {
      const arr = [...st.sections];
      const from = arr.findIndex((s) => s.id === fromId);
      const to = arr.findIndex((s) => s.id === toId);
      if (from < 0 || to < 0) return st;
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return { ...st, sections: arr };
    });
  };

  /* ---------- Element edit (headline) ---------- */

  const applyElementEdit = () => {
    if (!selectedSid || !elementPrompt.trim() || elementApplying) return;
    const sec = siteState.sections.find((s) => s.id === selectedSid);
    if (!sec) return;
    if (!tryGenerate()) return;
    setElementApplying(true);
    setTimeout(() => {
      const newHead = extractTitle(elementPrompt) ?? elementPrompt.trim().slice(0, 60);
      const prev = siteState.overrides[selectedSid] ?? {};
      pushVersion(`${SECTION_LIBRARY[sec.kind].label}: заголовок «${newHead}»`, {
        ...siteState,
        overrides: { ...siteState.overrides, [selectedSid]: { ...prev, headline: newHead } },
      });
      setElementPrompt("");
      setElementApplying(false);
    }, 700);
  };

  /* ---------- Image actions ---------- */

  const setSectionImage = (sectionId: string, src: string, label: string) => {
    const sec = siteState.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const prev = siteState.overrides[sectionId] ?? {};
    pushVersion(`${SECTION_LIBRARY[sec.kind].label}: ${label}`, {
      ...siteState,
      overrides: { ...siteState.overrides, [sectionId]: { ...prev, image: src } },
    });
  };

  const removeSectionImage = (sectionId: string) => {
    const sec = siteState.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const prev = siteState.overrides[sectionId] ?? {};
    if (!prev.image) return;
    if (!tryGenerate()) return;
    const { image, ...rest } = prev;
    void image;
    pushVersion(`${SECTION_LIBRARY[sec.kind].label}: удалил картинку`, {
      ...siteState,
      overrides: { ...siteState.overrides, [sectionId]: rest },
    });
  };

  const generateImageFor = (sectionId: string, prompt: string, onProgress: (p: number) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!tryGenerate()) { reject(new Error("no-credits")); return; }
      const startedAt = Date.now();
      const totalMs = 1300 + Math.random() * 700;
      const tick = window.setInterval(() => {
        onProgress(Math.min(95, Math.round(((Date.now() - startedAt) / totalMs) * 95)));
      }, 60);
      window.setTimeout(() => {
        window.clearInterval(tick);
        const src = makeMockImage(prompt);
        addMedia({
          kind: "photo",
          title: prompt.trim() || "Сгенерированная картинка",
          ratio: "16:9",
          gradient: pickGradient(hashStr(prompt)),
          src,
        });
        setSectionImage(sectionId, src, `картинка «${prompt.trim().slice(0, 40) || "без названия"}»`);
        onProgress(100);
        resolve();
      }, totalMs);
    });
  };

  const pickImageFromLibrary = (sectionId: string, item: MediaItem) => {
    const src = item.src ?? makeMockImage(item.title);
    setSectionImage(sectionId, src, `картинка из медиабанка «${item.title}»`);
  };

  /* ---------- Render helpers ---------- */

  const availableToAdd = SECTION_ORDER.filter(
    (k) => k !== "hero" && !siteState.sections.some((s) => s.kind === k)
  );
  const openInNewTab = () => { if (blobUrl) window.open(blobUrl, "_blank", "noopener"); };
  const selectedSection = selectedSid ? siteState.sections.find((s) => s.id === selectedSid) : null;
  const sectionVersions = versions.filter((v) => v.pageId === activePageId);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      {/* TOP BAR */}
      <header className="h-14 border-b border-border bg-surface-1/60 backdrop-blur flex items-center gap-2 px-3 lg:px-4 shrink-0">
        <Link to="/app/sites-studio" aria-label="Назад" className="w-9 h-9 rounded-lg hover:bg-card grid place-items-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-1 min-w-0">
          <input value={projectName} onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent text-[14px] font-semibold tracking-tight px-2 py-1 rounded-md hover:bg-card focus:bg-card focus:outline-none min-w-0 w-[110px] sm:w-[150px]" />
          <span className="text-muted-foreground/60">/</span>
          <PageSelector pages={pages} activeId={activePageId} onSelect={selectPage} onAdd={addPage} />
        </div>

        <div className="hidden md:flex items-center gap-0.5 ml-2 p-0.5 rounded-lg border border-border bg-card">
          {(["mobile", "tablet", "desktop"] as Device[]).map((d) => {
            const Icon = d === "mobile" ? Smartphone : d === "tablet" ? Tablet : Monitor;
            const active = device === d;
            return (
              <button key={d} type="button" onClick={() => setDevice(d)} aria-label={d}
                className={"w-8 h-7 rounded-md grid place-items-center transition-colors " + (active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-background/60")}>
                <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
              </button>
            );
          })}
        </div>

        <button type="button" onClick={() => setPickMode((p) => !p)}
          className={"hidden md:inline-flex h-8 px-2.5 rounded-lg text-[12px] font-medium items-center gap-1.5 border transition-colors " +
            (pickMode ? "border-accent/60 bg-accent/15 text-accent" : "border-border text-muted-foreground hover:text-foreground hover:bg-card")}>
          <MousePointerClick className="w-3.5 h-3.5" strokeWidth={2.2} />
          {pickMode ? "Выбор включён" : "Выбрать элемент"}
        </button>

        <button type="button" onClick={() => setRefreshKey((k) => k + 1)} aria-label="Обновить"
          className="hidden md:grid w-8 h-8 rounded-lg hover:bg-card place-items-center text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="w-4 h-4" strokeWidth={2.2} />
        </button>
        <button type="button" onClick={openInNewTab} disabled={!pageHasContent} aria-label="Открыть в новой вкладке"
          className="hidden md:grid w-8 h-8 rounded-lg hover:bg-card place-items-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <ExternalLink className="w-4 h-4" strokeWidth={2.2} />
        </button>

        <div className="hidden md:flex items-center ml-1 p-0.5 rounded-lg border border-border bg-card">
          {(["preview", "code"] as View[]).map((v) => {
            const Icon = v === "preview" ? Eye : Code2;
            const active = view === v;
            return (
              <button key={v} type="button" onClick={() => setView(v)}
                className={"h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors " + (active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
                {v === "preview" ? "Превью" : "Код"}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="hidden sm:inline-flex h-8 px-3 rounded-lg border border-border text-[12.5px] font-medium text-foreground hover:bg-card transition-colors items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" strokeWidth={2.2} />Поделиться
          </button>
          <button type="button" onClick={() => {
              try { localStorage.setItem("neeklo-project-name", projectName); } catch { /* noop */ }
              navigate({ to: "/app/publish" });
            }}
            className="h-8 px-3.5 rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-1.5 text-accent-foreground"
            style={{ background: "var(--gradient-warm)", boxShadow: "var(--shadow-warm)" }}>
            <Rocket className="w-3.5 h-3.5" strokeWidth={2.4} />Опубликовать
          </button>
        </div>
      </header>

      {/* MOBILE TABS: Chat | Preview (hidden md+) */}
      <div className="md:hidden border-b border-border bg-surface-1/40 px-3 py-2 flex items-center gap-2 shrink-0">
        <div className="flex-1 grid grid-cols-2 gap-1 p-0.5 rounded-xl border border-border bg-card">
          {([
            { id: "chat" as const, label: "Чат", Icon: MessageSquare },
            { id: "preview" as const, label: "Превью", Icon: Eye },
          ]).map((t) => {
            const active = mobileTab === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setMobileTab(t.id)}
                aria-pressed={active}
                className={"h-11 rounded-lg text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors " +
                  (active ? "bg-foreground text-background" : "text-muted-foreground")}>
                <t.Icon className="w-4 h-4" strokeWidth={2.2} />
                {t.label}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => {
            try { localStorage.setItem("neeklo-project-name", projectName); } catch { /* noop */ }
            navigate({ to: "/app/publish" });
          }}
          aria-label="Опубликовать"
          className="h-11 px-4 rounded-xl text-[13px] font-semibold inline-flex items-center gap-1.5 text-accent-foreground shrink-0"
          style={{ background: "var(--gradient-warm)", boxShadow: "var(--shadow-warm)" }}>
          <Rocket className="w-4 h-4" strokeWidth={2.4} />
          Публикация
        </button>
      </div>

      {/* SPLIT */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <aside className={
          (mobileTab === "chat" ? "flex" : "hidden") +
          " md:flex w-full md:w-[300px] md:min-w-[280px] md:max-w-[320px] lg:w-[34%] lg:max-w-[460px] lg:min-w-[340px] flex-1 md:flex-none md:border-r md:border-b-0 border-b border-border bg-surface-1/30 flex-col min-h-0"
        }>
          <div className="px-4 lg:px-5 pt-3 pb-2 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md grid place-items-center" style={{ background: "var(--gradient-warm-soft)" }}>
                <Sparkles className="w-3.5 h-3.5 text-accent" strokeWidth={2.4} />
              </span>
              <div className="text-[13px] font-semibold">Агент neeklo</div>
              <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={"w-1.5 h-1.5 rounded-full " + (status === "applying" ? "bg-accent animate-pulse" : status === "error" ? "bg-destructive" : "bg-emerald-400")} />
                {status === "applying" ? "применяет" : status === "error" ? "ошибка" : "онлайн"}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1 p-0.5 rounded-lg bg-card border border-border w-fit">
              {([
                { id: "chat", label: "Чат", Icon: MessageSquare, count: 0 },
                { id: "structure", label: "Структура", Icon: Layers, count: siteState.sections.length },
                { id: "history", label: "История", Icon: History, count: versions.length },
              ] as const).map((t) => {
                const active = panel === t.id;
                return (
                  <button key={t.id} type="button" onClick={() => setPanel(t.id)}
                    className={"h-6 px-2 rounded-md text-[11.5px] font-medium inline-flex items-center gap-1 transition-colors " +
                      (active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
                    <t.Icon className="w-3 h-3" strokeWidth={2.4} />
                    {t.label}
                    {t.count > 0 && (
                      <span className={"ml-0.5 text-[10px] " + (active ? "opacity-70" : "text-muted-foreground/70")}>{t.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {pages.length > 1 && (
              <div className="mt-2 text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                <FileText className="w-3 h-3" strokeWidth={2.4} />
                Редактируешь страницу <span className="text-foreground font-medium">«{activePage.label}»</span>
              </div>
            )}
          </div>

          {panel === "chat" && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 lg:px-5 py-4 space-y-3">
                {messages.length === 0 && status === "idle" ? (
                  <EmptyChat onPick={(t) => fillChip(t)} hints={startHints} />
                ) : (
                  messages.map((m) =>
                    m.role === "user" ? (
                      <UserMessage key={m.id} text={m.text} />
                    ) : (
                      <AgentMessage key={m.id} text={m.text} summary={m.summary}
                        active={m.versionId === activeVersionByPage[versions.find((v) => v.id === m.versionId)?.pageId ?? ""]}
                        onApply={() => goToVersion(m.versionId)}
                        onRevert={() => revertFromMessage(m.versionId)} />
                    )
                  )
                )}
                {status === "applying" && <ApplyingBubble progress={progress} />}
                {status === "error" && <ErrorBubble onRetry={retry} />}
              </div>

              <div className="border-t border-border bg-background/40 shrink-0">
                <div className="px-3 lg:px-4 pt-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
                  {quickChips.map((c) => (
                    <button key={c} type="button" onClick={() => fillChip(c)}
                      className="shrink-0 h-7 px-2.5 rounded-full bg-card border border-border text-[12px] text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors">
                      {c}
                    </button>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="p-3 lg:p-4 pt-1">
                  <div className="relative rounded-2xl border border-border bg-card focus-within:border-accent/60 transition-colors">
                    <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                      rows={2} placeholder={pageHasContent ? "Что поправить или добавить?" : "Опиши сайт или вставь ссылку"}
                      className="w-full resize-none bg-transparent px-3.5 pt-3 pb-10 text-[13.5px] leading-snug placeholder:text-muted-foreground/70 focus:outline-none" />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
                      <button type="button" aria-label="Голосовой ввод"
                        className="w-7 h-7 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors">
                        <Mic className="w-3.5 h-3.5" strokeWidth={2.2} />
                      </button>
                      <span className="text-[10.5px] text-muted-foreground/80">Enter, отправить</span>
                      <div className="ml-auto flex items-center gap-2">
                        <CreditCost />
                        <button type="submit" disabled={!input.trim() || status === "applying"} aria-label="Отправить"
                          className="w-8 h-8 grid place-items-center rounded-lg text-accent-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                          style={{ background: "var(--gradient-warm)", boxShadow: "var(--shadow-warm)" }}>
                          <Send className="w-3.5 h-3.5" strokeWidth={2.4} />
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </>
          )}

          {panel === "structure" && (
            <StructurePanel
              sections={siteState.sections}
              overrides={siteState.overrides}
              selectedSid={selectedSid}
              onSelect={(id) => setSelectedSid(id)}
              onToggle={toggleVisible}
              onRemove={removeSection}
              onReorder={reorder}
              onAdd={addSection}
              available={availableToAdd}
            />
          )}

          {panel === "history" && (
            <HistoryPanel versions={versions} pages={pages} activeByPage={activeVersionByPage} onGo={goToVersion} />
          )}
        </aside>

        {/* PREVIEW */}
        <section className={
          (mobileTab === "preview" ? "flex" : "hidden") +
          " md:flex flex-1 min-h-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.04),transparent_60%)] flex-col relative"
        }>
          <div className="flex-1 overflow-auto p-4 lg:p-8 grid place-items-start lg:place-items-center">
            <div className="relative w-full rounded-xl border border-border bg-card overflow-hidden transition-all"
              style={{ maxWidth: deviceWidth[device], aspectRatio: device === "mobile" ? "9 / 16" : device === "tablet" ? "4 / 5" : "16 / 10" }}>
              {view === "code" ? (
                <CodeView html={html} hasContent={pageHasContent} />
              ) : !pageHasContent ? (
                <EmptyPreview />
              ) : (
                <>
                  <iframe key={refreshKey} title="preview" srcDoc={html}
                    sandbox="allow-same-origin allow-scripts"
                    className="w-full h-full block bg-background" />
                  {previewLoading && <PreviewSkeleton />}
                  {pickMode && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-[11.5px] font-semibold shadow-lg pointer-events-none">
                      Клик по блоку → точечная правка
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {selectedSection && (
            <ElementEditPanel
              section={selectedSection}
              override={siteState.overrides[selectedSection.id] ?? {}}
              prompt={elementPrompt}
              onPrompt={setElementPrompt}
              onApplyText={applyElementEdit}
              applyingText={elementApplying}
              onGenerateImage={(p, onProg) => generateImageFor(selectedSection.id, p, onProg)}
              onPickFromLibrary={(item) => pickImageFromLibrary(selectedSection.id, item)}
              onRemoveImage={() => removeSectionImage(selectedSection.id)}
              onClose={() => setSelectedSid(null)}
              imageCapable={IMAGE_CAPABLE.includes(selectedSection.kind)}
            />
          )}

          <div className="hidden lg:flex items-center justify-between px-5 py-2 border-t border-border text-[11.5px] text-muted-foreground bg-surface-1/30">
            <span className="inline-flex items-center gap-1.5">
              {projectName} / {activePage.label}
              <Dot className="w-3 h-3 text-muted-foreground/60" />
              <span className="text-muted-foreground/80">v{sectionVersions.findIndex((v) => v.id === activeVersionId) + 1} / {sectionVersions.length}</span>
            </span>
            <span>{deviceWidth[device]} px</span>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- Structure panel ---------- */

function StructurePanel({
  sections, selectedSid, onSelect, onToggle, onRemove, onReorder, onAdd, available,
}: {
  sections: SectionItem[];
  overrides: Record<string, SectionOverride>;
  selectedSid: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onAdd: (kind: SectionKind) => void;
  available: SectionKind[];
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto px-4 lg:px-5 py-4 flex flex-col gap-3">
      <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground/80 px-1">Секции страницы</div>

      {sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-5 text-center text-[12.5px] text-muted-foreground">
          Пусто. Добавь первую секцию.
        </div>
      ) : (
        <div className="space-y-1.5">
          {sections.map((s) => {
            const lib = SECTION_LIBRARY[s.kind];
            const isHero = s.kind === "hero";
            const selected = s.id === selectedSid;
            const dragging = draggingId === s.id;
            const over = overId === s.id && draggingId && draggingId !== s.id;
            return (
              <div key={s.id} draggable
                onDragStart={() => setDraggingId(s.id)}
                onDragEnd={() => { setDraggingId(null); setOverId(null); }}
                onDragOver={(e) => { e.preventDefault(); setOverId(s.id); }}
                onDrop={(e) => { e.preventDefault(); if (draggingId) onReorder(draggingId, s.id); setOverId(null); }}
                onClick={() => onSelect(s.id)}
                className={"group flex items-center gap-2 rounded-lg border bg-card px-2.5 py-2 cursor-pointer transition-all " +
                  (selected ? "border-accent/60 bg-accent/5 " : "border-border hover:border-border/80 ") +
                  (dragging ? "opacity-40 " : "") + (over ? "border-accent/60 ring-1 ring-accent/40 " : "") +
                  (!s.visible ? "opacity-60 " : "")}>
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 cursor-grab active:cursor-grabbing" strokeWidth={2} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium text-foreground/95 truncate">{lib.label}</div>
                  <div className="text-[10.5px] text-muted-foreground/80 truncate">{s.kind}</div>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); onToggle(s.id); }} aria-label={s.visible ? "Скрыть" : "Показать"}
                  className="w-7 h-7 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors">
                  {s.visible ? <Eye className="w-3.5 h-3.5" strokeWidth={2.2} /> : <EyeOff className="w-3.5 h-3.5" strokeWidth={2.2} />}
                </button>
                {!isHero && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(s.id); }} aria-label="Удалить"
                    className="w-7 h-7 grid place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2 relative">
        <button type="button" onClick={() => setAddOpen((o) => !o)} disabled={available.length === 0}
          className="w-full h-9 rounded-lg border border-dashed border-border hover:border-accent/50 text-[12.5px] font-medium inline-flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
          {available.length === 0 ? "Все секции добавлены" : "Добавить секцию"}
        </button>
        {addOpen && available.length > 0 && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setAddOpen(false)} />
            <div className="absolute z-40 bottom-full left-0 right-0 mb-1.5 rounded-xl border border-border bg-popover shadow-xl p-1.5 space-y-0.5">
              <div className="px-2 pt-1 pb-1 text-[10.5px] uppercase tracking-wider text-muted-foreground/70">Набор</div>
              {available.map((k) => (
                <button key={k} type="button" onClick={() => { onAdd(k); setAddOpen(false); }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-[12.5px] text-foreground hover:bg-card flex items-center gap-2 transition-colors">
                  <Plus className="w-3 h-3 text-accent" strokeWidth={2.6} />
                  {SECTION_LIBRARY[k].label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-auto pt-2 text-[10.5px] text-muted-foreground/70 leading-snug">
        Перетаскивай ручкой слева. Каждое изменение записывается в Историю.
      </div>
    </div>
  );
}

/* ---------- Element edit panel (with image) ---------- */

type ElementMode = "edit" | "image-gen" | "image-pick";

function ElementEditPanel({
  section, override, prompt, onPrompt, onApplyText, applyingText,
  onGenerateImage, onPickFromLibrary, onRemoveImage, onClose, imageCapable,
}: {
  section: SectionItem;
  override: SectionOverride;
  prompt: string;
  onPrompt: (s: string) => void;
  onApplyText: () => void;
  applyingText: boolean;
  onGenerateImage: (prompt: string, onProgress: (p: number) => void) => Promise<void>;
  onPickFromLibrary: (item: MediaItem) => void;
  onRemoveImage: () => void;
  onClose: () => void;
  imageCapable: boolean;
}) {
  const lib = SECTION_LIBRARY[section.kind];
  const [mode, setMode] = useState<ElementMode>("edit");
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgProgress, setImgProgress] = useState(0);
  const [imgState, setImgState] = useState<"idle" | "generating" | "done">("idle");
  const [library, setLibrary] = useState<MediaItem[]>([]);

  useEffect(() => {
    if (mode === "image-pick") setLibrary(listMedia().filter((m) => m.kind === "photo"));
  }, [mode]);

  // Reset modal state when section changes
  useEffect(() => {
    setMode("edit");
    setImgPrompt("");
    setImgProgress(0);
    setImgState("idle");
  }, [section.id]);

  const runGen = async () => {
    const p = imgPrompt.trim();
    if (!p || imgState === "generating") return;
    setImgState("generating");
    setImgProgress(0);
    try {
      await onGenerateImage(p, setImgProgress);
      setImgState("done");
      setTimeout(() => { setImgState("idle"); setImgPrompt(""); setMode("edit"); }, 600);
    } catch {
      setImgState("idle");
    }
  };

  return (
    <div className="absolute bottom-4 right-4 left-4 lg:left-auto lg:w-[380px] rounded-2xl border border-border bg-popover shadow-2xl p-3.5 z-20">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-md grid place-items-center" style={{ background: "var(--gradient-warm-soft)" }}>
          {mode === "edit" ? <Pencil className="w-3 h-3 text-accent" strokeWidth={2.6} /> :
            mode === "image-gen" ? <Wand2 className="w-3 h-3 text-accent" strokeWidth={2.6} /> :
            <FolderOpen className="w-3 h-3 text-accent" strokeWidth={2.6} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold leading-tight truncate">
            {mode === "edit" ? "Изменить этот блок" : mode === "image-gen" ? "Сгенерировать картинку" : "Выбрать из медиабанка"}
          </div>
          <div className="text-[10.5px] text-muted-foreground truncate">
            {lib.label} {mode === "edit" && `· «${override.headline ?? lib.defaultHeadline}»`}
          </div>
        </div>
        {mode !== "edit" && (
          <button type="button" onClick={() => setMode("edit")} aria-label="Назад"
            className="w-6 h-6 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors">
            <ArrowLeftIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
        )}
        <button type="button" onClick={onClose} aria-label="Закрыть"
          className="w-6 h-6 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors">
          <X className="w-3.5 h-3.5" strokeWidth={2.2} />
        </button>
      </div>

      {mode === "edit" && (
        <>
          <div className="mt-2.5 rounded-xl border border-border bg-card focus-within:border-accent/60 transition-colors">
            <textarea
              value={prompt}
              onChange={(e) => onPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onApplyText(); } }}
              rows={2}
              placeholder='Например: "Поменяй заголовок на Кофе с доставкой"'
              className="w-full resize-none bg-transparent px-3 py-2.5 text-[12.5px] leading-snug placeholder:text-muted-foreground/70 focus:outline-none"
            />
            <div className="flex items-center gap-2 px-2 pb-2">
              <CreditCost />
              <button type="button" onClick={onApplyText} disabled={!prompt.trim() || applyingText}
                className="ml-auto h-7 px-3 rounded-lg text-[11.5px] font-semibold inline-flex items-center gap-1.5 text-accent-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--gradient-warm)", boxShadow: "var(--shadow-warm)" }}>
                {applyingText ? <RefreshCw className="w-3 h-3 animate-spin" strokeWidth={2.4} /> : <Check className="w-3 h-3" strokeWidth={2.6} />}
                {applyingText ? "Применяю" : "Применить"}
              </button>
            </div>
          </div>

          {imageCapable && (
            <div className="mt-3 pt-3 border-t border-border/60">
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground/80 mb-2 inline-flex items-center gap-1">
                <ImageIcon className="w-3 h-3" strokeWidth={2.4} />Картинка блока
              </div>
              {override.image ? (
                <div className="flex items-center gap-2">
                  <img src={override.image} alt="" className="w-16 h-12 object-cover rounded-md border border-border shrink-0" />
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <button type="button" onClick={() => setMode("image-gen")}
                      className="h-7 px-2.5 rounded-md border border-border text-[11.5px] font-medium inline-flex items-center gap-1 text-foreground hover:bg-card transition-colors">
                      <Wand2 className="w-3 h-3" strokeWidth={2.4} />Сгенерировать новую
                    </button>
                    <button type="button" onClick={() => setMode("image-pick")}
                      className="h-7 px-2.5 rounded-md border border-border text-[11.5px] font-medium inline-flex items-center gap-1 text-foreground hover:bg-card transition-colors">
                      <FolderOpen className="w-3 h-3" strokeWidth={2.4} />Из медиабанка
                    </button>
                  </div>
                  <button type="button" onClick={onRemoveImage} aria-label="Удалить картинку"
                    className="w-7 h-7 grid place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setMode("image-gen")}
                    className="flex-1 h-8 px-2 rounded-lg border border-border text-[11.5px] font-medium inline-flex items-center justify-center gap-1.5 text-foreground hover:border-accent/40 hover:bg-card transition-colors">
                    <Wand2 className="w-3.5 h-3.5 text-accent" strokeWidth={2.4} />Сгенерировать
                  </button>
                  <button type="button" onClick={() => setMode("image-pick")}
                    className="flex-1 h-8 px-2 rounded-lg border border-border text-[11.5px] font-medium inline-flex items-center justify-center gap-1.5 text-foreground hover:border-accent/40 hover:bg-card transition-colors">
                    <FolderOpen className="w-3.5 h-3.5 text-accent" strokeWidth={2.4} />Из медиабанка
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {mode === "image-gen" && (
        <div className="mt-2.5">
          <div className="rounded-xl border border-border bg-card focus-within:border-accent/60 transition-colors">
            <textarea
              value={imgPrompt}
              onChange={(e) => setImgPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runGen(); } }}
              rows={2}
              placeholder='Например: "уютная кофейня с тёплым светом"'
              disabled={imgState === "generating"}
              className="w-full resize-none bg-transparent px-3 py-2.5 text-[12.5px] leading-snug placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-60"
            />
            <div className="flex items-center gap-2 px-2 pb-2">
              <CreditCost />
              <button type="button" onClick={runGen}
                disabled={!imgPrompt.trim() || imgState === "generating"}
                className="ml-auto h-7 px-3 rounded-lg text-[11.5px] font-semibold inline-flex items-center gap-1.5 text-accent-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--gradient-warm)", boxShadow: "var(--shadow-warm)" }}>
                {imgState === "generating" ? <RefreshCw className="w-3 h-3 animate-spin" strokeWidth={2.4} /> :
                 imgState === "done" ? <Check className="w-3 h-3" strokeWidth={2.6} /> :
                 <Wand2 className="w-3 h-3" strokeWidth={2.4} />}
                {imgState === "generating" ? `${imgProgress}%` : imgState === "done" ? "Готово" : "Сгенерировать"}
              </button>
            </div>
          </div>
          {imgState === "generating" && (
            <div className="mt-2 h-1 rounded-full bg-card overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-150 ease-out"
                style={{ width: `${imgProgress}%`, background: "var(--gradient-warm)" }} />
            </div>
          )}
          <div className="mt-2 text-[10.5px] text-muted-foreground/70 leading-snug">
            Картинка появится в блоке и сохранится в медиабанк.
          </div>
        </div>
      )}

      {mode === "image-pick" && (
        <div className="mt-2.5">
          {library.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-[12px] text-muted-foreground">
              Медиабанк пуст. Сгенерируй первую картинку.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
              {library.slice(0, 30).map((m) => (
                <button key={m.id} type="button"
                  onClick={() => { onPickFromLibrary(m); setMode("edit"); }}
                  className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-border hover:border-accent/60 transition-colors">
                  {m.src ? (
                    <img src={m.src} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${m.gradient}`} />
                  )}
                  <div className="absolute inset-x-0 bottom-0 px-1.5 py-1 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="text-[10px] text-white/95 leading-tight truncate">{m.title}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- History ---------- */

function HistoryPanel({
  versions, pages, activeByPage, onGo,
}: {
  versions: Version[];
  pages: Page[];
  activeByPage: Record<string, string>;
  onGo: (id: string) => void;
}) {
  const sorted = [...versions].reverse();
  const pageLabel = (id: string) => pages.find((p) => p.id === id)?.label ?? ", ";
  return (
    <div className="flex-1 overflow-y-auto px-4 lg:px-5 py-4 space-y-2">
      <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground/80 px-1 pb-1">Версии</div>
      {sorted.map((v) => {
        const active = activeByPage[v.pageId] === v.id;
        return (
          <div key={v.id}
            className={"rounded-xl border px-3 py-2.5 transition-colors " + (active ? "border-accent/50 bg-accent/5" : "border-border bg-card hover:border-border/80")}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-background/60 text-muted-foreground inline-flex items-center gap-1">
                <FileText className="w-2.5 h-2.5" strokeWidth={2.4} />{pageLabel(v.pageId)}
              </span>
              <span className="text-[11px] text-muted-foreground">{formatTime(v.ts)}</span>
              {active && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-accent">
                  <Check className="w-3 h-3" strokeWidth={2.6} />активна
                </span>
              )}
            </div>
            <div className="mt-1.5 text-[13px] text-foreground/90 leading-snug">{v.label}</div>
            {!active && (
              <button type="button" onClick={() => onGo(v.id)}
                className="mt-2 h-7 px-2.5 rounded-md border border-border text-[11.5px] font-medium inline-flex items-center gap-1 text-foreground hover:bg-background/60 transition-colors">
                <Undo2 className="w-3 h-3" strokeWidth={2.4} />Откатить к этой версии
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Chat pieces ---------- */

function EmptyChat({ onPick, hints }: { onPick: (t: string) => void; hints: string[] }) {
  return (
    <div className="pt-2">
      <div className="rounded-xl border border-border bg-card px-3.5 py-3 text-[13px] leading-snug text-foreground/90">
        Привет. Опиши, какой сайт нужен, или вставь ссылку. Каждое изменение сохраняется в Историю.
      </div>
      <div className="mt-3 space-y-1.5">
        {hints.map((h) => (
          <button key={h} type="button" onClick={() => onPick(h)}
            className="w-full text-left px-3 py-2 rounded-lg border border-border bg-card/50 text-[12.5px] text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors">
            {h}
          </button>
        ))}
      </div>
    </div>
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%] rounded-2xl rounded-tr-md px-3.5 py-2.5 text-[13px] leading-snug text-accent-foreground" style={{ background: "var(--gradient-warm)" }}>
        {text}
      </div>
    </div>
  );
}

function AgentMessage({ text, summary, active, onApply, onRevert }: { text: string; summary: string; active: boolean; onApply: () => void; onRevert: () => void }) {
  return (
    <div className={"rounded-2xl rounded-tl-md border bg-card px-3.5 py-3 " + (active ? "border-accent/40" : "border-border")}>
      <div className="text-[13px] leading-snug text-foreground/90">{text}</div>
      <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/50 border border-border/60 text-[11.5px] text-muted-foreground">
        <Check className="w-3 h-3 text-accent" strokeWidth={2.6} />{summary}
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        <button type="button" onClick={onRevert}
          className="h-7 px-2.5 rounded-md border border-border text-[11.5px] font-medium inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors">
          <Undo2 className="w-3 h-3" strokeWidth={2.4} />Откатить
        </button>
        <button type="button" onClick={onApply} disabled={active}
          className={"h-7 px-2.5 rounded-md text-[11.5px] font-semibold inline-flex items-center gap-1 transition-colors " +
            (active ? "bg-accent/15 text-accent border border-accent/40 cursor-default" : "bg-foreground text-background hover:opacity-90")}>
          <Check className="w-3 h-3" strokeWidth={2.6} />{active ? "Применено" : "Применить"}
        </button>
      </div>
    </div>
  );
}

function ApplyingBubble({ progress }: { progress: number }) {
  return (
    <div className="rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-3">
      <div className="inline-flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <span className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "120ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "240ms" }} />
        </span>
        Применяю изменения
        <span className="ml-1 text-[11px] text-muted-foreground/80 tabular-nums">{progress}%</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-background/70 overflow-hidden">
        <div className="h-full rounded-full transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%`, background: "var(--gradient-warm)" }} />
      </div>
    </div>
  );
}

function ErrorBubble({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl rounded-tl-md border border-destructive/40 bg-destructive/10 px-3.5 py-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" strokeWidth={2.2} />
        <div className="text-[12.5px] leading-snug text-foreground/90">
          Не получилось применить изменения. Попробуй ещё раз.
        </div>
      </div>
      <button type="button" onClick={onRetry}
        className="mt-2 h-7 px-2.5 rounded-md border border-border text-[11.5px] font-medium inline-flex items-center gap-1 text-foreground hover:bg-background/60 transition-colors">
        <RotateCcw className="w-3 h-3" strokeWidth={2.4} />Повторить
      </button>
    </div>
  );
}

/* ---------- Page selector ---------- */

const PAGE_SUGGESTIONS = ["Услуги", "Контакты", "О нас", "Цены", "Блог"];

function PageSelector({
  pages, activeId, onSelect, onAdd,
}: {
  pages: Page[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: (label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const active = pages.find((p) => p.id === activeId);
  const usedLabels = new Set(pages.map((p) => p.label.toLowerCase()));
  const suggestions = PAGE_SUGGESTIONS.filter((s) => !usedLabels.has(s.toLowerCase()));

  const submit = (label: string) => {
    const v = label.trim();
    if (!v) return;
    onAdd(v);
    setDraft("");
    setAdding(false);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="h-8 px-2 rounded-md hover:bg-card text-[13px] inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
        <FileText className="w-3.5 h-3.5" strokeWidth={2.2} />
        {active?.label ?? ", "}
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setOpen(false); setAdding(false); }} />
          <div className="absolute z-40 mt-1 min-w-[220px] rounded-lg border border-border bg-popover shadow-xl p-1">
            {pages.map((p) => (
              <button key={p.id} onClick={() => { onSelect(p.id); setOpen(false); }}
                className={"w-full text-left px-2.5 py-1.5 rounded-md text-[13px] inline-flex items-center gap-2 transition-colors " +
                  (p.id === activeId ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-card")}>
                <FileText className="w-3 h-3 opacity-70" strokeWidth={2.2} />
                {p.label}
                {p.id === activeId && <Check className="w-3 h-3 ml-auto text-accent" strokeWidth={2.6} />}
              </button>
            ))}
            <div className="my-1 h-px bg-border" />
            {adding ? (
              <div className="p-1">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submit(draft); if (e.key === "Escape") setAdding(false); }}
                  placeholder="Имя страницы"
                  className="w-full bg-card border border-border rounded-md px-2 py-1.5 text-[12.5px] focus:outline-none focus:border-accent/60"
                />
                {suggestions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {suggestions.slice(0, 4).map((s) => (
                      <button key={s} type="button" onClick={() => submit(s)}
                        className="h-6 px-2 rounded-full bg-card border border-border text-[10.5px] text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <CreditCost />
                  <button type="button" onClick={() => submit(draft)} disabled={!draft.trim()}
                    className="ml-auto h-6 px-2.5 rounded-md text-[11px] font-semibold text-accent-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "var(--gradient-warm)" }}>
                    Создать
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setAdding(true)}
                className="w-full text-left px-2.5 py-1.5 rounded-md text-[12.5px] text-foreground hover:bg-card inline-flex items-center gap-2 transition-colors">
                <Plus className="w-3 h-3 text-accent" strokeWidth={2.6} />Добавить страницу
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="absolute inset-0 grid place-items-center text-center px-6">
      <div className="max-w-[280px]">
        <div className="w-12 h-12 mx-auto rounded-2xl grid place-items-center mb-4" style={{ background: "var(--gradient-warm-soft)" }}>
          <Sparkles className="w-5 h-5 text-accent" strokeWidth={2.2} />
        </div>
        <div className="text-[14px] font-semibold mb-1">Пустой проект</div>
        <p className="text-[12.5px] text-muted-foreground leading-snug">Опиши задачу слева или добавь секции.</p>
      </div>
    </div>
  );
}

function CodeView({ html, hasContent }: { html: string; hasContent: boolean }) {
  if (!hasContent) {
    return (
      <pre className="absolute inset-0 overflow-auto p-4 text-[12px] leading-relaxed font-mono text-muted-foreground bg-background/60 whitespace-pre-wrap">
        {`<!-- Пустой проект. Запусти агента или добавь секции. -->`}
      </pre>
    );
  }
  return (
    <pre className="absolute inset-0 overflow-auto p-4 text-[12px] leading-relaxed font-mono text-foreground/85 bg-[#0a0908] whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: highlightHtml(html) }} />
  );
}

function PreviewSkeleton() {
  return (
    <div className="absolute inset-0 bg-background/85 backdrop-blur-sm p-4 lg:p-6 flex flex-col gap-3 animate-pulse">
      <div className="h-6 w-32 rounded-md bg-muted/30" />
      <div className="h-3 w-3/4 rounded bg-muted/25" />
      <div className="h-3 w-2/3 rounded bg-muted/25" />
      <div className="h-9 w-36 rounded-lg bg-muted/30 mt-2" />
      <div className="mt-6 grid grid-cols-3 gap-2 flex-1">
        <div className="rounded-xl bg-muted/20" />
        <div className="rounded-xl bg-muted/25" />
        <div className="rounded-xl bg-muted/20" />
      </div>
    </div>
  );
}

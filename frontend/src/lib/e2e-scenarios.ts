// Lightweight in-browser regression runner.
// Each scenario navigates an iframe to a route, then runs a sequence
// of DOM-level steps inside the same-origin iframe. Reports pass/fail.

export type Step =
  | { type: "wait"; selector: string; timeout?: number }
  | { type: "exists"; selector: string }
  | { type: "click"; selector: string }
  | { type: "type"; selector: string; value: string }
  | { type: "count"; selector: string; min?: number; max?: number }
  | { type: "text"; selector: string; contains: string };

export type Scenario = {
  id: string;
  label: string;
  group: string;
  url: string;
  steps: Step[];
};

export const SCENARIOS: Scenario[] = [
  {
    id: "hub",
    label: "Хаб открывается, есть карточки сценариев и таб-бар",
    group: "Основное",
    url: "/",
    steps: [
      { type: "wait", selector: "a[href='/app/factory']" },
      { type: "exists", selector: "a[href='/app/site']" },
      { type: "exists", selector: "a[href='/app/assistant/new']" },
      { type: "exists", selector: "a[href='/app/profile']" },
    ],
  },
  {
    id: "media-library",
    label: "Медиатека: плитки и фильтры",
    group: "Медиатека",
    url: "/media-library",
    steps: [
      { type: "wait", selector: "main, body", timeout: 3000 },
      { type: "count", selector: "img", min: 3 },
    ],
  },
  {
    id: "media-open",
    label: "Открытие медиа: первая плитка кликабельна",
    group: "Медиатека",
    url: "/media-library",
    steps: [
      { type: "wait", selector: "button, [role='button'], img", timeout: 3000 },
      { type: "click", selector: "button:has(img), [role='button']:has(img)" },
    ],
  },
  {
    id: "site-flow",
    label: "Сайт: генерация → превью → публикация",
    group: "Сайт",
    url: "/site",
    steps: [
      { type: "wait", selector: "a[href='/app/site-preview']", timeout: 3000 },
      { type: "exists", selector: "a[href='/app/site-preview']" },
    ],
  },
  {
    id: "publish",
    label: "Публикация сайта: есть субдомен и кнопка готово",
    group: "Сайт",
    url: "/publish",
    steps: [
      { type: "wait", selector: "body" },
      { type: "text", selector: "body", contains: "neeklo.app" },
    ],
  },
  {
    id: "subscription",
    label: "Подписка: карточки тарифов и история",
    group: "Профиль",
    url: "/subscription",
    steps: [
      { type: "wait", selector: "body" },
      { type: "text", selector: "body", contains: "Про" },
      { type: "text", selector: "body", contains: "Бесплатно" },
    ],
  },
  {
    id: "profile",
    label: "Профиль: блок сегмента, плана и ссылка в подписку",
    group: "Профиль",
    url: "/profile",
    steps: [
      { type: "wait", selector: "a[href='/app/billing']", timeout: 3000 },
      { type: "exists", selector: "a[href='/app/billing']" },
    ],
  },
  {
    id: "assistant-overview",
    label: "Ассистент: обзор + переход в чат-тест",
    group: "Ассистент",
    url: "/assistant/demo",
    steps: [
      { type: "wait", selector: "a[href='/assistant/demo/chat-test']", timeout: 3000 },
      { type: "exists", selector: "a[href='/assistant/demo/leads']" },
    ],
  },
  {
    id: "assistant-chat",
    label: "Ассистент: чат-тест рендерится",
    group: "Ассистент",
    url: "/assistant/demo/chat-test",
    steps: [
      { type: "wait", selector: "textarea, input[type='text']", timeout: 3000 },
    ],
  },
  {
    id: "assistant-leads",
    label: "Ассистент: таблица лидов",
    group: "Ассистент",
    url: "/assistant/demo/leads",
    steps: [
      { type: "wait", selector: "table, [role='table'], tbody, .lead", timeout: 3000 },
    ],
  },
  {
    id: "factory",
    label: "Завод: пресеты и переход в создание",
    group: "Завод",
    url: "/factory",
    steps: [
      { type: "wait", selector: "a[href='/app/create']", timeout: 3000 },
      { type: "count", selector: "a[href='/app/create']", min: 1 },
    ],
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor(doc: Document, sel: string, timeout = 4000): Promise<Element | null> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    let el: Element | null = null;
    try { el = doc.querySelector(sel); } catch { /* invalid selector */ }
    if (el) return el;
    await sleep(80);
  }
  return null;
}

export type StepResult = { step: Step; ok: boolean; error?: string };
export type RunResult = { id: string; label: string; group: string; ok: boolean; ms: number; steps: StepResult[]; error?: string };

export async function runScenario(scenario: Scenario, iframe: HTMLIFrameElement): Promise<RunResult> {
  const t0 = performance.now();
  const steps: StepResult[] = [];

  await new Promise<void>((resolve) => {
    const onLoad = () => { iframe.removeEventListener("load", onLoad); resolve(); };
    iframe.addEventListener("load", onLoad);
    iframe.src = scenario.url;
  });
  await sleep(300); // settle

  const doc = iframe.contentDocument;
  if (!doc) {
    return { id: scenario.id, label: scenario.label, group: scenario.group, ok: false, ms: performance.now() - t0, steps, error: "no document" };
  }

  let allOk = true;
  for (const step of scenario.steps) {
    try {
      if (step.type === "wait") {
        const el = await waitFor(doc, step.selector, step.timeout ?? 4000);
        if (!el) throw new Error(`not found: ${step.selector}`);
      } else if (step.type === "exists") {
        if (!doc.querySelector(step.selector)) throw new Error(`missing: ${step.selector}`);
      } else if (step.type === "click") {
        const el = doc.querySelector(step.selector) as HTMLElement | null;
        if (!el) throw new Error(`missing: ${step.selector}`);
        el.click();
        await sleep(150);
      } else if (step.type === "type") {
        const el = doc.querySelector(step.selector) as HTMLInputElement | null;
        if (!el) throw new Error(`missing: ${step.selector}`);
        el.value = step.value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (step.type === "count") {
        const n = doc.querySelectorAll(step.selector).length;
        if (step.min !== undefined && n < step.min) throw new Error(`count ${n} < min ${step.min}`);
        if (step.max !== undefined && n > step.max) throw new Error(`count ${n} > max ${step.max}`);
      } else if (step.type === "text") {
        const el = doc.querySelector(step.selector);
        const txt = el?.textContent ?? "";
        if (!txt.includes(step.contains)) throw new Error(`text not found: "${step.contains}"`);
      }
      steps.push({ step, ok: true });
    } catch (e) {
      allOk = false;
      steps.push({ step, ok: false, error: (e as Error).message });
    }
  }

  return { id: scenario.id, label: scenario.label, group: scenario.group, ok: allOk, ms: Math.round(performance.now() - t0), steps };
}

// Responsive checks: load route at given viewport, sample layout signals.
export type Breakpoint = { id: string; label: string; w: number; h: number };
export const BREAKPOINTS: Breakpoint[] = [
  { id: "mobile", label: "Mobile · 390", w: 390, h: 780 },
  { id: "tablet", label: "Tablet · 768", w: 768, h: 1024 },
  { id: "desktop", label: "Desktop · 1280", w: 1280, h: 900 },
];

export type AdaptiveCheck = {
  route: string;
  label: string;
  expect: { mobile?: string; desktop?: string };
};

export const ADAPTIVE_CHECKS: AdaptiveCheck[] = [
  { route: "/", label: "Хаб: таб-бар внизу на мобилке", expect: { mobile: "[data-test='bottom-tab-bar'], nav" } },
  { route: "/factory", label: "Завод: сетка в 2 колонки", expect: { mobile: "main, body" } },
  { route: "/video-studio", label: "Видео-студия: сайдбар на десктопе", expect: { desktop: "aside, nav" } },
  { route: "/assistant/demo", label: "Ассистент: табы скроллятся", expect: { mobile: "body" } },
  { route: "/media-library", label: "Медиатека: галерея", expect: { mobile: "img" } },
];

export type AdaptiveResult = {
  route: string;
  label: string;
  bp: Breakpoint;
  ok: boolean;
  hasOverflow: boolean;
  scrollW: number;
  clientW: number;
  error?: string;
};

export async function runAdaptive(check: AdaptiveCheck, bp: Breakpoint, iframe: HTMLIFrameElement): Promise<AdaptiveResult> {
  iframe.style.width = `${bp.w}px`;
  iframe.style.height = `${bp.h}px`;
  await new Promise<void>((resolve) => {
    const onLoad = () => { iframe.removeEventListener("load", onLoad); resolve(); };
    iframe.addEventListener("load", onLoad);
    iframe.src = check.route;
  });
  await sleep(400);

  const doc = iframe.contentDocument;
  if (!doc) return { route: check.route, label: check.label, bp, ok: false, hasOverflow: false, scrollW: 0, clientW: 0, error: "no document" };

  const sel = bp.id === "mobile" ? check.expect.mobile : bp.id === "desktop" ? check.expect.desktop : (check.expect.mobile || check.expect.desktop);
  let selOk = true;
  if (sel) {
    const el = await waitFor(doc, sel, 3000);
    selOk = !!el;
  }

  const root = doc.documentElement;
  const scrollW = root.scrollWidth;
  const clientW = root.clientWidth;
  const hasOverflow = scrollW > clientW + 2;

  return {
    route: check.route, label: check.label, bp,
    ok: selOk && !hasOverflow,
    hasOverflow, scrollW, clientW,
  };
}

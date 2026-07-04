// Mock-data generator + localStorage-backed store for offline QA.
// Used by Admin → "Моки" tab and by feature screens that opt-in via useMock().

export type MockUser = { id: string; name: string; email: string; segment: string; plan: string };
export type MockLead = {
  id: string; name: string; contact: string; channel: string;
  priority: "high" | "mid" | "low"; message: string; date: string;
};
export type MockAssistant = { id: string; name: string; role: string; model: string; leads: number };
export type MockProject = { id: string; title: string; type: "video" | "site" | "assistant"; status: string; updated: string };
export type MockMedia = { id: string; kind: "video" | "photo" | "avatar"; title: string; duration?: string; cover: string };
export type MockPayment = { id: string; date: string; amount: number; status: "paid" | "pending" | "failed" };

export type MockBundle = {
  users: MockUser[];
  leads: MockLead[];
  assistants: MockAssistant[];
  projects: MockProject[];
  media: MockMedia[];
  payments: MockPayment[];
  seed: number;
  createdAt: string;
};

const STORAGE_KEY = "lovable-mock-bundle";

// deterministic PRNG so "seed=1" gives the same dataset every run
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = ["Анна Соколова", "Иван Петров", "Михаил Орлов", "Елена Кузьмина", "Дмитрий Лебедев", "Ольга Новак", "Артём Гончар", "Юлия Белова", "Сергей Громов", "Ксения Ким", "Павел Морозов", "Татьяна Лис"];
const SEGMENTS = ["Услуги", "Магазин", "Эксперт", "Агентство"];
const PLANS = ["Бесплатно", "Старт", "Про", "Студия"];
const CHANNELS = ["Avito", "Сайт", "Telegram", "Виджет", "API"];
const PRIORITIES: MockLead["priority"][] = ["high", "mid", "low"];
const MESSAGES = ["Сколько стоит?", "Когда сможете приехать?", "Есть в наличии?", "Можно скидку?", "Какие сроки?", "Работаете в выходные?"];
const ROLES = ["Менеджер продаж", "Поддержка", "Avito-специалист", "Coach"];
const MODELS = ["Haiku 4.5", "Sonnet 4.5", "GPT-5 mini"];
const PROJECT_TITLES = ["Reels iPhone", "Лендинг кофейни", "Бот Avito", "Распаковка кроссовок", "Сайт-визитка эксперта", "Карусель акции"];
const COVERS = [
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400",
  "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400",
  "https://images.unsplash.com/photo-1500673922987-e212871fec22?w=400",
  "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=400",
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400",
];

function pick<T>(rnd: () => number, arr: T[]): T { return arr[Math.floor(rnd() * arr.length)]; }

export function generateBundle(seed = 1, scale = 1): MockBundle {
  const rnd = mulberry32(seed);
  const usersN = Math.max(3, Math.round(6 * scale));
  const leadsN = Math.max(6, Math.round(24 * scale));
  const assistantsN = Math.max(2, Math.round(4 * scale));
  const projectsN = Math.max(4, Math.round(8 * scale));
  const mediaN = Math.max(6, Math.round(12 * scale));
  const payN = Math.max(3, Math.round(6 * scale));

  const users: MockUser[] = Array.from({ length: usersN }, (_, i) => ({
    id: `u_${i + 1}`,
    name: pick(rnd, NAMES),
    email: `user${i + 1}@neeklo.app`,
    segment: pick(rnd, SEGMENTS),
    plan: pick(rnd, PLANS),
  }));

  const leads: MockLead[] = Array.from({ length: leadsN }, (_, i) => {
    const d = new Date(Date.now() - Math.floor(rnd() * 14 * 86400000));
    return {
      id: `l_${i + 1}`,
      name: pick(rnd, NAMES),
      contact: `+7 9${Math.floor(rnd() * 90 + 10)} ${Math.floor(rnd() * 900 + 100)}-${Math.floor(rnd() * 90 + 10)}-${Math.floor(rnd() * 90 + 10)}`,
      channel: pick(rnd, CHANNELS),
      priority: pick(rnd, PRIORITIES),
      message: pick(rnd, MESSAGES),
      date: d.toISOString().slice(0, 10),
    };
  });

  const assistants: MockAssistant[] = Array.from({ length: assistantsN }, (_, i) => ({
    id: `a_${i + 1}`,
    name: `${pick(rnd, ROLES)} #${i + 1}`,
    role: pick(rnd, ROLES),
    model: pick(rnd, MODELS),
    leads: Math.floor(rnd() * 80),
  }));

  const projects: MockProject[] = Array.from({ length: projectsN }, (_, i) => ({
    id: `p_${i + 1}`,
    title: pick(rnd, PROJECT_TITLES),
    type: pick(rnd, ["video", "site", "assistant"] as const),
    status: pick(rnd, ["Готово", "В работе", "Черновик"]),
    updated: new Date(Date.now() - Math.floor(rnd() * 30 * 86400000)).toISOString().slice(0, 10),
  }));

  const media: MockMedia[] = Array.from({ length: mediaN }, (_, i) => {
    const kind = pick(rnd, ["video", "photo", "avatar"] as const);
    return {
      id: `m_${i + 1}`,
      kind,
      title: `${kind === "video" ? "Ролик" : kind === "avatar" ? "Аватар" : "Фото"} ${i + 1}`,
      duration: kind === "video" ? `0:${String(10 + Math.floor(rnd() * 50)).padStart(2, "0")}` : undefined,
      cover: COVERS[i % COVERS.length],
    };
  });

  const payments: MockPayment[] = Array.from({ length: payN }, (_, i) => ({
    id: `pay_${i + 1}`,
    date: new Date(Date.now() - i * 30 * 86400000).toISOString().slice(0, 10),
    amount: pick(rnd, [490, 990, 1990, 4990]),
    status: pick(rnd, ["paid", "paid", "paid", "pending", "failed"] as const),
  }));

  return { users, leads, assistants, projects, media, payments, seed, createdAt: new Date().toISOString() };
}

export function loadBundle(): MockBundle | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}

export function saveBundle(b: MockBundle | null) {
  if (typeof window === "undefined") return;
  if (b) localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
  else localStorage.removeItem(STORAGE_KEY);
  // notify same-tab listeners
  window.dispatchEvent(new CustomEvent("mock-bundle-changed"));
}

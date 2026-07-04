export type ThemeToken =
  | "background"
  | "card"
  | "muted"
  | "border"
  | "foreground"
  | "muted-foreground"
  | "accent"
  | "accent-soft";

export const TOKEN_LIST: { id: ThemeToken; label: string; cssVar: string; default: string }[] = [
  { id: "background", label: "Фон", cssVar: "--background", default: "#1c1d22" },
  { id: "card", label: "Поверхность", cssVar: "--card", default: "#26272d" },
  { id: "muted", label: "Приглушённый", cssVar: "--muted", default: "#2d2e34" },
  { id: "border", label: "Бордер", cssVar: "--border", default: "#3a3b42" },
  { id: "foreground", label: "Текст", cssVar: "--foreground", default: "#f3f3f5" },
  { id: "muted-foreground", label: "Текст-мьютед", cssVar: "--muted-foreground", default: "#9a9ba3" },
  { id: "accent", label: "Акцент", cssVar: "--accent", default: "#ef9a5a" },
  { id: "accent-soft", label: "Акцент-софт", cssVar: "--accent-soft", default: "#f0b070" },
];

const STORAGE_KEY = "lovable-theme-tokens";

export function loadStoredTokens(): Partial<Record<ThemeToken, string>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveStoredTokens(tokens: Partial<Record<ThemeToken, string>>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function applyTokens(tokens: Partial<Record<ThemeToken, string>>) {
  if (typeof document === "undefined") return;
  for (const t of TOKEN_LIST) {
    const v = tokens[t.id];
    if (v) document.documentElement.style.setProperty(t.cssVar, v);
    else document.documentElement.style.removeProperty(t.cssVar);
  }
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace("#", "");
  const n = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const num = parseInt(n, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

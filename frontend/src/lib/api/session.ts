/**
 * Сессия пользователя поверх studio API.
 *
 * Кэширует профиль в localStorage синхронно (нужно гвардам маршрутов),
 * а сетевые операции выполняет асинхронно через apiFetch.
 */
import { apiFetch, setToken } from "./client";

const USER_KEY = "neeklo.auth.user";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "superadmin";
  planId: string;
  credits?: number;
  provider?: "password" | "telegram";
  createdAt?: number | string;
  avatarUrl?: string | null;
  telegramId?: string | null;
};

type AuthResponse = {
  user: Omit<SessionUser, "provider" | "createdAt"> & {
    credits?: number;
    createdAt?: string;
    avatarUrl?: string | null;
  };
  accessToken: string;
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeSession(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getCachedUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

function cacheUser(user: SessionUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

function storeAuth(res: AuthResponse, provider: SessionUser["provider"]): SessionUser {
  setToken(res.accessToken);
  const user: SessionUser = {
    ...res.user,
    provider,
    createdAt: res.user.createdAt ?? Date.now(),
  };
  cacheUser(user);
  return user;
}

export async function login(input: { email: string; password: string }): Promise<SessionUser> {
  const res = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: input,
    auth: false,
    skipRefresh: true,
  });
  return storeAuth(res, "password");
}

export async function signup(input: {
  name: string;
  email: string;
  password: string;
}): Promise<SessionUser> {
  const res = await apiFetch<AuthResponse>("/auth/signup", {
    method: "POST",
    body: input,
    auth: false,
    skipRefresh: true,
  });
  return storeAuth(res, "password");
}

/** Завершить Telegram-вход: payload от Telegram Login Widget. */
export async function telegramLogin(payload: Record<string, unknown>): Promise<SessionUser> {
  const res = await apiFetch<AuthResponse>("/auth/telegram", {
    method: "POST",
    body: payload,
    auth: false,
    skipRefresh: true,
  });
  return storeAuth(res, "telegram");
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST", auth: false, skipRefresh: true });
  } catch {
    /* logout всегда локально завершаем */
  }
  setToken(null);
  cacheUser(null);
}

/** Подтянуть актуальный профиль с сервера и обновить кэш. */
export async function refreshMe(): Promise<SessionUser | null> {
  try {
    const me = await apiFetch<SessionUser>("/me");
    const prev = getCachedUser();
    const user: SessionUser = { ...prev, ...me } as SessionUser;
    cacheUser(user);
    return user;
  } catch {
    return null;
  }
}

export function patchCachedUser(patch: Partial<SessionUser>) {
  const prev = getCachedUser();
  if (!prev) return;
  cacheUser({ ...prev, ...patch });
}

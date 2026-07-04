/**
 * Тонкий HTTP-клиент к studio API (`/api`).
 *
 * - Хранит access-token в localStorage, refresh — в httpOnly cookie (через credentials).
 * - На 401 один раз пытается обновить токен через /auth/refresh и повторяет запрос.
 * - Работает только в браузере; на сервере (SSR) вызовы не должны происходить.
 */

const TOKEN_KEY = "neeklo.auth.token";

/** Базовый префикс. В браузере nginx проксирует /api на studio API. */
export const API_BASE = "/api";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Не подставлять Authorization (для login/signup/refresh). */
  auth?: boolean;
  /** Не пытаться обновлять токен на 401. */
  skipRefresh?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { accessToken?: string };
        const token = data.accessToken ?? null;
        setToken(token);
        return token;
      } catch {
        return null;
      } finally {
        // освобождаем единый in-flight refresh на следующий тик
        setTimeout(() => (refreshPromise = null), 0);
      }
    })();
  }
  return refreshPromise;
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, skipRefresh = false, headers, ...rest } = options;

  const buildHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {
      Accept: "application/json",
      ...(headers as Record<string, string> | undefined),
    };
    if (body !== undefined && !(body instanceof FormData)) {
      h["Content-Type"] = "application/json";
    }
    const token = getToken();
    if (auth && token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };

  const send = () =>
    fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: buildHeaders(),
      credentials: "include",
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });

  let res = await send();

  if (res.status === 401 && auth && !skipRefresh) {
    const token = await doRefresh();
    if (token) {
      res = await send();
    }
  }

  const data = await parse(res);
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : undefined) ?? `Request failed: ${res.status}`;
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

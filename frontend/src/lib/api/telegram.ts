/**
 * Telegram Login через официальный widget-popup, без замены кастомной кнопки UI.
 *
 * Требования на стороне бота (BotFather):
 *   /setdomain → studio.neeklo.ru
 * Иначе попап вернёт ошибку домена.
 */

import { apiFetch } from "./client";

const WIDGET_SRC = "https://telegram.org/js/telegram-widget.js?22";

/** bot_id — числовая часть токена (до двоеточия). */
const BOT_ID = "8901145958";

type TelegramAuthData = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    Telegram?: {
      Login?: {
        auth: (
          opts: { bot_id: string; request_access?: string },
          cb: (data: TelegramAuthData | false) => void,
        ) => void;
      };
    };
  }
}

let loader: Promise<void> | null = null;

function loadWidget(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Telegram?.Login) return Promise.resolve();
  if (!loader) {
    loader = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = WIDGET_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loader = null;
        reject(new Error("Не удалось загрузить Telegram widget"));
      };
      document.head.appendChild(script);
    });
  }
  return loader;
}

/** Открывает попап Telegram и резолвит данными авторизации. */
export async function requestTelegramAuth(): Promise<TelegramAuthData> {
  await loadWidget();
  return new Promise<TelegramAuthData>((resolve, reject) => {
    if (!window.Telegram?.Login) {
      reject(new Error("Telegram widget недоступен"));
      return;
    }
    window.Telegram.Login.auth({ bot_id: BOT_ID, request_access: "write" }, (data) => {
      if (!data) {
        reject(new Error("Вход через Telegram отменён"));
        return;
      }
      resolve(data);
    });
  });
}

/** Привязать Telegram к текущему аккаунту (быстрый вход). Открывает попап и шлёт данные на бэк. */
export async function linkTelegram(): Promise<{ telegramId: string | null }> {
  const data = await requestTelegramAuth();
  return apiFetch<{ telegramId: string | null }>("/auth/telegram/link", {
    method: "POST",
    body: data,
  });
}

/** Отвязать Telegram от текущего аккаунта. */
export async function unlinkTelegram(): Promise<void> {
  await apiFetch("/auth/telegram/unlink", { method: "POST" });
}

/**
 * Авторизация. Раньше здесь были localStorage-моки; теперь это тонкий адаптер
 * над реальным API (`src/lib/api/session.ts`). Имена экспортов сохранены, чтобы
 * не менять вызывающие экраны. Функции входа/регистрации стали async.
 */
import {
  getCachedUser,
  login as apiLogin,
  signup as apiSignup,
  telegramLogin as apiTelegramLogin,
  logout as apiLogout,
  type SessionUser,
} from "./api/session";

export type MockUser = SessionUser;

export async function mockSignup(input: {
  name: string;
  email: string;
  password: string;
}): Promise<MockUser> {
  return apiSignup(input);
}

export async function mockLogin(input: {
  email: string;
  password: string;
}): Promise<MockUser> {
  return apiLogin(input);
}

export async function mockTelegramSignup(
  payload: Record<string, unknown> = {},
): Promise<MockUser> {
  return apiTelegramLogin(payload);
}

/** Синхронное чтение кэшированного профиля (нужно гвардам маршрутов). */
export function getMockUser(): MockUser | null {
  return getCachedUser();
}

export function mockLogout() {
  void apiLogout();
}

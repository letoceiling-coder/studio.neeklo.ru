/** Репозиторий профиля и онбординга поверх studio API. */
import { apiFetch } from "./client";
import { patchCachedUser, type SessionUser } from "./session";

export async function saveOnboarding(data: unknown): Promise<void> {
  await apiFetch("/onboarding", { method: "POST", body: data });
}

export async function getOnboarding<T = unknown>(): Promise<T | null> {
  const res = await apiFetch<{ onboarding: T | null }>("/onboarding");
  return res.onboarding;
}

export async function updateProfile(patch: {
  name?: string;
  avatarUrl?: string | null;
}): Promise<SessionUser> {
  const user = await apiFetch<SessionUser>("/me", { method: "PATCH", body: patch });
  patchCachedUser(user);
  return user;
}
